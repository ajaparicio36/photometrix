import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ApiError, query, request, requestJson } from '../src/lib/api.ts';
import { decodeSample } from '../src/lib/contract.ts';

test('transport sends the frozen start body and idempotency key without adding unsupported fields', async (context) => {
  const body = { roomId: 'room-1', moduleId: 'LIGHT-1' };
  context.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.match(url, /\/api\/sessions$/);
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.Authorization, 'Bearer private-token');
    assert.equal(options.headers['Idempotency-Key'], 'same-key');
    assert.deepEqual(JSON.parse(options.body), body);
    return new Response('{}', { status: 201 });
  });
  await request('/sessions', 'private-token', { method: 'POST', body, idempotencyKey: 'same-key' });
});
test('network and server failures are ambiguous; conflict and authentication failures are definitive', async (context) => {
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => {
    throw new TypeError('network');
  });
  await assert.rejects(
    request('/modules', 'token', { method: 'POST', body: { name: 'Module' } }),
    (error) => error instanceof ApiError && error.ambiguous,
  );
  fetchMock.mock.mockImplementation(async () => new Response('{}', { status: 503 }));
  await assert.rejects(
    request('/modules', 'token'),
    (error) => error instanceof ApiError && error.ambiguous,
  );
  fetchMock.mock.mockImplementation(
    async () =>
      new Response(JSON.stringify({ code: 'RESOURCE_ACTIVE', message: 'busy' }), { status: 409 }),
  );
  await assert.rejects(
    request('/sessions', 'token'),
    (error) => error instanceof ApiError && !error.ambiguous && error.code === 'RESOURCE_ACTIVE',
  );
  fetchMock.mock.mockImplementation(async () => new Response('{}', { status: 401 }));
  await assert.rejects(
    request('/rooms', 'token'),
    (error) => error instanceof ApiError && error.status === 401 && !error.ambiguous,
  );
});
test('a success response with invalid data is treated as ambiguous rather than a retryable issuance', async (context) => {
  context.mock.method(
    globalThis,
    'fetch',
    async () => new Response('{"sensor1Lux":null}', { status: 200 }),
  );
  await assert.rejects(
    requestJson('/samples', 'token', decodeSample),
    (error) => error instanceof ApiError && error.code === 'INVALID_RESPONSE' && error.ambiguous,
  );
});
test('pre-aborted requests propagate cancellation immediately', async (context) => {
  const controller = new AbortController();
  controller.abort();
  context.mock.method(globalThis, 'fetch', async (_url, options) => {
    assert.equal(options.signal.aborted, true);
    throw new DOMException('aborted', 'AbortError');
  });
  await assert.rejects(request('/rooms', 'token', { signal: controller.signal }), ApiError);
});
test('query encoding keeps cursor and filters separate', () => {
  assert.equal(
    query('/samples', { cursor: 'opaque+/=', quality: 'incomplete', unused: undefined }),
    '/samples?cursor=opaque%2B%2F%3D&quality=incomplete',
  );
});
