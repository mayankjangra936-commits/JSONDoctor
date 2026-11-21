import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import JSONDoctor from '../../src/index.js';

describe('stats', () => {
  it('counts nested structures', () => {
    const result = JSONDoctor.stats({
      a: { b: 'x', c: 1 },
      flag: true,
      empty: {},
      list: [null, 2],
      nothing: null
    });
    assert.equal(result.totalObjects, 3);
    assert.equal(result.totalArrays, 1);
    assert.equal(result.totalArrayItems, 2);
    assert.equal(result.totalStrings, 1);
    assert.equal(result.totalNumbers, 2);
    assert.equal(result.totalBooleans, 1);
    assert.equal(result.totalNulls, 2);
    assert.equal(result.emptyObjects, 1);
    assert.ok(result.maxDepth >= 3);
    assert.ok(result.sizeBytes > 0);
  });

  it('handles primitives', () => {
    const result = JSONDoctor.stats('hello');
    assert.equal(result.totalStrings, 1);
    assert.equal(result.maxDepth, 1);
  });

  it('handles empty arrays', () => {
    const result = JSONDoctor.stats([]);
    assert.equal(result.totalArrays, 1);
    assert.equal(result.emptyArrays, 1);
  });
});
