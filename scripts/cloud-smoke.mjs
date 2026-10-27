import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, '.local/cloud');
const credentials = JSON.parse(await readFile(resolve(output, 'credentials.json'), 'utf8'));
const base = new URL(credentials.apiUrl);
assert.equal(base.protocol, 'https:', 'Cloud smoke requires HTTPS');
assert.equal(base.pathname, '/api', 'Cloud URL must include /api');
const evidence = {
  label: 'SIMULATED software-only verification; no physical ESP32/sensor validation',
  startedAt: new Date().toISOString(),
  apiUrl: base.href,
  requests: [],
  cleanup: [],
  roomId: null,
  moduleId: null,
  sessionId: null,
  passed: false,
};
let userToken;
let sessionStopped = false;

async function call(method, path, value, token = userToken, expected = 200) {
  const response = await fetch(`${base.href}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(value ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(value ? { body: JSON.stringify(value) } : {}),
    signal: AbortSignal.timeout(30000),
  });
  evidence.requests.push({ method, path, status: response.status });
  assert.equal(response.status, expected, `${method} ${path}: unexpected HTTP status`);
  const result = await response.json();
  assert.ok(result && typeof result === 'object' && !Array.isArray(result), 'Expected JSON object');
  return result;
}
try {
  await mkdir(output, { recursive: true });
  assert.deepEqual(await call('GET', '/health', undefined, null), { status: 'ok' });
  const login = await call(
    'POST',
    '/auth/login',
    { email: credentials.email, password: credentials.password },
    null,
  );
  assert.equal(typeof login.accessToken, 'string');
  userToken = login.accessToken;
  assert.equal((await call('GET', '/auth/me')).email, credentials.email);
  await call('GET', '/auth/me', undefined, 'invalid-token', 401);
  await call(
    'POST',
    '/rooms',
    { name: 'SIMULATED rejected owner override', category: 'Classroom', ownerId: randomUUID() },
    userToken,
    400,
  );
  const room = await call(
    'POST',
    '/rooms',
    { name: `SIMULATED cloud check ${new Date().toISOString()}`, category: 'Classroom' },
    userToken,
    201,
  );
  evidence.roomId = room.id;
  const registration = await call(
    'POST',
    '/modules',
    { name: 'SIMULATED HTTP device - archived after check' },
    userToken,
    201,
  );
  evidence.moduleId = registration.module.deviceId;
  const deviceToken = registration.deviceToken;
  const startResponse = await fetch(`${base.href}/sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${userToken}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': randomUUID(),
    },
    body: JSON.stringify({
      roomId: room.id,
      moduleId: evidence.moduleId,
      placementNotes:
        'SIMULATED software verification. No physical sensors, calibration or validated hardware. Three protocol channels only.',
    }),
    signal: AbortSignal.timeout(30000),
  });
  assert.equal(startResponse.status, 201);
  const session = await startResponse.json();
  evidence.requests.push({ method: 'POST', path: '/sessions', status: startResponse.status });
  evidence.sessionId = session.id;
  assert.equal(
    (await call('GET', '/device/active-session', undefined, deviceToken)).sessionId,
    session.id,
  );
  const complete = {
    deviceId: evidence.moduleId,
    sessionId: session.id,
    sampleId: randomUUID(),
    uptimeMs: 10000,
    sampledAt: new Date().toISOString(),
    sensor1Lux: 499,
    sensor2Lux: 500,
    sensor3Lux: 501,
  };
  const accepted = await call('POST', '/device/measurements', complete, deviceToken, 201);
  assert.equal(accepted.averageLux, 500);
  assert.equal(accepted.assessment, 'meets_target');
  assert.deepEqual(await call('POST', '/device/measurements', complete, deviceToken), accepted);
  await call(
    'POST',
    '/device/measurements',
    {
      ...complete,
      sampleId: randomUUID(),
      sampledAt: new Date().toISOString(),
      sensor1Lux: 0,
      sensor2Lux: null,
    },
    deviceToken,
    201,
  );
  const latest = await call('GET', `/sessions/${session.id}/latest`);
  assert.equal(latest.live.state, 'incomplete');
  assert.equal(latest.live.averageLux, null);
  assert.equal(latest.sample.sensor1Lux, 0);
  await call(
    'POST',
    '/device/measurements',
    { ...complete, sampleId: randomUUID(), sensor1Lux: -1 },
    deviceToken,
    400,
  );
  const samples = await call('GET', `/sessions/${session.id}/samples`);
  assert.equal(samples.items.length, 2);
  const stopped = await call('POST', `/sessions/${session.id}/stop`);
  sessionStopped = true;
  assert.equal(stopped.summary.completeSampleCount, 1);
  assert.equal(stopped.summary.incompleteSampleCount, 1);
  assert.equal(stopped.summary.sessionAverageLux, 500);
  assert.deepEqual(await call('POST', `/sessions/${session.id}/stop`), stopped);
  assert.deepEqual(await call('POST', '/device/measurements', complete, deviceToken), accepted);
  await call('PATCH', `/rooms/${room.id}`, {
    name: 'SIMULATED archived office (historical target preserved)',
    category: 'Offices',
  });
  await call('POST', `/rooms/${room.id}/archive`);
  await call('POST', `/modules/${evidence.moduleId}/archive`);
  const historical = await call('GET', `/sessions/${session.id}`);
  assert.equal(historical.roomSnapshot.category, 'Classroom');
  assert.equal(historical.roomSnapshot.targetLux, 500);
  assert.deepEqual(historical.summary, stopped.summary);
  const pdf = await fetch(`${base.href}/sessions/${session.id}/report.pdf`, {
    headers: { Authorization: `Bearer ${userToken}` },
    signal: AbortSignal.timeout(30000),
  });
  assert.equal(pdf.status, 200);
  assert.match(pdf.headers.get('content-type') ?? '', /application\/pdf/);
  const bytes = Buffer.from(await pdf.arrayBuffer());
  assert.equal(bytes.subarray(0, 4).toString(), '%PDF');
  await writeFile(resolve(output, 'simulated-session-report.pdf'), bytes);
  evidence.requests.push({
    method: 'GET',
    path: `/sessions/${session.id}/report.pdf`,
    status: pdf.status,
  });
  evidence.summary = historical.summary;
  evidence.sampleHistory = samples.items;
  evidence.passed = true;
} finally {
  if (userToken) {
    const actions = [];
    if (evidence.sessionId && !sessionStopped) actions.push(`/sessions/${evidence.sessionId}/stop`);
    if (evidence.moduleId) actions.push(`/modules/${evidence.moduleId}/archive`);
    if (evidence.roomId) actions.push(`/rooms/${evidence.roomId}/archive`);
    for (const path of actions) {
      try {
        const response = await fetch(`${base.href}${path}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${userToken}` },
          signal: AbortSignal.timeout(30000),
        });
        evidence.cleanup.push({ path, status: response.status });
      } catch {
        evidence.cleanup.push({ path, status: 'network-failure' });
      }
    }
  }
  evidence.completedAt = new Date().toISOString();
  await mkdir(output, { recursive: true });
  await writeFile(resolve(output, 'smoke-evidence.json'), JSON.stringify(evidence, null, 2));
}
assert.equal(evidence.passed, true);
assert.ok(
  evidence.cleanup.every((entry) => entry.status === 200),
  'Fixture archival must complete',
);
console.log(
  JSON.stringify({
    passed: true,
    label: evidence.label,
    apiUrl: base.href,
    requests: evidence.requests.length,
    sessionId: evidence.sessionId,
    evidence: '.local/cloud/smoke-evidence.json',
    report: '.local/cloud/simulated-session-report.pdf',
  }),
);
