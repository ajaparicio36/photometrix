/** App boundary for the documented API. Values are validated before rendering. */
export const roomTargets = {
  Classroom: 500,
  'Computer Lab': 300,
  Offices: 300,
  'Lecture hall/Auditorium': 500,
  'CAD Workstation': 500,
} as const;
export type Category = keyof typeof roomTargets;
export type Assessment = 'below_target' | 'meets_target';
export interface Room {
  id: string;
  name: string;
  category: Category;
  targetLux: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}
export interface LightingModule {
  deviceId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  lastReceivedAt: string | null;
}
export interface SessionSummary {
  totalSampleCount: number;
  completeSampleCount: number;
  incompleteSampleCount: number;
  firstSampledAt: string | null;
  lastSampledAt: string | null;
  sessionAverageLux: number | null;
  assessment: Assessment | null;
  result: 'assessed' | 'insufficient_data';
  recommendations: string[];
}
export interface Session {
  id: string;
  roomId: string;
  moduleId: string;
  status: 'active' | 'completed';
  startedAt: string;
  stoppedAt: string | null;
  roomSnapshot: Pick<Room, 'id' | 'name' | 'category' | 'targetLux'>;
  moduleSnapshot: Pick<LightingModule, 'deviceId' | 'name'>;
  placementNotes: string | null;
  summary: SessionSummary | null;
}
export interface Sample {
  id: string;
  sampleId: string;
  sessionId: string;
  deviceId: string;
  sampledAt: string;
  receivedAt: string;
  uptimeMs: number;
  sensor1Lux: number | null;
  sensor2Lux: number | null;
  sensor3Lux: number | null;
  quality: 'complete' | 'incomplete';
  averageLux: number | null;
  assessment: Assessment | null;
}
export interface Live {
  state: 'waiting' | 'fresh' | 'incomplete' | 'stale' | 'completed';
  averageLux: number | null;
  assessment: Assessment | null;
  recommendations: string[];
}
export interface LatestSample {
  sample: Sample | null;
  evaluatedAt: string;
  live: Live;
}
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}
export interface User {
  id: string;
  email: string;
}
export interface Login {
  accessToken: string;
  expiresIn: number;
  user: User;
}
export interface Issuance {
  module: LightingModule;
  deviceToken: string;
}
export type Decoder<T> = (value: unknown) => T;

export function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new Error('Unexpected API response. Please refresh.');
  return value as Record<string, unknown>;
}
function string(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Unexpected API text. Please refresh.');
  return value;
}
function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw new Error('Unexpected API number. Please refresh.');
  return value;
}
function nonnegative(value: unknown): number {
  const result = number(value);
  if (result < 0) throw new Error('Unexpected negative value.');
  return result;
}
function timestamp(value: unknown): string {
  const result = string(value);
  if (!Number.isFinite(Date.parse(result))) throw new Error('Unexpected API timestamp.');
  return result;
}
function nullable<T>(value: unknown, decode: Decoder<T>): T | null {
  return value === null ? null : decode(value);
}
function enumeration<const T extends string>(value: unknown, choices: readonly T[]): T {
  if (typeof value !== 'string' || !choices.includes(value as T))
    throw new Error('Unexpected API state. Please refresh.');
  return value as T;
}
function texts(value: unknown): string[] {
  if (!Array.isArray(value)) throw new Error('Unexpected guidance response.');
  return value.map(string);
}
function assessment(value: unknown): Assessment | null {
  return nullable(value, (entry) => enumeration(entry, ['below_target', 'meets_target']));
}
function lux(value: unknown): number {
  const result = nonnegative(value);
  if (result > 65535) throw new Error('Reading is outside the supported range.');
  return result;
}
function category(value: unknown): Category {
  return enumeration(value, Object.keys(roomTargets) as Category[]);
}
function roomSnapshot(value: unknown): Session['roomSnapshot'] {
  const v = record(value);
  return {
    id: string(v.id),
    name: string(v.name),
    category: category(v.category),
    targetLux: nonnegative(v.targetLux),
  };
}
export function decodeRoom(value: unknown): Room {
  const v = record(value);
  return {
    ...roomSnapshot(v),
    createdAt: timestamp(v.createdAt),
    updatedAt: timestamp(v.updatedAt),
    archivedAt: nullable(v.archivedAt, timestamp),
  };
}
export function decodeModule(value: unknown): LightingModule {
  const v = record(value);
  return {
    deviceId: string(v.deviceId),
    name: string(v.name),
    createdAt: timestamp(v.createdAt),
    updatedAt: timestamp(v.updatedAt),
    archivedAt: nullable(v.archivedAt, timestamp),
    lastReceivedAt: nullable(v.lastReceivedAt, timestamp),
  };
}
export function decodeSummary(value: unknown): SessionSummary {
  const v = record(value);
  return {
    totalSampleCount: nonnegative(v.totalSampleCount),
    completeSampleCount: nonnegative(v.completeSampleCount),
    incompleteSampleCount: nonnegative(v.incompleteSampleCount),
    firstSampledAt: nullable(v.firstSampledAt, timestamp),
    lastSampledAt: nullable(v.lastSampledAt, timestamp),
    sessionAverageLux: nullable(v.sessionAverageLux, lux),
    assessment: assessment(v.assessment),
    result: enumeration(v.result, ['assessed', 'insufficient_data']),
    recommendations: texts(v.recommendations),
  };
}
export function decodeSession(value: unknown): Session {
  const v = record(value);
  const module = record(v.moduleSnapshot);
  return {
    id: string(v.id),
    roomId: string(v.roomId),
    moduleId: string(v.moduleId),
    status: enumeration(v.status, ['active', 'completed']),
    startedAt: timestamp(v.startedAt),
    stoppedAt: nullable(v.stoppedAt, timestamp),
    roomSnapshot: roomSnapshot(v.roomSnapshot),
    moduleSnapshot: { deviceId: string(module.deviceId), name: string(module.name) },
    placementNotes: nullable(v.placementNotes, string),
    summary: nullable(v.summary, decodeSummary),
  };
}
export function decodeSample(value: unknown): Sample {
  const v = record(value);
  return {
    id: string(v.id),
    sampleId: string(v.sampleId),
    sessionId: string(v.sessionId),
    deviceId: string(v.deviceId),
    sampledAt: timestamp(v.sampledAt),
    receivedAt: timestamp(v.receivedAt),
    uptimeMs: nonnegative(v.uptimeMs),
    sensor1Lux: nullable(v.sensor1Lux, lux),
    sensor2Lux: nullable(v.sensor2Lux, lux),
    sensor3Lux: nullable(v.sensor3Lux, lux),
    quality: enumeration(v.quality, ['complete', 'incomplete']),
    averageLux: nullable(v.averageLux, lux),
    assessment: assessment(v.assessment),
  };
}
export function decodeLatest(value: unknown): LatestSample {
  const v = record(value);
  const live = record(v.live);
  return {
    sample: nullable(v.sample, decodeSample),
    evaluatedAt: timestamp(v.evaluatedAt),
    live: {
      state: enumeration(live.state, ['waiting', 'fresh', 'incomplete', 'stale', 'completed']),
      averageLux: nullable(live.averageLux, lux),
      assessment: assessment(live.assessment),
      recommendations: texts(live.recommendations),
    },
  };
}
export function decodePage<T>(decode: Decoder<T>): Decoder<Page<T>> {
  return (value) => {
    const v = record(value);
    if (!Array.isArray(v.items)) throw new Error('Unexpected list response. Please refresh.');
    return { items: v.items.map(decode), nextCursor: nullable(v.nextCursor, string) };
  };
}
export function decodeUser(value: unknown): User {
  const v = record(value);
  return { id: string(v.id), email: string(v.email) };
}
export function decodeLogin(value: unknown): Login {
  const v = record(value);
  return {
    accessToken: string(v.accessToken),
    expiresIn: nonnegative(v.expiresIn),
    user: decodeUser(v.user),
  };
}
export function decodeIssuance(value: unknown): Issuance {
  const v = record(value);
  return { module: decodeModule(v.module), deviceToken: string(v.deviceToken) };
}

/** Age against server evaluation time plus elapsed client time, so clock offset cannot revive stale data. */
export function visibleLive(latest: LatestSample, sessionId: string, elapsedMs: number): Live {
  if (latest.sample && latest.sample.sessionId !== sessionId)
    return {
      state: 'waiting',
      averageLux: null,
      assessment: null,
      recommendations: ['Reload this session to get its readings.'],
    };
  if (latest.live.state === 'completed' || !latest.sample) return latest.live;
  const evaluation = Date.parse(latest.evaluatedAt) + Math.max(0, elapsedMs);
  const stale =
    evaluation - Date.parse(latest.sample.sampledAt) > 30000 ||
    evaluation - Date.parse(latest.sample.receivedAt) > 30000;
  if (stale)
    return {
      state: 'stale',
      averageLux: null,
      assessment: null,
      recommendations: ['Check the module connection and collect a recent sample.'],
    };
  return latest.live;
}
export function formatLux(value: number | null): string {
  return value === null
    ? 'Unavailable'
    : value.toLocaleString(undefined, { maximumFractionDigits: 1 });
}
export function formatTime(value: string | null): string {
  return value === null ? 'Not received' : new Date(value).toLocaleString();
}
export function assessmentLabel(value: Assessment | null): string {
  return value === 'meets_target'
    ? 'Meets room target'
    : value === 'below_target'
      ? 'Below room target'
      : 'Insufficient data';
}
