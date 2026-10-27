import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  decodeLatest,
  decodePage,
  decodeRoom,
  decodeSample,
  decodeSession,
  formatLux,
  roomTargets,
  visibleLive,
} from '../src/lib/contract.ts';
import { startAttempt } from '../src/lib/session-state.ts';

const timestamp = '2026-10-27T06:00:00.000Z';
const sample = {
  id: 'record-1',
  sampleId: 'boot-1',
  sessionId: 'session-1',
  deviceId: 'LIGHT-1',
  sampledAt: timestamp,
  receivedAt: timestamp,
  uptimeMs: 0,
  sensor1Lux: 0,
  sensor2Lux: 0,
  sensor3Lux: 0,
  quality: 'complete',
  averageLux: 0,
  assessment: 'below_target',
};
const latest = {
  sample,
  evaluatedAt: timestamp,
  live: { state: 'fresh', averageLux: 0, assessment: 'below_target', recommendations: [] },
};

test('canonical target categories match the accepted room targets', () => {
  assert.deepEqual(roomTargets, {
    Classroom: 500,
    'Computer Lab': 300,
    Offices: 300,
    'Lecture hall/Auditorium': 500,
    'CAD Workstation': 500,
  });
  assert.throws(() =>
    decodeRoom({
      id: 'room-1',
      name: 'Test',
      category: 'Laboratory',
      targetLux: 500,
      createdAt: timestamp,
      updatedAt: timestamp,
      archivedAt: null,
    }),
  );
});
test('zero is retained as a valid reading; missing/null never becomes a zero', () => {
  assert.equal(decodeSample(sample).sensor1Lux, 0);
  assert.equal(
    decodeSample({
      ...sample,
      sensor1Lux: null,
      quality: 'incomplete',
      averageLux: null,
      assessment: null,
    }).sensor1Lux,
    null,
  );
  assert.equal(formatLux(null), 'Unavailable');
  assert.equal(formatLux(0), '0');
  for (const value of [undefined, -1, Infinity, NaN, '500', 65536])
    assert.throws(() => decodeSample({ ...sample, sensor1Lux: value }));
});
test('current assessment expires at either acquisition or receipt age over 30 seconds', () => {
  assert.equal(visibleLive(decodeLatest(latest), 'session-1', 30000).state, 'fresh');
  const stale = visibleLive(decodeLatest(latest), 'session-1', 30001);
  assert.equal(stale.state, 'stale');
  assert.equal(stale.averageLux, null);
  assert.equal(stale.assessment, null);
  assert.equal(
    visibleLive(
      decodeLatest({ ...latest, sample: { ...sample, sampledAt: '2026-10-27T05:59:35.000Z' } }),
      'session-1',
      5001,
    ).state,
    'stale',
  );
  assert.equal(
    visibleLive(
      decodeLatest({ ...latest, sample: { ...sample, receivedAt: '2026-10-27T05:59:35.000Z' } }),
      'session-1',
      5001,
    ).state,
    'stale',
  );
});
test('incomplete latest stays incomplete, never falls back to an older complete result', () => {
  const incomplete = decodeLatest({
    ...latest,
    sample: {
      ...sample,
      sensor3Lux: null,
      averageLux: null,
      assessment: null,
      quality: 'incomplete',
    },
    live: { state: 'incomplete', averageLux: null, assessment: null, recommendations: [] },
  });
  assert.equal(visibleLive(incomplete, 'session-1', 0).state, 'incomplete');
  assert.equal(visibleLive(incomplete, 'session-1', 30001).state, 'stale');
});
test('a delayed response from another session cannot supply its live result', () => {
  const result = visibleLive(decodeLatest(latest), 'session-2', 0);
  assert.equal(result.state, 'waiting');
  assert.equal(result.averageLux, null);
  assert.equal(result.assessment, null);
});
test('display rounding does not replace the server assessment at the target edge', () => {
  const below = decodeLatest({
    ...latest,
    live: { state: 'fresh', averageLux: 499.999, assessment: 'below_target', recommendations: [] },
  });
  assert.equal(formatLux(below.live.averageLux), '500');
  assert.equal(visibleLive(below, 'session-1', 0).assessment, 'below_target');
});
test('completed sessions keep target/name snapshots and never turn stale', () => {
  const summary = {
    totalSampleCount: 2,
    completeSampleCount: 0,
    incompleteSampleCount: 2,
    firstSampledAt: timestamp,
    lastSampledAt: timestamp,
    sessionAverageLux: null,
    assessment: null,
    result: 'insufficient_data',
    recommendations: ['Recollect.'],
  };
  const session = decodeSession({
    id: 'session-1',
    roomId: 'room-1',
    moduleId: 'LIGHT-1',
    status: 'completed',
    startedAt: timestamp,
    stoppedAt: timestamp,
    roomSnapshot: { id: 'room-1', name: 'Original room', category: 'Classroom', targetLux: 500 },
    moduleSnapshot: { deviceId: 'LIGHT-1', name: 'Original module' },
    placementNotes: null,
    summary,
  });
  assert.equal(session.roomSnapshot.targetLux, 500);
  assert.equal(session.roomSnapshot.name, 'Original room');
  assert.equal(session.summary.result, 'insufficient_data');
  assert.equal(session.summary.sessionAverageLux, null);
  assert.equal(
    visibleLive(
      decodeLatest({
        ...latest,
        live: { state: 'completed', averageLux: null, assessment: null, recommendations: [] },
      }),
      'session-1',
      86400000,
    ).state,
    'completed',
  );
});
test('pagination preserves opaque cursors and validates every record', () => {
  const decode = decodePage(decodeSample);
  assert.equal(
    decode({ items: [sample], nextCursor: 'opaque+cursor/=' }).nextCursor,
    'opaque+cursor/=',
  );
  assert.deepEqual(decode({ items: [], nextCursor: null }).items, []);
  assert.throws(() => decode({ items: [sample, { bad: true }], nextCursor: null }));
});
test('an ambiguous start retains one key and normalized immutable input snapshot', () => {
  let name = 'Module-A';
  let notes = '  center / left / right  ';
  const attempt = startAttempt('room-1', name, notes, 'fixed-key');
  name = 'Module-B';
  notes = 'changed';
  assert.equal(name, 'Module-B');
  assert.equal(notes, 'changed');
  assert.deepEqual(attempt, {
    key: 'fixed-key',
    input: { roomId: 'room-1', moduleId: 'Module-A', placementNotes: 'center / left / right' },
  });
  assert.deepEqual(startAttempt('room-1', 'Module-A', '  ', 'key-2').input, {
    roomId: 'room-1',
    moduleId: 'Module-A',
  });
});
