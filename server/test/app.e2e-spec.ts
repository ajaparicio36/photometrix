import 'dotenv/config';
import { randomBytes, randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import type { Response } from 'supertest';
import { Pool } from 'pg';
import { AppModule } from '../src/app.module';
import { assertTestDatabase } from '../src/config';
import { configureApp } from '../src/http';
import { migrateDatabase } from '../src/database/migrate';
import { seed } from '../src/database/seed';
import { DomainService } from '../src/domain/domain.service';
import { tokenHash } from '../src/auth/password';
import { UploadDto } from '../src/domain/dto';

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Expected JSON object');
  return value as Record<string, unknown>;
}
function field(value: unknown, key: string): string {
  const item = object(value)[key];
  if (typeof item !== 'string') throw new Error(`Expected string ${key}`);
  return item;
}
function body(response: Response): Record<string, unknown> {
  return object(response.body as unknown);
}

describe('PostgreSQL HTTP contract', () => {
  let app: NestExpressApplication;
  let server: Server;
  let pool: Pool;
  let accessToken: string;
  let secondToken: string;
  const fixture = randomUUID();
  const email = `test-${fixture}@example.test`;
  const secondEmail = `other-${fixture}@example.test`;
  const password = randomBytes(24).toString('base64url');
  const call = (
    method: 'get' | 'post' | 'patch',
    path: string,
    value?: object,
    token = accessToken,
  ) => {
    const test = request(server)[method](`/api${path}`);
    if (token) test.set('Authorization', `Bearer ${token}`);
    if (value) test.send(value);
    return test;
  };
  const pair = async (): Promise<{
    moduleId: string;
    token: string;
    roomId: string;
  }> => {
    const room = await call('post', '/rooms', {
      name: 'Classroom A',
      category: 'Classroom',
    }).expect(201);
    const module = await call('post', '/modules', {
      name: 'Portable A',
    }).expect(201);
    return {
      roomId: field(body(room), 'id'),
      moduleId: field(body(module).module, 'deviceId'),
      token: field(body(module), 'deviceToken'),
    };
  };
  const start = (roomId: string, moduleId: string, key = randomUUID()) =>
    call('post', '/sessions', { roomId, moduleId }).set('Idempotency-Key', key);
  const sample = (
    deviceId: string,
    sessionId: string,
    values: (number | null)[] = [500, 500, 500],
    offset = 0,
  ): UploadDto => ({
    deviceId,
    sessionId,
    sampleId: randomUUID(),
    sampledAt: new Date(Date.now() + offset).toISOString(),
    uptimeMs: 10000,
    sensor1Lux: values[0],
    sensor2Lux: values[1],
    sensor3Lux: values[2],
  });

  beforeAll(async () => {
    const url = process.env.TEST_DATABASE_URL;
    if (!url)
      throw new Error(
        'TEST_DATABASE_URL is required; developer/cloud DATABASE_URL is never a fallback',
      );
    assertTestDatabase(url);
    process.env.DATABASE_URL = url;
    process.env.JWT_SECRET = randomBytes(32).toString('base64url');
    pool = new Pool({ connectionString: url });
    await migrateDatabase(pool);
    await migrateDatabase(pool);
    await seed(pool, `  ${email.toUpperCase()}  `, password);
    const first = await pool.query<{ password_hash: string }>(
      'SELECT password_hash FROM users WHERE email=$1',
      [email],
    );
    await seed(pool, email, 'different-password-must-not-replace');
    const second = await pool.query<{ password_hash: string }>(
      'SELECT password_hash FROM users WHERE email=$1',
      [email],
    );
    expect(second.rows[0].password_hash).toBe(first.rows[0].password_hash);
    await seed(pool, secondEmail, password);
    app = await NestFactory.create<NestExpressApplication>(AppModule, {
      bodyParser: false,
      logger: false,
    });
    configureApp(app);
    await app.init();
    server = app.getHttpServer();
    accessToken = field(
      body(
        await call(
          'post',
          '/auth/login',
          { email: email.toUpperCase(), password },
          '',
        ).expect(200),
      ),
      'accessToken',
    );
    secondToken = field(
      body(
        await call(
          'post',
          '/auth/login',
          { email: secondEmail, password },
          '',
        ).expect(200),
      ),
      'accessToken',
    );
  }, 60000);
  afterAll(async () => {
    if (app) await app.close();
    if (pool) {
      const owners = await pool.query<{ id: string }>(
        'SELECT id FROM users WHERE email=ANY($1)',
        [[email, secondEmail]],
      );
      const ids = owners.rows.map((row) => row.id);
      await pool.query(
        'DELETE FROM device_requests WHERE device_id IN (SELECT device_id FROM lighting_modules WHERE owner_id=ANY($1))',
        [ids],
      );
      await pool.query(
        'DELETE FROM samples WHERE session_id IN (SELECT id FROM measurement_sessions WHERE owner_id=ANY($1))',
        [ids],
      );
      for (const table of ['measurement_sessions', 'lighting_modules', 'rooms'])
        await pool.query(`DELETE FROM ${table} WHERE owner_id=ANY($1)`, [ids]);
      await pool.query('DELETE FROM users WHERE id=ANY($1)', [ids]);
      await pool.end();
    }
  });
  it('validates health, login/expiry, unknown fields, request size and normalized uniqueness', async () => {
    await call('get', '/health', undefined, '')
      .expect(200)
      .expect({ status: 'ok' });
    const me = body(await call('get', '/auth/me').expect(200));
    expect(field(me, 'id')).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(me.email).toBe(email);
    expect(Object.keys(me).sort()).toEqual(['email', 'id']);
    await call('get', '/auth/me', undefined, '').expect(401);
    await call('post', '/auth/login', { email, password: 'wrong' }, '').expect(
      401,
    );
    await call(
      'post',
      '/auth/login',
      { email, password, ownerId: 'spoof' },
      '',
    ).expect(400);
    const expired = await app
      .get(JwtService)
      .signAsync({ sub: field(me, 'id') }, { expiresIn: -1 });
    await call('get', '/auth/me', undefined, expired).expect(401);
    await call('post', '/rooms', {
      name: 'x',
      category: 'Classroom',
      targetLux: 1,
    }).expect(400);
    await call('post', '/modules', { name: '  ' }).expect(400);
    await call('post', '/modules', { name: 'x'.repeat(17000) }).expect(413);
    await expect(
      pool.query('INSERT INTO users(id,email,password_hash) VALUES($1,$2,$3)', [
        randomUUID(),
        email,
        'unused',
      ]),
    ).rejects.toMatchObject({ code: '23505' });
  });
  it('covers every domain route, partial history, immutable snapshots, PDFs and ownership', async () => {
    const { roomId, moduleId, token } = await pair();
    await call('get', '/device/active-session', undefined, token)
      .expect(200)
      .expect({ sessionId: null });
    await call('get', `/rooms/${roomId}`).expect(200);
    await call('patch', `/rooms/${roomId}`, {
      name: 'Original classroom',
    }).expect(200);
    await call('patch', `/rooms/${roomId}`, {}).expect(400);
    await call('get', `/modules/${moduleId}`).expect(200);
    await call('patch', `/modules/${moduleId}`, {
      name: 'Original module',
    }).expect(200);
    const key = randomUUID();
    const started = await start(roomId, moduleId, key).expect(201);
    const id = field(body(started), 'id');
    await start(roomId, moduleId, key).expect(200).expect(body(started));
    await call('post', '/sessions', {
      roomId,
      moduleId,
      placementNotes: 'different',
    })
      .set('Idempotency-Key', key)
      .expect(409);
    await call('get', `/sessions/${id}`).expect(200);
    await call('get', '/device/active-session', undefined, token)
      .expect(200)
      .expect({ sessionId: id });
    expect(
      body(await call('get', `/sessions/${id}/latest`).expect(200)).live,
    ).toMatchObject({ state: 'waiting', assessment: null });
    await call('get', `/sessions/${id}/report.pdf`).expect(409);
    await call('post', `/sessions/${id}/stop`, { unexpected: true }).expect(
      400,
    );
    await call('patch', `/rooms/${roomId}`, { category: 'Offices' }).expect(
      409,
    );
    await call('post', `/rooms/${roomId}/archive`).expect(409);
    await call('post', `/modules/${moduleId}/archive`).expect(409);
    await call('post', `/modules/${moduleId}/credentials/rotate`).expect(409);
    const first = sample(moduleId, id);
    const accepted = await call(
      'post',
      '/device/measurements',
      first,
      token,
    ).expect(201);
    expect(body(accepted)).toMatchObject({
      averageLux: 500,
      assessment: 'meets_target',
    });
    const receipt = body(
      await call('get', `/modules/${moduleId}`).expect(200),
    ).lastReceivedAt;
    await call('post', '/device/measurements', first, token)
      .expect(200)
      .expect(body(accepted));
    expect(
      body(await call('get', `/modules/${moduleId}`).expect(200))
        .lastReceivedAt,
    ).toBe(receipt);
    await call(
      'post',
      '/device/measurements',
      { ...first, sensor1Lux: 1 },
      token,
    ).expect(409);
    await call(
      'post',
      '/device/measurements',
      sample(moduleId, id, [0, 500, null]),
      token,
    ).expect(201);
    const latest = body(
      await call('get', `/sessions/${id}/latest`).expect(200),
    );
    expect(latest.live).toMatchObject({
      state: 'incomplete',
      averageLux: null,
    });
    expect(latest.sample).toMatchObject({ sensor1Lux: 0, sensor3Lux: null });
    const page = body(
      await call('get', `/sessions/${id}/samples?limit=1`).expect(200),
    );
    const cursor = encodeURIComponent(field(page, 'nextCursor'));
    const next = body(
      await call(
        'get',
        `/sessions/${id}/samples?limit=1&cursor=${cursor}`,
      ).expect(200),
    );
    expect(next.nextCursor).toBeNull();
    expect(next.items).toEqual([
      expect.objectContaining({ quality: 'incomplete' }),
    ]);
    await call(
      'get',
      `/sessions/${id}/samples?cursor=${cursor}&quality=complete`,
    ).expect(400);
    await call('get', `/sessions/${id}/samples?quality=complete`).expect(200);
    await call(
      'get',
      `/sessions?roomId=${roomId}&moduleId=${moduleId}&status=active`,
    ).expect(200);
    const stopped = await call('post', `/sessions/${id}/stop`).expect(200);
    expect(body(stopped).summary).toMatchObject({
      totalSampleCount: 2,
      completeSampleCount: 1,
      incompleteSampleCount: 1,
      sessionAverageLux: 500,
    });
    await call('post', `/sessions/${id}/stop`)
      .expect(200)
      .expect(body(stopped));
    await call('post', '/device/measurements', first, token).expect(200);
    await call(
      'post',
      '/device/measurements',
      sample(moduleId, id),
      token,
    ).expect(409);
    const pdf = await call('get', `/sessions/${id}/report.pdf`)
      .expect(200)
      .expect('Content-Type', /application\/pdf/)
      .expect('Content-Disposition', /attachment/);
    const pdfBytes: unknown = pdf.body;
    expect(Buffer.isBuffer(pdfBytes)).toBe(true);
    if (Buffer.isBuffer(pdfBytes))
      await writeFile(
        join(tmpdir(), 'photometrix-backend-report-test.pdf'),
        pdfBytes,
      );
    await call('patch', `/rooms/${roomId}`, {
      name: 'New office',
      category: 'Offices',
    }).expect(200);
    await call('patch', `/modules/${moduleId}`, { name: 'New module' }).expect(
      200,
    );
    const rotated = body(
      await call('post', `/modules/${moduleId}/credentials/rotate`).expect(200),
    );
    await call('get', '/device/active-session', undefined, token).expect(401);
    await call(
      'get',
      '/device/active-session',
      undefined,
      field(rotated, 'deviceToken'),
    ).expect(200);
    await call('post', `/modules/${moduleId}/archive`).expect(200);
    await call('post', `/modules/${moduleId}/archive`).expect(200);
    await call('post', `/rooms/${roomId}/archive`).expect(200);
    await call('post', `/rooms/${roomId}/archive`).expect(200);
    await call('get', '/rooms?includeArchived=true&limit=1').expect(200);
    await call('get', '/modules?includeArchived=true').expect(200);
    const history = body(await call('get', `/sessions/${id}`).expect(200));
    expect(history.roomSnapshot).toMatchObject({
      name: 'Original classroom',
      category: 'Classroom',
      targetLux: 500,
    });
    expect(history.moduleSnapshot).toMatchObject({ name: 'Original module' });
    expect(history.summary).toEqual(body(stopped).summary);
    expect(
      body(await call('get', `/modules/${moduleId}`).expect(200)),
    ).not.toHaveProperty('tokenHash');
    for (const path of [
      `/rooms/${roomId}`,
      `/modules/${moduleId}`,
      `/sessions/${id}`,
      `/sessions/${id}/samples`,
      `/sessions/${id}/report.pdf`,
      `/sessions?roomId=${roomId}`,
    ])
      await call('get', path, undefined, secondToken).expect(404);
    await call('post', `/sessions/${id}/stop`, undefined, secondToken).expect(
      404,
    );
  }, 30000);
  it('enforces numeric/acquisition/credential bounds, zero-valid/stale and zero-sample PDF', async () => {
    const { roomId, moduleId, token } = await pair();
    const id = field(body(await start(roomId, moduleId).expect(201)), 'id');
    for (const value of [-1, 65536, 'not-lux'])
      await call(
        'post',
        '/device/measurements',
        { ...sample(moduleId, id), sensor1Lux: value },
        token,
      ).expect(400);
    await call(
      'post',
      '/device/measurements',
      { ...sample(moduleId, id), sensor1Lux: undefined },
      token,
    ).expect(400);
    for (const offset of [-31000, 6000])
      await call(
        'post',
        '/device/measurements',
        sample(moduleId, id, [500, 500, 500], offset),
        token,
      ).expect(400);
    await call(
      'post',
      '/device/measurements',
      sample('other-device', id),
      token,
    ).expect(403);
    await call('post', '/device/measurements', sample(moduleId, id)).expect(
      401,
    );
    await call('get', '/rooms', undefined, token).expect(401);
    const zero = await call(
      'post',
      '/device/measurements',
      sample(moduleId, id, [0, 0, 0]),
      token,
    ).expect(201);
    expect(body(zero)).toMatchObject({
      averageLux: 0,
      assessment: 'below_target',
    });
    expect(
      body(await call('get', `/sessions/${id}/latest`).expect(200)).live,
    ).toMatchObject({ state: 'fresh', averageLux: 0 });
    await pool.query('UPDATE samples SET sampled_at=$1 WHERE device_id=$2', [
      new Date(Date.now() - 31000),
      moduleId,
    ]);
    expect(
      body(await call('get', `/sessions/${id}/latest`).expect(200)).live,
    ).toMatchObject({ state: 'stale', averageLux: null });
    await call('post', `/sessions/${id}/stop`).expect(200);
    const second = await pair();
    const noData = field(
      body(await start(second.roomId, second.moduleId).expect(201)),
      'id',
    );
    expect(
      body(await call('post', `/sessions/${noData}/stop`).expect(200)).summary,
    ).toMatchObject({
      result: 'insufficient_data',
      totalSampleCount: 0,
      sessionAverageLux: null,
      assessment: null,
    });
    const emptyPdf = await call('get', `/sessions/${noData}/report.pdf`).expect(
      200,
    );
    const emptyBytes: unknown = emptyPdf.body;
    if (Buffer.isBuffer(emptyBytes))
      await writeFile(
        join(tmpdir(), 'photometrix-backend-insufficient-test.pdf'),
        emptyBytes,
      );
  });
  it('serializes simultaneous starts, replay, stop/upload and rechecks a rotated guard credential', async () => {
    const { roomId, moduleId, token } = await pair();
    const starts = await Promise.all([
      start(roomId, moduleId),
      start(roomId, moduleId),
    ]);
    expect(starts.map((result) => result.status).sort()).toEqual([201, 409]);
    const started = starts.find((result) => result.status === 201);
    if (!started) throw new Error('Expected successful start');
    const id = field(body(started), 'id');
    const input = sample(moduleId, id);
    const duplicates = await Promise.all([
      call('post', '/device/measurements', input, token),
      call('post', '/device/measurements', input, token),
    ]);
    expect(duplicates.map((result) => result.status).sort()).toEqual([
      200, 201,
    ]);
    const race = await Promise.all([
      call('post', `/sessions/${id}/stop`),
      call('post', '/device/measurements', sample(moduleId, id), token),
    ]);
    expect(race[0].status).toBe(200);
    expect([201, 409]).toContain(race[1].status);
    const history = body(
      await call('get', `/sessions/${id}/samples`).expect(200),
    );
    expect(history.items).toHaveLength(
      object(body(race[0]).summary).totalSampleCount as number,
    );
    const me = body(await call('get', '/auth/me').expect(200));
    await call('post', `/modules/${moduleId}/credentials/rotate`).expect(200);
    await expect(
      app.get(DomainService).upload(
        {
          deviceId: moduleId,
          ownerId: field(me, 'id'),
          tokenHash: tokenHash(token),
        },
        input,
      ),
    ).rejects.toMatchObject({ status: 401 });
  });
  it('bounds authenticated device requests and login attempts', async () => {
    const { moduleId, token } = await pair();
    await pool.query(
      'INSERT INTO device_requests(id,device_id,received_at) SELECT $1::text || n::text,$2,now() FROM generate_series(1,60) AS n',
      [randomUUID(), moduleId],
    );
    await call('get', '/device/active-session', undefined, token)
      .expect(429)
      .expect('Retry-After', '60');
    await pool.query('DELETE FROM device_requests WHERE device_id=$1', [
      moduleId,
    ]);
    await call('get', '/device/active-session', undefined, token).expect(200);
    let limited = false;
    for (let attempt = 0; attempt < 12; attempt++) {
      const response = await call(
        'post',
        '/auth/login',
        { email, password: 'wrong' },
        '',
      );
      if (response.status === 429) {
        limited = true;
        break;
      }
      expect(response.status).toBe(401);
    }
    expect(limited).toBe(true);
  });
});
