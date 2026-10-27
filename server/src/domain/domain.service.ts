import { Injectable } from '@nestjs/common';
import {
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import type { Transaction } from '../database/database.service';
import { modules, rooms, samples, sessions, users } from '../database/schema';
import type { DeviceIdentity } from '../auth/auth';
import { tokenHash } from '../auth/password';
import { configuration } from '../config';
import { fail } from '../http';
import {
  assess,
  mean,
  recommendations,
  summarize,
  targets,
} from './measurement';
import type {
  EditRoomDto,
  NameDto,
  PageDto,
  ResourceQueryDto,
  RoomDto,
  SampleQueryDto,
  SessionDto,
  SessionQueryDto,
  UploadDto,
} from './dto';

type Connection = Transaction | DatabaseService['db'];
type Room = typeof rooms.$inferSelect;
type Device = typeof modules.$inferSelect;
type Session = typeof sessions.$inferSelect;
type Sample = typeof samples.$inferSelect;
interface Cursor {
  time: string;
  id: string;
  filter: string;
}
const publicRoom = (row: Room) => ({
  id: row.id,
  name: row.name,
  category: row.category,
  targetLux: row.targetLux,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  archivedAt: row.archivedAt,
});
const publicModule = (row: Device) => ({
  deviceId: row.deviceId,
  name: row.name,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  archivedAt: row.archivedAt,
  lastReceivedAt: row.lastReceivedAt,
});
const publicSession = (row: Session) => ({
  id: row.id,
  roomId: row.roomId,
  moduleId: row.moduleId,
  status: row.status,
  startedAt: row.startedAt,
  stoppedAt: row.stoppedAt,
  roomSnapshot: row.roomSnapshot,
  moduleSnapshot: row.moduleSnapshot,
  placementNotes: row.placementNotes,
  summary: row.summary,
});
const publicSample = (row: Sample) => ({
  id: row.id,
  sampleId: row.sampleId,
  sessionId: row.sessionId,
  deviceId: row.deviceId,
  sampledAt: row.sampledAt,
  receivedAt: row.receivedAt,
  uptimeMs: row.uptimeMs,
  sensor1Lux: row.sensor1Lux,
  sensor2Lux: row.sensor2Lux,
  sensor3Lux: row.sensor3Lux,
  quality: row.quality,
  averageLux: row.averageLux,
  assessment: row.assessment,
});

@Injectable()
export class DomainService {
  constructor(private readonly database: DatabaseService) {}
  private async owned<T>(
    owner: string,
    action: (tx: Transaction) => Promise<T>,
  ): Promise<T> {
    return this.database.db.transaction(async (tx) => {
      if (
        !(
          await tx
            .select({ id: users.id })
            .from(users)
            .where(eq(users.id, owner))
            .for('update')
        ).length
      )
        fail(401, 'UNAUTHENTICATED', 'Authentication required');
      return action(tx);
    });
  }
  private signature(value: string): string {
    return createHmac('sha256', configuration().jwtSecret)
      .update(value)
      .digest('base64url');
  }
  private boundary(query: PageDto, filter: string): Cursor | null {
    if (!query.cursor) return null;
    try {
      const [encoded, signature, extra] = query.cursor.split('.');
      const expected = this.signature(encoded);
      if (
        extra ||
        !signature ||
        signature.length !== expected.length ||
        !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
      )
        throw new Error();
      const value: unknown = JSON.parse(
        Buffer.from(encoded, 'base64url').toString('utf8'),
      );
      if (
        !value ||
        typeof value !== 'object' ||
        !('time' in value) ||
        typeof value.time !== 'string' ||
        !Number.isFinite(Date.parse(value.time)) ||
        !('id' in value) ||
        typeof value.id !== 'string' ||
        !/^[A-Za-z0-9_-]{1,128}$/.test(value.id) ||
        !('filter' in value) ||
        value.filter !== filter
      )
        throw new Error();
      return { time: value.time, id: value.id, filter };
    } catch {
      fail(400, 'VALIDATION_ERROR', 'Invalid pagination cursor');
    }
  }
  private page<T>(
    rows: T[],
    limit: number,
    filter: string,
    key: (row: T) => { time: Date; id: string },
  ): { items: T[]; nextCursor: string | null } {
    const items = rows.slice(0, limit);
    const last = items.at(-1);
    if (rows.length <= limit || !last) return { items, nextCursor: null };
    const point = key(last);
    const encoded = Buffer.from(
      JSON.stringify({ time: point.time.toISOString(), id: point.id, filter }),
    ).toString('base64url');
    return { items, nextCursor: `${encoded}.${this.signature(encoded)}` };
  }
  private async room(
    owner: string,
    id: string,
    db: Connection = this.database.db,
  ): Promise<Room> {
    const [row] = await db
      .select()
      .from(rooms)
      .where(and(eq(rooms.id, id), eq(rooms.ownerId, owner)));
    if (!row) fail(404, 'NOT_FOUND', 'Room not found');
    return row;
  }
  private async module(
    owner: string,
    id: string,
    db: Connection = this.database.db,
  ): Promise<Device> {
    const [row] = await db
      .select()
      .from(modules)
      .where(and(eq(modules.deviceId, id), eq(modules.ownerId, owner)));
    if (!row) fail(404, 'NOT_FOUND', 'Module not found');
    return row;
  }
  private async session(
    owner: string,
    id: string,
    db: Connection = this.database.db,
  ): Promise<Session> {
    const [row] = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.id, id), eq(sessions.ownerId, owner)));
    if (!row) fail(404, 'NOT_FOUND', 'Session not found');
    return row;
  }
  private async inactive(tx: Transaction, condition: SQL): Promise<void> {
    if (
      (
        await tx
          .select({ id: sessions.id })
          .from(sessions)
          .where(and(condition, eq(sessions.status, 'active')))
      ).length
    )
      fail(409, 'RESOURCE_ACTIVE', 'Stop the active session first');
  }
  async createRoom(
    owner: string,
    input: RoomDto,
  ): Promise<ReturnType<typeof publicRoom>> {
    return this.owned(owner, async (tx) => {
      const [row] = await tx
        .insert(rooms)
        .values({
          id: randomUUID(),
          ownerId: owner,
          name: input.name,
          category: input.category,
          targetLux: targets[input.category],
        })
        .returning();
      return publicRoom(row);
    });
  }
  async listRooms(
    owner: string,
    query: ResourceQueryDto,
  ): Promise<{
    items: ReturnType<typeof publicRoom>[];
    nextCursor: string | null;
  }> {
    const filter = JSON.stringify([
      'rooms',
      owner,
      query.includeArchived ?? false,
    ]);
    const cursor = this.boundary(query, filter);
    const limit = query.limit ?? 20;
    const rows = await this.database.db
      .select()
      .from(rooms)
      .where(
        and(
          eq(rooms.ownerId, owner),
          query.includeArchived ? undefined : isNull(rooms.archivedAt),
          cursor
            ? sql`(${rooms.createdAt},${rooms.id}) < (${new Date(cursor.time)},${cursor.id})`
            : undefined,
        ),
      )
      .orderBy(desc(rooms.createdAt), desc(rooms.id))
      .limit(limit + 1);
    const page = this.page(rows, limit, filter, (row) => ({
      time: row.createdAt,
      id: row.id,
    }));
    return { ...page, items: page.items.map(publicRoom) };
  }
  async getRoom(
    owner: string,
    id: string,
  ): Promise<ReturnType<typeof publicRoom>> {
    return publicRoom(await this.room(owner, id));
  }
  async changeRoom(
    owner: string,
    id: string,
    input: EditRoomDto | null,
  ): Promise<ReturnType<typeof publicRoom>> {
    return this.owned(owner, async (tx) => {
      const existing = await this.room(owner, id, tx);
      await this.inactive(tx, eq(sessions.roomId, id));
      if (input && existing.archivedAt)
        fail(409, 'RESOURCE_ARCHIVED', 'Room is archived');
      if (
        input &&
        ((input.name === undefined && input.category === undefined) ||
          input.name === null ||
          input.category === null)
      )
        fail(400, 'VALIDATION_ERROR', 'Provide room name or category');
      if (!input && existing.archivedAt) return publicRoom(existing);
      const [row] = await tx
        .update(rooms)
        .set(
          input
            ? {
                ...input,
                targetLux: input.category
                  ? targets[input.category]
                  : existing.targetLux,
                updatedAt: new Date(),
              }
            : { archivedAt: new Date(), updatedAt: new Date() },
        )
        .where(eq(rooms.id, id))
        .returning();
      return publicRoom(row);
    });
  }
  async createModule(
    owner: string,
    input: NameDto,
  ): Promise<{ module: ReturnType<typeof publicModule>; deviceToken: string }> {
    return this.owned(owner, async (tx) => {
      const deviceToken = randomBytes(32).toString('base64url');
      const [row] = await tx
        .insert(modules)
        .values({
          deviceId: randomUUID(),
          ownerId: owner,
          name: input.name,
          tokenHash: tokenHash(deviceToken),
        })
        .returning();
      return { module: publicModule(row), deviceToken };
    });
  }
  async listModules(
    owner: string,
    query: ResourceQueryDto,
  ): Promise<{
    items: ReturnType<typeof publicModule>[];
    nextCursor: string | null;
  }> {
    const filter = JSON.stringify([
      'modules',
      owner,
      query.includeArchived ?? false,
    ]);
    const cursor = this.boundary(query, filter);
    const limit = query.limit ?? 20;
    const rows = await this.database.db
      .select()
      .from(modules)
      .where(
        and(
          eq(modules.ownerId, owner),
          query.includeArchived ? undefined : isNull(modules.archivedAt),
          cursor
            ? sql`(${modules.createdAt},${modules.deviceId}) < (${new Date(cursor.time)},${cursor.id})`
            : undefined,
        ),
      )
      .orderBy(desc(modules.createdAt), desc(modules.deviceId))
      .limit(limit + 1);
    const page = this.page(rows, limit, filter, (row) => ({
      time: row.createdAt,
      id: row.deviceId,
    }));
    return { ...page, items: page.items.map(publicModule) };
  }
  async getModule(
    owner: string,
    id: string,
  ): Promise<ReturnType<typeof publicModule>> {
    return publicModule(await this.module(owner, id));
  }
  async changeModule(
    owner: string,
    id: string,
    input: NameDto | 'archive' | 'rotate',
  ): Promise<{
    module: ReturnType<typeof publicModule>;
    deviceToken?: string;
  }> {
    return this.owned(owner, async (tx) => {
      const existing = await this.module(owner, id, tx);
      await this.inactive(tx, eq(sessions.moduleId, id));
      if (existing.archivedAt) {
        if (input === 'archive') return { module: publicModule(existing) };
        fail(409, 'RESOURCE_ARCHIVED', 'Module is archived');
      }
      const deviceToken =
        input === 'rotate' ? randomBytes(32).toString('base64url') : undefined;
      const fields =
        input === 'archive'
          ? { archivedAt: new Date(), tokenHash: null }
          : input === 'rotate'
            ? { tokenHash: tokenHash(deviceToken ?? '') }
            : { name: input.name };
      const [row] = await tx
        .update(modules)
        .set({ ...fields, updatedAt: new Date() })
        .where(eq(modules.deviceId, id))
        .returning();
      return deviceToken
        ? { module: publicModule(row), deviceToken }
        : { module: publicModule(row) };
    });
  }
  async start(
    owner: string,
    input: SessionDto,
    key: string | undefined,
  ): Promise<{ session: ReturnType<typeof publicSession>; created: boolean }> {
    if (!key || !/^[A-Za-z0-9_-]{1,128}$/.test(key))
      fail(400, 'VALIDATION_ERROR', 'A valid Idempotency-Key is required');
    const placementNotes = input.placementNotes || null;
    const startInputs = JSON.stringify({
      roomId: input.roomId,
      moduleId: input.moduleId,
      placementNotes,
    });
    return this.owned(owner, async (tx) => {
      const [existing] = await tx
        .select()
        .from(sessions)
        .where(
          and(eq(sessions.ownerId, owner), eq(sessions.idempotencyKey, key)),
        );
      if (existing) {
        if (existing.startInputs !== startInputs)
          fail(
            409,
            'IDEMPOTENCY_CONFLICT',
            'Start key was already used with different inputs',
          );
        return { session: publicSession(existing), created: false };
      }
      const room = await this.room(owner, input.roomId, tx);
      const module = await this.module(owner, input.moduleId, tx);
      if (room.archivedAt || module.archivedAt)
        fail(409, 'RESOURCE_ARCHIVED', 'Room or module is archived');
      await this.inactive(tx, eq(sessions.roomId, room.id));
      await this.inactive(tx, eq(sessions.moduleId, module.deviceId));
      const [row] = await tx
        .insert(sessions)
        .values({
          id: randomUUID(),
          ownerId: owner,
          roomId: room.id,
          moduleId: module.deviceId,
          idempotencyKey: key,
          startInputs,
          placementNotes,
          roomSnapshot: {
            id: room.id,
            name: room.name,
            category: room.category,
            targetLux: room.targetLux,
          },
          moduleSnapshot: { deviceId: module.deviceId, name: module.name },
        })
        .returning();
      return { session: publicSession(row), created: true };
    });
  }
  async listSessions(
    owner: string,
    query: SessionQueryDto,
  ): Promise<{
    items: ReturnType<typeof publicSession>[];
    nextCursor: string | null;
  }> {
    if (query.roomId) await this.room(owner, query.roomId);
    if (query.moduleId) await this.module(owner, query.moduleId);
    const filter = JSON.stringify([
      'sessions',
      owner,
      query.roomId ?? null,
      query.moduleId ?? null,
      query.status ?? null,
    ]);
    const cursor = this.boundary(query, filter);
    const limit = query.limit ?? 20;
    const rows = await this.database.db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.ownerId, owner),
          query.roomId ? eq(sessions.roomId, query.roomId) : undefined,
          query.moduleId ? eq(sessions.moduleId, query.moduleId) : undefined,
          query.status ? eq(sessions.status, query.status) : undefined,
          cursor
            ? sql`(${sessions.startedAt},${sessions.id}) < (${new Date(cursor.time)},${cursor.id})`
            : undefined,
        ),
      )
      .orderBy(desc(sessions.startedAt), desc(sessions.id))
      .limit(limit + 1);
    const page = this.page(rows, limit, filter, (row) => ({
      time: row.startedAt,
      id: row.id,
    }));
    return { ...page, items: page.items.map(publicSession) };
  }
  async getSession(
    owner: string,
    id: string,
  ): Promise<ReturnType<typeof publicSession>> {
    return publicSession(await this.session(owner, id));
  }
  async history(
    owner: string,
    id: string,
    query: SampleQueryDto,
  ): Promise<{
    items: ReturnType<typeof publicSample>[];
    nextCursor: string | null;
  }> {
    await this.session(owner, id);
    const filter = JSON.stringify([
      'samples',
      owner,
      id,
      query.quality ?? null,
    ]);
    const cursor = this.boundary(query, filter);
    const limit = query.limit ?? 100;
    const rows = await this.database.db
      .select()
      .from(samples)
      .where(
        and(
          eq(samples.sessionId, id),
          query.quality ? eq(samples.quality, query.quality) : undefined,
          cursor
            ? sql`(${samples.receivedAt},${samples.id}) > (${new Date(cursor.time)},${cursor.id})`
            : undefined,
        ),
      )
      .orderBy(asc(samples.receivedAt), asc(samples.id))
      .limit(limit + 1);
    const page = this.page(rows, limit, filter, (row) => ({
      time: row.receivedAt,
      id: row.id,
    }));
    return { ...page, items: page.items.map(publicSample) };
  }
  async latest(
    owner: string,
    id: string,
  ): Promise<{
    sample: ReturnType<typeof publicSample> | null;
    evaluatedAt: Date;
    live: {
      state: string;
      averageLux: number | null;
      assessment: ReturnType<typeof assess> | null;
      recommendations: string[];
    };
  }> {
    const session = await this.session(owner, id);
    const [sample] = await this.database.db
      .select()
      .from(samples)
      .where(eq(samples.sessionId, id))
      .orderBy(desc(samples.receivedAt), desc(samples.id))
      .limit(1);
    const now = new Date();
    const state =
      session.status === 'completed'
        ? 'completed'
        : !sample
          ? 'waiting'
          : now.getTime() - sample.receivedAt.getTime() > 30000 ||
              now.getTime() - sample.sampledAt.getTime() > 30000
            ? 'stale'
            : sample.quality === 'incomplete'
              ? 'incomplete'
              : 'fresh';
    return {
      sample: sample ? publicSample(sample) : null,
      evaluatedAt: now,
      live: {
        state,
        averageLux: state === 'fresh' ? sample.averageLux : null,
        assessment: state === 'fresh' ? sample.assessment : null,
        recommendations:
          state === 'completed'
            ? []
            : state === 'stale'
              ? ['Check connectivity and collect a recent sample.']
              : recommendations(state === 'fresh' ? sample.assessment : null),
      },
    };
  }
  async stop(
    owner: string,
    id: string,
  ): Promise<ReturnType<typeof publicSession>> {
    return this.owned(owner, async (tx) => {
      const session = await this.session(owner, id, tx);
      if (session.status === 'completed') return publicSession(session);
      const data = await tx
        .select({
          averageLux: samples.averageLux,
          sampledAt: samples.sampledAt,
        })
        .from(samples)
        .where(eq(samples.sessionId, id));
      const [row] = await tx
        .update(sessions)
        .set({
          status: 'completed',
          stoppedAt: new Date(),
          summary: summarize(data, session.roomSnapshot.targetLux),
        })
        .where(eq(sessions.id, id))
        .returning();
      return publicSession(row);
    });
  }
  private async deviceTransaction<T>(
    identity: DeviceIdentity,
    action: (tx: Transaction, device: Device) => Promise<T>,
  ): Promise<T> {
    // Recheck credentials under the same owner lock used by rotation/archive and uploads.
    return this.owned(identity.ownerId, async (tx) => {
      const device = await this.module(identity.ownerId, identity.deviceId, tx);
      if (device.archivedAt || device.tokenHash !== identity.tokenHash)
        fail(401, 'UNAUTHENTICATED', 'Device authentication required');
      return action(tx, device);
    });
  }
  async activeSession(
    identity: DeviceIdentity,
  ): Promise<{ sessionId: string | null }> {
    return this.deviceTransaction(identity, async (tx, device) => {
      const [session] = await tx
        .select({ id: sessions.id })
        .from(sessions)
        .where(
          and(
            eq(sessions.moduleId, device.deviceId),
            eq(sessions.ownerId, device.ownerId),
            eq(sessions.status, 'active'),
          ),
        );
      return { sessionId: session?.id ?? null };
    });
  }
  async upload(
    identity: DeviceIdentity,
    input: UploadDto,
  ): Promise<{
    created: boolean;
    result: {
      sampleId: string;
      receivedAt: Date;
      averageLux: number | null;
      assessment: ReturnType<typeof assess> | null;
    };
  }> {
    return this.deviceTransaction(identity, async (tx, device) => {
      if (input.deviceId !== device.deviceId)
        fail(403, 'DEVICE_SESSION_MISMATCH', 'Device/session mismatch');
      const payload = JSON.stringify({
        deviceId: input.deviceId,
        sessionId: input.sessionId,
        sampleId: input.sampleId,
        uptimeMs: input.uptimeMs,
        sampledAt: new Date(input.sampledAt).toISOString(),
        sensor1Lux: input.sensor1Lux,
        sensor2Lux: input.sensor2Lux,
        sensor3Lux: input.sensor3Lux,
      });
      const [existing] = await tx
        .select()
        .from(samples)
        .where(
          and(
            eq(samples.deviceId, device.deviceId),
            eq(samples.sampleId, input.sampleId),
          ),
        );
      if (existing) {
        if (existing.payload !== payload)
          fail(
            409,
            'IDEMPOTENCY_CONFLICT',
            'Sample identity was already used with different data',
          );
        return {
          created: false,
          result: {
            sampleId: existing.sampleId,
            receivedAt: existing.receivedAt,
            averageLux: existing.averageLux,
            assessment: existing.assessment,
          },
        };
      }
      const [session] = await tx
        .select()
        .from(sessions)
        .where(
          and(
            eq(sessions.id, input.sessionId),
            eq(sessions.ownerId, device.ownerId),
            eq(sessions.moduleId, device.deviceId),
          ),
        );
      if (!session)
        fail(403, 'DEVICE_SESSION_MISMATCH', 'Device/session mismatch');
      if (session.status !== 'active')
        fail(409, 'SESSION_CLOSED', 'Session is closed');
      const now = new Date();
      const sampledAt = new Date(input.sampledAt);
      const age = now.getTime() - sampledAt.getTime();
      if (
        age > 30000 ||
        age < -5000 ||
        sampledAt.getTime() < session.startedAt.getTime() - 5000
      )
        fail(
          400,
          'SAMPLE_TIME_INVALID',
          'Sample acquisition time is outside the accepted window',
        );
      const average = mean(input);
      const assessment =
        average === null
          ? null
          : assess(average, session.roomSnapshot.targetLux);
      const [row] = await tx
        .insert(samples)
        .values({
          id: randomUUID(),
          sampleId: input.sampleId,
          sessionId: session.id,
          deviceId: device.deviceId,
          sampledAt,
          receivedAt: now,
          uptimeMs: input.uptimeMs,
          sensor1Lux: input.sensor1Lux,
          sensor2Lux: input.sensor2Lux,
          sensor3Lux: input.sensor3Lux,
          averageLux: average,
          assessment,
          quality: average === null ? 'incomplete' : 'complete',
          payload,
        })
        .returning();
      await tx
        .update(modules)
        .set({ lastReceivedAt: now })
        .where(eq(modules.deviceId, device.deviceId));
      return {
        created: true,
        result: {
          sampleId: row.sampleId,
          receivedAt: row.receivedAt,
          averageLux: row.averageLux,
          assessment: row.assessment,
        },
      };
    });
  }
}
