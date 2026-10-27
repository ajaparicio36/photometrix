import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import lintStaged from 'lint-staged';

test('check-only lint-staged preserves partially staged content in an isolated Git fixture', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'photometrix-hook-'));
  const git = (args) => execFileSync('git', args, { cwd: directory });
  try {
    git(['init', '-q']);
    git(['config', 'user.name', 'Hook test']);
    git(['config', 'user.email', 'hook@example.invalid']);
    writeFileSync(join(directory, '.gitattributes'), '* text=auto eol=lf\n');
    const file = join(directory, 'example.js');
    writeFileSync(file, 'const value = 1;\nconsole.log(value);\n');
    git(['add', '.gitattributes', 'example.js']);
    git(['commit', '-qm', 'test: initialize hook fixture']);
    writeFileSync(file, 'const value = 2;\nconsole.log(value);\n');
    git(['add', 'example.js']);
    writeFileSync(file, 'const value = 2;\nconsole.log(value + 1);\n');
    const staged = git(['diff', '--cached', '--binary']);
    const working = readFileSync(file);
    assert.equal(
      await lintStaged({
        cwd: directory,
        config: { '*.js': 'node --check' },
        quiet: true,
        failOnChanges: true,
      }),
      true,
    );
    assert.deepEqual(git(['diff', '--cached', '--binary']), staged);
    assert.deepEqual(readFileSync(file), working);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
