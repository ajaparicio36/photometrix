import { spawn } from 'node:child_process';
import { root } from './local-config.mjs';

export function run(command, args, env, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      env,
      stdio: [input ? 'pipe' : 'inherit', 'inherit', 'inherit'],
    });
    if (input) child.stdin.end(input);
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} failed (${signal ?? code}).`));
    });
  });
}

export function pnpm(args, env) {
  if (!process.env.npm_execpath) throw new Error('Run this command through a root pnpm script.');
  const manager = process.env.npm_execpath;
  return /\.exe$/i.test(manager)
    ? run(manager, args, env)
    : run(process.execPath, [manager, ...args], env);
}
