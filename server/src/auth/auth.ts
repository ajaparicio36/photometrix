import {
  Body,
  CanActivate,
  Controller,
  ExecutionContext,
  Get,
  HttpCode,
  Injectable,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard, PassportStrategy } from '@nestjs/passport';
import { Strategy as LocalStrategyBase } from 'passport-local';
import { ExtractJwt, Strategy as JwtStrategyBase } from 'passport-jwt';
import { and, count, eq, gt, lt } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { DatabaseService } from '../database/database.service';
import { deviceRequests, modules, users } from '../database/schema';
import { configuration } from '../config';
import { fail } from '../http';
import { LoginDto } from '../domain/dto';
import { tokenHash, verifyPassword } from './password';

export interface UserIdentity {
  id: string;
  email: string;
}
export interface DeviceIdentity {
  deviceId: string;
  ownerId: string;
  tokenHash: string;
}
export type UserRequest = Request & { user: UserIdentity };
export type DeviceRequest = Request & { user: DeviceIdentity };

@Injectable()
export class AuthService {
  constructor(
    private readonly database: DatabaseService,
    private readonly jwt: JwtService,
  ) {}
  async validate(email: unknown, password: unknown): Promise<UserIdentity> {
    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      email.length > 254 ||
      password.length < 1 ||
      password.length > 256
    )
      fail(401, 'UNAUTHENTICATED', 'Invalid email or password');
    const [user] = await this.database.db
      .select()
      .from(users)
      .where(eq(users.email, email.trim().toLowerCase()));
    const valid = await verifyPassword(
      password,
      user?.passwordHash ??
        `scrypt$00000000000000000000000000000000$${'0'.repeat(128)}`,
    );
    if (!user || !valid)
      fail(401, 'UNAUTHENTICATED', 'Invalid email or password');
    return { id: user.id, email: user.email };
  }
  async login(
    user: UserIdentity,
  ): Promise<{ accessToken: string; expiresIn: number; user: UserIdentity }> {
    return {
      accessToken: await this.jwt.signAsync({ sub: user.id }),
      expiresIn: configuration().jwtExpiresInSeconds,
      user,
    };
  }
}
@Injectable()
export class LocalStrategy extends PassportStrategy(
  LocalStrategyBase,
  'local',
) {
  constructor(private readonly auth: AuthService) {
    super({ usernameField: 'email' });
  }
  async validate(email: unknown, password: unknown): Promise<UserIdentity> {
    return this.auth.validate(email, password);
  }
}
@Injectable()
export class JwtStrategy extends PassportStrategy(JwtStrategyBase, 'jwt') {
  constructor(private readonly database: DatabaseService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configuration().jwtSecret,
      algorithms: ['HS256'],
      ignoreExpiration: false,
    });
  }
  async validate(payload: unknown): Promise<UserIdentity> {
    if (
      !payload ||
      typeof payload !== 'object' ||
      !('sub' in payload) ||
      typeof payload.sub !== 'string'
    )
      fail(401, 'UNAUTHENTICATED', 'Authentication required');
    const [user] = await this.database.db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.id, payload.sub));
    if (!user) fail(401, 'UNAUTHENTICATED', 'Authentication required');
    return user;
  }
}
@Injectable()
export class UserGuard extends AuthGuard('jwt') {}
@Injectable()
export class LocalGuard extends AuthGuard('local') {}
@Injectable()
export class LoginRateGuard implements CanActivate {
  private readonly attempts = new Map<
    string,
    { since: number; count: number }
  >();
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const now = Date.now();
    for (const [key, value] of this.attempts)
      if (now - value.since >= 60000) this.attempts.delete(key);
    const key = request.ip ?? 'unknown';
    const value = this.attempts.get(key) ?? { since: now, count: 0 };
    if (value.count >= 10 || this.attempts.size >= 10000) {
      context
        .switchToHttp()
        .getResponse<Response>()
        .setHeader('Retry-After', '60');
      fail(429, 'RATE_LIMITED', 'Too many login attempts');
    }
    value.count++;
    this.attempts.set(key, value);
    return true;
  }
}
@Injectable()
export class DeviceGuard implements CanActivate {
  constructor(private readonly database: DatabaseService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<DeviceRequest>();
    const token = request.headers.authorization?.match(
      /^Bearer ([A-Za-z0-9_-]{43})$/,
    )?.[1];
    if (!token) fail(401, 'UNAUTHENTICATED', 'Device authentication required');
    const hash = tokenHash(token);
    const [device] = await this.database.db
      .select()
      .from(modules)
      .where(eq(modules.tokenHash, hash));
    if (!device || device.archivedAt)
      fail(401, 'UNAUTHENTICATED', 'Device authentication required');
    await this.database.db.transaction(async (tx) => {
      await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, device.ownerId))
        .for('update');
      const [current] = await tx
        .select()
        .from(modules)
        .where(eq(modules.deviceId, device.deviceId));
      if (!current || current.archivedAt || current.tokenHash !== hash)
        fail(401, 'UNAUTHENTICATED', 'Device authentication required');
      const cutoff = new Date(Date.now() - 60000);
      await tx
        .delete(deviceRequests)
        .where(
          and(
            eq(deviceRequests.deviceId, device.deviceId),
            lt(deviceRequests.receivedAt, cutoff),
          ),
        );
      const [usage] = await tx
        .select({ count: count() })
        .from(deviceRequests)
        .where(
          and(
            eq(deviceRequests.deviceId, device.deviceId),
            gt(deviceRequests.receivedAt, cutoff),
          ),
        );
      if (usage.count >= 60)
        fail(429, 'RATE_LIMITED', 'Too many device requests');
      await tx.insert(deviceRequests).values({
        id: randomUUID(),
        deviceId: device.deviceId,
        receivedAt: new Date(),
      });
    });
    request.user = {
      deviceId: device.deviceId,
      ownerId: device.ownerId,
      tokenHash: hash,
    };
    return true;
  }
}
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('login')
  @HttpCode(200)
  @UseGuards(LoginRateGuard, LocalGuard)
  async login(
    @Req() request: UserRequest,
    @Body() body: LoginDto,
  ): Promise<Awaited<ReturnType<AuthService['login']>>> {
    void body;
    return this.auth.login(request.user);
  }
  @Get('me')
  @UseGuards(UserGuard)
  me(@Req() request: UserRequest): UserIdentity {
    return request.user;
  }
}
