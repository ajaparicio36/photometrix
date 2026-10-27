import concurrently from 'concurrently';
import { prepareLocalConfig, root } from './local-config.mjs';
import { startDatabase } from './database.mjs';
import { pnpm } from './process.mjs';

try {
  const target = process.argv[2] ?? 'all';
  if (!['all', 'app', 'server'].includes(target))
    throw new Error('Expected app, server, or no target.');
  const env = prepareLocalConfig();
  if (target !== 'app') {
    await startDatabase(env);
    await pnpm(['--filter', 'server', 'db:migrate'], env);
    await pnpm(['--filter', 'server', 'db:seed'], env);
  }
  const commands = [];
  if (target !== 'app')
    commands.push({ name: 'api', command: 'pnpm --filter server start:dev', env });
  if (target !== 'server') commands.push({ name: 'app', command: 'pnpm --filter app start', env });
  await concurrently(commands, {
    cwd: root,
    killOthersOn: ['failure', 'success'],
    prefixColors: ['blue', 'magenta'],
  }).result;
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Development processes stopped.');
  process.exitCode = 1;
}
