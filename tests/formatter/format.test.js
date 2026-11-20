import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import JSONDoctor from '../../src/index.js';

describe('format and minify', () => {
  it('pretty-prints compact JSON with two-space indent', () => {
    const input = '{"user":{"name":"John","active":true},"scores":[10,20,30]}';
    const output = JSONDoctor.format(input);
    assert.equal(
      output,
      `{
  "user": {
    "name": "John",
    "active": true
  },
  "scores": [
    10,
    20,
    30
  ]
}`
    );
  });

  it('supports four-space indentation', () => {
    const output = JSONDoctor.format('{"a":1}', { indent: 4 });
    assert.equal(output, '{\n    "a": 1\n}');
  });

  it('formats parsed objects', () => {
    assert.equal(JSONDoctor.format({ a: { b: 1 } }, { indent: 2 }), '{\n  "a": {\n    "b": 1\n  }\n}');
  });

  it('formats empty objects and arrays', () => {
    assert.equal(JSONDoctor.format({}), '{}');
    assert.equal(JSONDoctor.format([]), '[]');
  });

  it('throws on invalid JSON', () => {
    assert.throws(() => JSONDoctor.format('{"a":}'), /valid JSON|Expected|Unexpected/i);
  });

  it('minifies JSON', () => {
    const output = JSONDoctor.minify('{\n  "name": "John",\n  "age": 22\n}');
    assert.equal(output, '{"name":"John","age":22}');
  });

  it('minifies objects', () => {
    assert.equal(JSONDoctor.minify({ name: 'John' }), '{"name":"John"}');
  });
});
