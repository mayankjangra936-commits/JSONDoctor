import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import JSONDoctor from '../../src/index.js';

describe('diagnose and repair', () => {
  it('diagnoses trailing commas', () => {
    const result = JSONDoctor.diagnose('{"name":"John",}');
    assert.equal(result.valid, false);
    assert.ok(result.issues.some((issue) => issue.code === 'TRAILING_COMMA' && issue.safeToRepair));
  });

  it('repairs trailing commas', () => {
    const result = JSONDoctor.repair('{"name":"John",}');
    assert.equal(result.success, true);
    assert.equal(JSON.parse(result.repaired).name, 'John');
    assert.ok(result.changes.some((change) => change.type === 'trailing-comma'));
  });

  it('repairs unquoted keys', () => {
    const result = JSONDoctor.repair('{name:"John",age:22}');
    assert.equal(result.success, true);
    assert.deepEqual(JSON.parse(result.repaired), { name: 'John', age: 22 });
  });

  it('repairs single-quoted strings', () => {
    const result = JSONDoctor.repair("{'name':'John'}");
    assert.equal(result.success, true);
    assert.deepEqual(JSON.parse(result.repaired), { name: 'John' });
  });

  it('does not invent values for ambiguous input', () => {
    const result = JSONDoctor.repair('{"name":');
    assert.equal(result.success, false);
    assert.equal(result.repaired, null);
    assert.ok(result.error.message);
  });

  it('does not claim a diagnostic is a repair', () => {
    const diagnosed = JSONDoctor.diagnose('{"name":');
    assert.equal(diagnosed.valid, false);
    assert.equal(Object.hasOwn(diagnosed, 'repaired'), false);
  });

  it('leaves valid JSON unchanged', () => {
    const result = JSONDoctor.repair('{"ok":true}');
    assert.equal(result.success, true);
    assert.equal(result.repaired, '{"ok":true}');
  });
});
