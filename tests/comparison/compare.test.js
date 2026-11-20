import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import JSONDoctor from '../../src/index.js';

describe('compare and diff', () => {
  const oldData = {
    name: 'John',
    age: 22,
    address: { city: 'Delhi', country: 'India' }
  };
  const newData = {
    name: 'John',
    age: 23,
    address: { city: 'Mumbai', country: 'India' },
    active: true
  };

  it('reports nested additions and modifications', () => {
    const result = JSONDoctor.compare(oldData, newData);
    assert.equal(result.equal, false);
    assert.deepEqual(result.added, [{ path: '$.active', value: true }]);
    assert.deepEqual(result.removed, []);
    const modifiedPaths = result.modified.map((item) => item.path).sort();
    assert.deepEqual(modifiedPaths, ['$.address.city', '$.age']);
    assert.ok(result.unchanged.includes('$.name'));
    assert.ok(result.unchanged.includes('$.address.country'));
  });

  it('treats identical objects as equal', () => {
    const result = JSONDoctor.compare(oldData, oldData);
    assert.equal(result.equal, true);
    assert.equal(result.summary.added, 0);
  });

  it('detects removed properties', () => {
    const result = JSONDoctor.compare({ a: 1, b: 2 }, { a: 1 });
    assert.deepEqual(result.removed, [{ path: '$.b', value: 2 }]);
  });

  it('compares arrays by index', () => {
    const result = JSONDoctor.compare(
      [{ id: 1 }, { id: 2 }],
      [{ id: 1 }, { id: 3 }, { id: 4 }]
    );
    assert.equal(result.modified.some((item) => item.path === '$[1].id'), true);
    assert.equal(result.added.some((item) => item.path === '$[2]'), true);
  });

  it('does not treat reordered arrays as equal', () => {
    const result = JSONDoctor.compare([1, 2], [2, 1]);
    assert.equal(result.equal, false);
  });

  it('handles null and type changes', () => {
    const result = JSONDoctor.compare({ a: null }, { a: 0 });
    assert.equal(result.modified[0].path, '$.a');
  });

  it('ignores selected keys', () => {
    const result = JSONDoctor.compare({ a: 1, secret: 'x' }, { a: 1, secret: 'y' }, { ignoreKeys: ['secret'] });
    assert.equal(result.equal, true);
  });

  it('ignores selected paths', () => {
    const result = JSONDoctor.compare(
      { meta: { a: 1 }, keep: 1 },
      { meta: { a: 2 }, keep: 1 },
      { ignorePaths: ['$.meta.*'] }
    );
    assert.equal(result.equal, true);
  });

  it('produces a consistent diff summary', () => {
    const result = JSONDoctor.diff(oldData, newData);
    assert.equal(result.summary.added, 1);
    assert.equal(result.summary.modified, 2);
    assert.ok(result.changes.some((change) => change.type === 'added' && change.path === '$.active'));
  });
});
