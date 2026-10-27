import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const temporary = mkdtempSync(path.join(tmpdir(), 'photometrix-firmware-check-'));
const executable = path.join(temporary, process.platform === 'win32' ? 'check.exe' : 'check');

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout;
}

try {
  run(process.env.CXX || 'g++', [
    '-x', 'c++', '-std=c++17', '-Wall', '-Wextra', '-Werror',
    '-DPHOTOMETRIX_HOST_TEST', path.join(directory, 'microcontroller.ino'), '-o', executable,
  ]);
  const sample = JSON.parse(run(executable, []));
  assert.deepEqual(Object.keys(sample).sort(), [
    'deviceId', 'sessionId', 'sampleId', 'uptimeMs', 'sampledAt',
    'sensor1Lux', 'sensor2Lux', 'sensor3Lux',
  ].sort());
  assert.equal(sample.sensor1Lux, 0);
  assert.equal(sample.sensor2Lux, 500);
  assert.equal(sample.sensor3Lux, null);
  assert.equal(sample.uptimeMs, 4294967295);
  assert.equal(new Date(sample.sampledAt).toISOString(), sample.sampledAt);
  assert.equal(sample.sessionId, 'session-1');
  assert.equal(sample.sampleId, 'boot-test-1');
  console.log('Firmware host checks passed: ID/payload validation, zero/null/saturation, retry classification, deadline and millis wrap.');
} finally {
  rmSync(executable, { force: true });
  rmdirSync(temporary);
}
