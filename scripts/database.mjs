import { pathToFileURL } from 'node:url';
import { prepareLocalConfig } from './local-config.mjs';
import { pnpm, run } from './process.mjs';

export async function startDatabase(env) {
  await run('docker', ['compose', 'up', '-d', '--wait', 'postgres'], env);
}

export async function databaseCommand(action) {
  if (!['start', 'migrate', 'seed', 'test'].includes(action)) {
    throw new Error('Expected start, migrate, seed, or test.');
  }
  const env = prepareLocalConfig();
  await startDatabase(env);
  if (action === 'start') return;
  if (action === 'migrate' || action === 'seed') {
    await pnpm(['--filter', 'server', `db:${action}`], env);
    return;
  }
  const databaseName = new URL(env.TEST_DATABASE_URL).pathname.slice(1);
  const sql = `SELECT format('CREATE DATABASE %I', '${databaseName}') WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${databaseName}')\n\\gexec\n`;
  await run(
    'docker',
    [
      'compose',
      'exec',
      '-T',
      'postgres',
      'psql',
      '-U',
      env.POSTGRES_USER,
      '-d',
      'postgres',
      '-v',
      'ON_ERROR_STOP=1',
    ],
    env,
    sql,
  );
  const testEnv = { ...env, DATABASE_URL: env.TEST_DATABASE_URL, NODE_ENV: 'test' };
  await pnpm(['--filter', 'server', 'db:migrate'], testEnv);
  await pnpm(['--filter', 'server', 'test:e2e'], testEnv);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  databaseCommand(process.argv[2]).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
