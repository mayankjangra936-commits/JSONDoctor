import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import JSONDoctor from '../../src/index.js';

describe('validate', () => {
  it('accepts a valid object', () => {
    const result = JSONDoctor.validate('{"name":"John","age":22}');
    assert.equal(result.valid, true);
    assert.equal(result.error, null);
    assert.deepEqual(result.data, { name: 'John', age: 22 });
  });

  it('accepts a valid array', () => {
    const result = JSONDoctor.validate('[1,2,3]');
    assert.equal(result.valid, true);
    assert.deepEqual(result.data, [1, 2, 3]);
  });

  it('detects trailing commas with line and column', () => {
    const result = JSONDoctor.validate('{"name":"John",}');
    assert.equal(result.valid, false);
    assert.equal(typeof result.error.message, 'string');
    assert.ok(result.error.message.length > 0);
    assert.equal(result.error.line, 1);
    assert.ok(result.error.column >= 1);
  });

  it('rejects empty strings', () => {
    const result = JSONDoctor.validate('');
    assert.equal(result.valid, false);
    assert.match(result.error.message, /empty/i);
  });

  it('rejects whitespace-only input', () => {
    const result = JSONDoctor.validate('  \n\t  ');
    assert.equal(result.valid, false);
    assert.match(result.error.message, /whitespace/i);
  });

  it('handles malformed arrays', () => {
    const result = JSONDoctor.validate('[1,2,]');
    assert.equal(result.valid, false);
    assert.ok(result.error.line);
  });

  it('handles malformed objects', () => {
    const result = JSONDoctor.validate('{name:1}');
    assert.equal(result.valid, false);
  });

  it('handles invalid escapes', () => {
    const result = JSONDoctor.validate('{"a":"\\z"}');
    assert.equal(result.valid, false);
  });

  it('handles escaped strings correctly', () => {
    const result = JSONDoctor.validate('{"a":"line\\nnext\\"quote"}');
    assert.equal(result.valid, true);
    assert.equal(result.data.a, 'line\nnext"quote');
  });

  it('reports multiline column information', () => {
    const result = JSONDoctor.validate('{\n  "name": "John",\n}');
    assert.equal(result.valid, false);
    assert.equal(result.error.line, 3);
  });

  it('rejects non-string input', () => {
    assert.throws(() => JSONDoctor.validate({ a: 1 }), /JSON string/);
  });
});
