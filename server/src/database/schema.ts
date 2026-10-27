import { sql } from 'drizzle-orm';
import {
  check,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { categories } from '../domain/measurement';
import type { Category, Summary } from '../domain/measurement';

const time = (name: string) =>
  timestamp(name, { withTimezone: true, mode: 'date', precision: 3 });
export const categoryEnum = pgEnum('room_category', categories);
export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    createdAt: time('created_at').notNull().defaultNow(),
  },
  (table) => [
    check(
      'email_normalized',
      sql`${table.email} = lower(trim(${table.email}))`,
    ),
  ],
);
export const rooms = pgTable(
  'rooms',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id),
    name: text('name').notNull(),
    category: categoryEnum('category').notNull(),
    targetLux: integer('target_lux').notNull(),
    createdAt: time('created_at').notNull().defaultNow(),
    updatedAt: time('updated_at').notNull().defaultNow(),
    archivedAt: time('archived_at'),
  },
  (table) => [
    index('rooms_owner').on(table.ownerId),
    check(
      'room_target',
      sql`${table.targetLux} = CASE WHEN ${table.category} IN ('Computer Lab','Offices') THEN 300 ELSE 500 END`,
    ),
  ],
);
export const modules = pgTable(
  'lighting_modules',
  {
    deviceId: text('device_id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id),
    name: text('name').notNull(),
    tokenHash: text('token_hash').unique(),
    createdAt: time('created_at').notNull().defaultNow(),
    updatedAt: time('updated_at').notNull().defaultNow(),
    archivedAt: time('archived_at'),
    lastReceivedAt: time('last_received_at'),
  },
  (table) => [index('modules_owner').on(table.ownerId)],
);
export interface RoomSnapshot {
  id: string;
  name: string;
  category: Category;
  targetLux: number;
}
export interface ModuleSnapshot {
  deviceId: string;
  name: string;
}
export const sessions = pgTable(
  'measurement_sessions',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id),
    roomId: text('room_id')
      .notNull()
      .references(() => rooms.id),
    moduleId: text('module_id')
      .notNull()
      .references(() => modules.deviceId),
    idempotencyKey: text('idempotency_key').notNull(),
    startInputs: text('start_inputs').notNull(),
    status: text('status')
      .$type<'active' | 'completed'>()
      .notNull()
      .default('active'),
    startedAt: time('started_at').notNull().defaultNow(),
    stoppedAt: time('stopped_at'),
    roomSnapshot: jsonb('room_snapshot').$type<RoomSnapshot>().notNull(),
    moduleSnapshot: jsonb('module_snapshot').$type<ModuleSnapshot>().notNull(),
    placementNotes: text('placement_notes'),
    summary: jsonb('summary').$type<Summary>(),
  },
  (table) => [
    uniqueIndex('session_start_key').on(table.ownerId, table.idempotencyKey),
    uniqueIndex('active_room')
      .on(table.roomId)
      .where(sql`${table.status} = 'active'`),
    uniqueIndex('active_module')
      .on(table.moduleId)
      .where(sql`${table.status} = 'active'`),
    check(
      'session_state',
      sql`(${table.status} = 'active' AND ${table.stoppedAt} IS NULL AND ${table.summary} IS NULL) OR (${table.status} = 'completed' AND ${table.stoppedAt} IS NOT NULL AND ${table.summary} IS NOT NULL)`,
    ),
  ],
);
export const samples = pgTable(
  'samples',
  {
    id: text('id').primaryKey(),
    sampleId: text('sample_id').notNull(),
    sessionId: text('session_id')
      .notNull()
      .references(() => sessions.id),
    deviceId: text('device_id')
      .notNull()
      .references(() => modules.deviceId),
    sampledAt: time('sampled_at').notNull(),
    receivedAt: time('received_at').notNull().defaultNow(),
    uptimeMs: doublePrecision('uptime_ms').notNull(),
    sensor1Lux: doublePrecision('sensor1_lux'),
    sensor2Lux: doublePrecision('sensor2_lux'),
    sensor3Lux: doublePrecision('sensor3_lux'),
    averageLux: doublePrecision('average_lux'),
    assessment: text('assessment').$type<'below_target' | 'meets_target'>(),
    quality: text('quality').$type<'complete' | 'incomplete'>().notNull(),
    payload: text('payload').notNull(),
  },
  (table) => [
    uniqueIndex('sample_replay_key').on(table.deviceId, table.sampleId),
    index('sample_history').on(table.sessionId, table.receivedAt, table.id),
    ...[table.sensor1Lux, table.sensor2Lux, table.sensor3Lux].map(
      (column, number) =>
        check(
          `lux_${number}_bounds`,
          sql`${column} IS NULL OR (${column} >= 0 AND ${column} <= 65535)`,
        ),
    ),
    check(
      'uptime_bounds',
      sql`${table.uptimeMs} >= 0 AND ${table.uptimeMs} <= 4294967295 AND ${table.uptimeMs} = floor(${table.uptimeMs})`,
    ),
  ],
);
export const deviceRequests = pgTable(
  'device_requests',
  {
    id: text('id').primaryKey(),
    deviceId: text('device_id')
      .notNull()
      .references(() => modules.deviceId),
    receivedAt: time('received_at').notNull(),
  },
  (table) => [index('device_rate').on(table.deviceId, table.receivedAt)],
);
