import { assertTestDatabase, configuration } from './config';

describe('database target boundaries', (): void => {
  afterEach((): void => {
    jest.restoreAllMocks();
  });

  it('accepts direct loopback test targets', (): void => {
    for (const host of ['localhost', '127.0.0.1', '[::1]']) {
      expect((): void => {
        assertTestDatabase(
          `postgresql://test:placeholder@${host}:5433/local_test`,
        );
      }).not.toThrow();
    }
  });

  it('rejects query overrides that pg can resolve to a different target', (): void => {
    expect((): void => {
      assertTestDatabase(
        'postgresql://test:placeholder@127.0.0.1:5433/local_test?host=remote.invalid&port=6543',
      );
    }).toThrow('query parameters');
  });

  it('rejects remote and non-test database names', (): void => {
    for (const target of [
      'postgresql://test:placeholder@remote.invalid:5433/local_test',
      'postgresql://test:placeholder@127.0.0.1:5433/production',
    ]) {
      expect((): void => {
        assertTestDatabase(target);
      }).toThrow();
    }
  });

  it('preserves production configuration support for PostgreSQL URL options', (): void => {
    const databaseUrl =
      'postgresql://test:placeholder@remote.invalid:6543/production?sslmode=require';
    jest.replaceProperty(process, 'env', {
      ...process.env,
      DATABASE_URL: databaseUrl,
      JWT_SECRET: 'j'.repeat(32),
      PORT: '3000',
      JWT_EXPIRES_IN_SECONDS: '3600',
      CORS_ORIGINS: 'http://localhost:8082',
    });
    expect(configuration().databaseUrl).toBe(databaseUrl);
  });
});
