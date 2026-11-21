import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import JSONDoctor from '../../src/index.js';

describe('flatten and unflatten', () => {
  const sample = {
    user: { profile: { name: 'John', age: 22 } },
    active: true
  };

  it('flattens nested objects', () => {
    const flat = JSONDoctor.flatten(sample);
    assert.equal(flat['user.profile.name'], 'John');
    assert.equal(flat['user.profile.age'], 22);
    assert.equal(flat.active, true);
  });

  it('round-trips nested objects', () => {
    const restored = JSONDoctor.unflatten(JSONDoctor.flatten(sample));
    assert.deepEqual(restored, sample);
  });

  it('handles arrays', () => {
    const data = { users: [{ name: 'A' }, { name: 'B' }] };
    const flat = JSONDoctor.flatten(data);
    assert.equal(flat['users[0].name'], 'A');
    assert.equal(flat['users[1].name'], 'B');
    assert.deepEqual(JSONDoctor.unflatten(flat), data);
  });

  it('preserves empty objects and arrays', () => {
    const data = { emptyObj: {}, emptyArr: [], keep: 1 };
    assert.deepEqual(JSONDoctor.unflatten(JSONDoctor.flatten(data)), data);
  });

  it('supports custom separators', () => {
    const flat = JSONDoctor.flatten(sample, { separator: '/' });
    assert.equal(flat['user/profile/name'], 'John');
    assert.deepEqual(JSONDoctor.unflatten(flat, { separator: '/' }), sample);
  });

  it('escapes keys containing the separator', () => {
    const data = { 'user.name': { city: 'Delhi' } };
    const flat = JSONDoctor.flatten(data);
    assert.equal(flat['user\\.name.city'], 'Delhi');
    assert.deepEqual(JSONDoctor.unflatten(flat), data);
  });

  it('handles null leaves', () => {
    const data = { a: null };
    assert.deepEqual(JSONDoctor.unflatten(JSONDoctor.flatten(data)), data);
  });

  it('detects unflatten collisions', () => {
    assert.throws(
      () => JSONDoctor.unflatten({ a: 1, 'a.b': 2 }),
      /conflict|overwrite/i
    );
  });

  it('does not pollute Object.prototype', () => {
    const flat = JSONDoctor.flatten({ ['__proto__']: { polluted: true } });
    JSONDoctor.unflatten(flat);
    assert.equal(Object.prototype.polluted, undefined);
  });
});
