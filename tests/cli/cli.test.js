import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const cli = join(root, 'src', 'cli', 'index.js');
const fixtures = join(root, 'tests', 'fixtures');

function run(args, extra = {}) {
  return spawnSync(process.execPath, [cli, ...args], {
    encoding: 'utf8',
    cwd: root,
    ...extra
  });
}

describe('CLI', () => {
  it('validates a valid file and exits 0', () => {
    const result = run(['validate', join(fixtures, 'valid.json'), '--no-color']);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /Valid JSON syntax/);
  });

  it('rejects invalid files with a non-zero exit code', () => {
    const result = run(['validate', join(fixtures, 'invalid.json'), '--json']);
    assert.equal(result.status, 1);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.valid, false);
    assert.ok(payload.error.line);
  });

  it('handles missing files', () => {
    const result = run(['validate', join(fixtures, 'nope.json')]);
    assert.equal(result.status, 2);
    assert.match(result.stdout + result.stderr, /not found/i);
  });

  it('compares nested files', () => {
    const result = run(['compare', join(fixtures, 'old.json'), join(fixtures, 'new.json'), '--json']);
    assert.equal(result.status, 1);
    const payload = JSON.parse(result.stdout);
    assert.ok(payload.added.some((item) => item.path === '$.active'));
  });

  it('runs schema validation', () => {
    const result = run(['schema', join(fixtures, 'schema-data.json'), join(fixtures, 'schema.json'), '--json']);
    assert.equal(result.status, 1);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.valid, false);
  });

  it('does not overwrite files without --overwrite', () => {
    const dir = join(root, 'tmp-cli-test');
    mkdirSync(dir, { recursive: true });
    const out = join(dir, 'out.json');
    writeFileSync(out, '{"keep":true}');
    const result = run(['format', join(fixtures, 'valid.json'), '--out', out]);
    assert.equal(result.status, 2);
    assert.equal(JSON.parse(readFileSync(out, 'utf8')).keep, true);
    rmSync(dir, { recursive: true, force: true });
  });

  it('writes output when --overwrite is provided', () => {
    const dir = join(root, 'tmp-cli-test-2');
    mkdirSync(dir, { recursive: true });
    const out = join(dir, 'out.json');
    writeFileSync(out, '{"keep":true}');
    const result = run(['format', join(fixtures, 'valid.json'), '--out', out, '--overwrite']);
    assert.equal(result.status, 0, result.stderr + result.stdout);
    assert.equal(existsSync(out), true);
    assert.ok(JSON.parse(readFileSync(out, 'utf8')).user);
    rmSync(dir, { recursive: true, force: true });
  });

  it('prints help and version', () => {
    const help = run(['--help']);
    assert.equal(help.status, 0);
    assert.match(help.stdout, /Usage/);
    const version = run(['version']);
    assert.equal(version.status, 0);
    assert.match(version.stdout, /1\.0\.0/);
  });
});
