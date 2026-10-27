// Read-only integration check for the actual app decoders and transport.
// Credentials are read privately; no tokens or account values are printed.
import { readFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import {
  decodeLatest,
  decodeLogin,
  decodeModule,
  decodePage,
  decodeRoom,
  decodeSample,
  decodeSession,
  decodeUser,
} from '../src/lib/contract.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
const credentials = JSON.parse(
  await readFile(
    process.env.PHOTOMETRIX_CREDENTIALS ?? resolve(root, '.local/cloud/credentials.json'),
    'utf8',
  ),
);
if (typeof credentials.email !== 'string' || typeof credentials.password !== 'string')
  throw new Error('Provide an ignored credential file with email and password.');
process.env.EXPO_PUBLIC_API_URL ??= 'https://api-production-60e6d.up.railway.app/api';
const { requestJson, request } = await import('../src/lib/api.ts');
const login = await requestJson('/auth/login', null, decodeLogin, {
  method: 'POST',
  body: { email: credentials.email, password: credentials.password },
});
const token = login.accessToken;
assert.ok(login.expiresIn > 0);
await requestJson('/auth/me', token, decodeUser);
await requestJson('/rooms?includeArchived=true&limit=100', token, decodePage(decodeRoom));
await requestJson('/modules?includeArchived=true&limit=100', token, decodePage(decodeModule));
const sessions = await requestJson('/sessions?limit=100', token, decodePage(decodeSession));
let sampleCount = 0;
let reports = 0;
for (const session of sessions.items) {
  await requestJson(`/sessions/${session.id}`, token, decodeSession);
  const latest = await requestJson(`/sessions/${session.id}/latest`, token, decodeLatest);
  if (latest.sample) assert.equal(latest.sample.sessionId, session.id);
  let cursor = null;
  do {
    const page = await requestJson(
      `/sessions/${session.id}/samples?limit=1${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
      token,
      decodePage(decodeSample),
    );
    for (const sample of page.items) assert.equal(sample.sessionId, session.id);
    sampleCount += page.items.length;
    cursor = page.nextCursor;
  } while (cursor);
  if (session.status === 'completed') {
    const response = await request(`/sessions/${session.id}/report.pdf`, token);
    assert.match(response.headers.get('content-type') ?? '', /application\/pdf/);
    const pdf = Buffer.from(await response.arrayBuffer());
    assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
    reports += 1;
  }
}
assert.ok(sessions.items.length > 0, 'A recorded session is required for the readback check.');
assert.ok(sampleCount > 0, 'Recorded samples are required for decoder verification.');
assert.ok(reports > 0, 'A completed PDF report is required.');
console.log(
  `App API readback passed: authentication, rooms, modules, ${sessions.items.length} sessions, ${sampleCount} paginated samples, ${reports} authenticated PDF reports.`,
);
