import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

export const root = dirname(dirname(fileURLToPath(import.meta.url)));

export function validateLocalConfig(config) {
  for (const key of ['DATABASE_URL', 'TEST_DATABASE_URL']) {
    const url = new URL(config[key]);
    if (url.search) {
      throw new Error(
        `${key} must not contain query parameters that can override the local target.`,
      );
    }
    if (
      !['postgres:', 'postgresql:'].includes(url.protocol) ||
      !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
    ) {
      throw new Error(
        `${key} must point to local PostgreSQL; cloud operations use server scripts directly.`,
      );
    }
    if (key === 'TEST_DATABASE_URL' && !/^\/[a-z][a-z0-9_]*_test$/.test(url.pathname)) {
      throw new Error('TEST_DATABASE_URL must name a separate database ending in _test.');
    }
  }
  if (new URL(config.DATABASE_URL).pathname === new URL(config.TEST_DATABASE_URL).pathname) {
    throw new Error('The test database must differ from the development database.');
  }
  for (const key of ['POSTGRES_USER', 'POSTGRES_DB']) {
    if (!/^[a-z][a-z0-9_]*$/.test(config[key] ?? '')) {
      throw new Error(`${key} must be a lowercase PostgreSQL identifier.`);
    }
  }
  if (
    !/^\d+$/.test(config.POSTGRES_PORT ?? '') ||
    Number(config.POSTGRES_PORT) > 65535 ||
    Number(config.POSTGRES_PORT) < 1
  ) {
    throw new Error('POSTGRES_PORT must be a valid TCP port.');
  }
  for (const key of ['DATABASE_URL', 'TEST_DATABASE_URL']) {
    const url = new URL(config[key]);
    if (
      url.port !== config.POSTGRES_PORT ||
      decodeURIComponent(url.username) !== config.POSTGRES_USER ||
      decodeURIComponent(url.password) !== config.POSTGRES_PASSWORD
    ) {
      throw new Error(
        `${key} must match the local POSTGRES_USER, POSTGRES_PASSWORD, and POSTGRES_PORT.`,
      );
    }
  }
  if (new URL(config.DATABASE_URL).pathname !== `/${config.POSTGRES_DB}`) {
    throw new Error('DATABASE_URL must match POSTGRES_DB.');
  }
  if ((config.JWT_SECRET?.length ?? 0) < 32 || (config.SEED_PASSWORD?.length ?? 0) < 16) {
    throw new Error('Configure JWT_SECRET (32+ characters) and SEED_PASSWORD (16+ characters).');
  }
  if (config.SEED_EMAIL !== 'photometrix@cpu.edu.ph') {
    throw new Error('The configured private account must be photometrix@cpu.edu.ph.');
  }
  return config;
}

export function prepareLocalConfig(directory = root) {
  const envPath = join(directory, '.env');
  if (!existsSync(envPath)) {
    const databasePassword = randomBytes(32).toString('base64url');
    const values = {
      POSTGRES_USER: 'photometrix',
      POSTGRES_PASSWORD: databasePassword,
      POSTGRES_DB: 'photometrix',
      POSTGRES_PORT: '5433',
      DATABASE_URL: `postgresql://photometrix:${databasePassword}@127.0.0.1:5433/photometrix`,
      TEST_DATABASE_URL: `postgresql://photometrix:${databasePassword}@127.0.0.1:5433/photometrix_test`,
      JWT_SECRET: randomBytes(48).toString('base64url'),
      JWT_EXPIRES_IN_SECONDS: '3600',
      PORT: '3000',
      CORS_ORIGINS:
        'http://localhost:8081,http://127.0.0.1:8081,http://localhost:8082,http://127.0.0.1:8082',
      RCT_METRO_PORT: '8082',
      SEED_EMAIL: 'photometrix@cpu.edu.ph',
      SEED_PASSWORD: randomBytes(24).toString('base64url'),
      EXPO_PUBLIC_API_URL: 'http://localhost:3000/api',
    };
    writeFileSync(
      envPath,
      Object.entries(values)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n') + '\n',
      { flag: 'wx', mode: 0o600 },
    );
  }
  const config = validateLocalConfig(parseEnv(readFileSync(envPath, 'utf8')));
  mkdirSync(join(directory, '.local'), { recursive: true });
  const credentialsPath = join(directory, '.local', 'credentials.json');
  const previousCredentials = existsSync(credentialsPath)
    ? JSON.parse(readFileSync(credentialsPath, 'utf8'))
    : {};
  writeFileSync(
    credentialsPath,
    JSON.stringify(
      {
        ...previousCredentials,
        local: { email: config.SEED_EMAIL, password: config.SEED_PASSWORD },
      },
      null,
      2,
    ) + '\n',
    { mode: 0o600 },
  );
  return { ...process.env, RCT_METRO_PORT: '8082', ...config };
}
