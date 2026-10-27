import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { configuration } from './config';
import { DatabaseService } from './database/database.service';
import {
  AuthController,
  AuthService,
  DeviceGuard,
  JwtStrategy,
  LocalGuard,
  LocalStrategy,
  LoginRateGuard,
  UserGuard,
} from './auth/auth';
import { DomainService } from './domain/domain.service';
import {
  DeviceController,
  ModuleController,
  RoomController,
  SessionController,
} from './domain/controllers';
import { ReportService } from './domain/report.service';
import { IdPipe } from './http';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: configuration().jwtSecret,
        signOptions: {
          expiresIn: configuration().jwtExpiresInSeconds,
          algorithm: 'HS256',
        },
      }),
    }),
  ],
  controllers: [
    AppController,
    AuthController,
    RoomController,
    ModuleController,
    SessionController,
    DeviceController,
  ],
  providers: [
    DatabaseService,
    AuthService,
    LocalStrategy,
    JwtStrategy,
    UserGuard,
    LocalGuard,
    LoginRateGuard,
    DeviceGuard,
    DomainService,
    ReportService,
    IdPipe,
  ],
})
export class AppModule {}
