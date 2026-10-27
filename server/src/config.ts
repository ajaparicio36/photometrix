import 'dotenv/config';

export interface Configuration {
  databaseUrl: string;
  jwtSecret: string;
  jwtExpiresInSeconds: number;
  port: number;
  corsOrigins: string[];
}

export function configuration(): Configuration {
  const databaseUrl = process.env.DATABASE_URL ?? '';
  let database: URL;
  try {
    database = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL URL');
  }
  if (!['postgres:', 'postgresql:'].includes(database.protocol))
    throw new Error('DATABASE_URL must be PostgreSQL');
  const jwtSecret = process.env.JWT_SECRET ?? '';
  if (jwtSecret.length < 32)
    throw new Error('JWT_SECRET must contain at least 32 characters');
  const port = Number(process.env.PORT ?? 3000);
  const jwtExpiresInSeconds = Number(
    process.env.JWT_EXPIRES_IN_SECONDS ?? 3600,
  );
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('PORT is invalid');
  if (
    !Number.isInteger(jwtExpiresInSeconds) ||
    jwtExpiresInSeconds < 1 ||
    jwtExpiresInSeconds > 86400
  )
    throw new Error('JWT_EXPIRES_IN_SECONDS must be 1-86400');
  const corsOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  for (const origin of corsOrigins) {
    if (new URL(origin).origin !== origin)
      throw new Error('CORS_ORIGINS must contain exact origins');
  }
  return { databaseUrl, jwtSecret, jwtExpiresInSeconds, port, corsOrigins };
}

export function assertTestDatabase(url: string): void {
  const parsed = new URL(url);
  if (parsed.search) {
    throw new Error('TEST_DATABASE_URL must not contain query parameters');
  }
  if (
    !['postgres:', 'postgresql:'].includes(parsed.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname) ||
    !/^\/[a-z0-9_]+_test$/.test(parsed.pathname)
  ) {
    throw new Error(
      'TEST_DATABASE_URL must target a loopback PostgreSQL database ending _test',
    );
  }
}
