import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { prepareLocalConfig, validateLocalConfig } from './local-config.mjs';
import { databaseCommand } from './database.mjs';

test('local setup generates strong persistent credentials and isolated database URLs', () => {
  const directory = mkdtempSync(join(tmpdir(), 'photometrix-config-'));
  try {
    const initial = prepareLocalConfig(directory);
    writeFileSync(
      join(directory, '.local/credentials.json'),
      JSON.stringify({ cloud: { email: 'test@example.invalid' } }),
    );
    const repeated = prepareLocalConfig(directory);
    assert.equal(initial.SEED_EMAIL, 'photometrix@cpu.edu.ph');
    assert.equal(initial.RCT_METRO_PORT, '8082');
    assert.ok(initial.SEED_PASSWORD.length >= 16);
    assert.ok(initial.JWT_SECRET.length >= 32);
    assert.equal(initial.SEED_PASSWORD, repeated.SEED_PASSWORD);
    assert.equal(initial.DATABASE_URL, repeated.DATABASE_URL);
    assert.notEqual(initial.DATABASE_URL, initial.TEST_DATABASE_URL);
    const credentials = JSON.parse(
      readFileSync(join(directory, '.local/credentials.json'), 'utf8'),
    );
    assert.equal(credentials.local.password, initial.SEED_PASSWORD);
    assert.equal(credentials.cloud.email, 'test@example.invalid');
    assert.throws(
      () =>
        validateLocalConfig({
          ...initial,
          DATABASE_URL: 'postgresql://user:password@cloud.example/production',
        }),
      /local PostgreSQL/,
    );
    assert.throws(
      () => validateLocalConfig({ ...initial, TEST_DATABASE_URL: initial.DATABASE_URL }),
      /_test/,
    );
    assert.throws(
      () => validateLocalConfig({ ...initial, POSTGRES_DB: 'unsafe-name' }),
      /identifier/,
    );
    assert.throws(() => validateLocalConfig({ ...initial, JWT_SECRET: 'short' }), /JWT_SECRET/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('an invalid database action fails before touching Docker or local configuration', async () => {
  await assert.rejects(databaseCommand('invalid'), /Expected start/);
});

test('local URL guards reject pg query overrides for development and test connections', () => {
  const config = {
    POSTGRES_USER: 'test',
    POSTGRES_PASSWORD: 'placeholder',
    POSTGRES_DB: 'local',
    POSTGRES_PORT: '5433',
    DATABASE_URL: 'postgresql://test:placeholder@127.0.0.1:5433/local',
    TEST_DATABASE_URL: 'postgresql://test:placeholder@127.0.0.1:5433/local_test',
    JWT_SECRET: 'j'.repeat(32),
    SEED_PASSWORD: 'p'.repeat(16),
    SEED_EMAIL: 'photometrix@cpu.edu.ph',
  };
  assert.equal(validateLocalConfig(config), config);
  for (const key of ['DATABASE_URL', 'TEST_DATABASE_URL']) {
    assert.throws(
      () =>
        validateLocalConfig({ ...config, [key]: `${config[key]}?host=remote.invalid&port=6543` }),
      /query parameters/,
    );
  }
});
