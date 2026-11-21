import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import JSONDoctor from '../../src/index.js';

const schema = {
  type: 'object',
  required: ['name', 'age'],
  properties: {
    name: { type: 'string' },
    age: { type: 'number', minimum: 18 },
    tags: { type: 'array', items: { type: 'string' } },
    nested: {
      type: 'object',
      required: ['ok'],
      properties: { ok: { type: 'boolean' } }
    },
    color: { enum: ['red', 'blue'] }
  },
  additionalProperties: false
};

describe('validateSchema', () => {
  it('accepts valid data', () => {
    const result = JSONDoctor.validateSchema({ name: 'John', age: 22 }, schema);
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });

  it('reports missing required fields', () => {
    const result = JSONDoctor.validateSchema({ name: 'John' }, schema);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((err) => err.keyword === 'required'));
  });

  it('reports incorrect types', () => {
    const result = JSONDoctor.validateSchema({ name: 1, age: 22 }, schema);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((err) => err.keyword === 'type'));
  });

  it('reports numeric boundaries', () => {
    const result = JSONDoctor.validateSchema({ name: 'John', age: 16 }, schema);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((err) => err.keyword === 'minimum'));
    assert.ok(result.errors.some((err) => err.path === '$.age'));
  });

  it('validates nested objects and enums', () => {
    const result = JSONDoctor.validateSchema(
      { name: 'John', age: 22, nested: { ok: 'no' }, color: 'green' },
      schema
    );
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((err) => err.path === '$.nested.ok' || err.keyword === 'type'));
  });

  it('rejects invalid schemas', () => {
    assert.throws(() => JSONDoctor.validateSchema({}, 'not-a-schema'), /schema/i);
  });
});
