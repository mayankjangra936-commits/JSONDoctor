import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import JSONDoctor from '../../src/index.js';

describe('get', () => {
  const data = {
    user: { profile: { email: 'john@example.com' }, name: 'John' },
    users: [{ email: 'a@x.com' }, { email: 'b@x.com' }],
    products: [{}, {}, { price: 9 }]
  };

  it('reads the root', () => {
    assert.deepEqual(JSONDoctor.get(data, '$'), data);
  });

  it('supports dot notation', () => {
    assert.equal(JSONDoctor.get(data, '$.user.name'), 'John');
    assert.equal(JSONDoctor.get(data, '$.user.profile.email'), 'john@example.com');
  });

  it('supports array indices', () => {
    assert.equal(JSONDoctor.get(data, '$.users[0].email'), 'a@x.com');
    assert.equal(JSONDoctor.get(data, '$.products[2].price'), 9);
  });

  it('supports bracket notation', () => {
    assert.equal(JSONDoctor.get(data, `$['user']['name']`), 'John');
  });

  it('returns undefined for missing paths', () => {
    assert.equal(JSONDoctor.get(data, '$.user.missing'), undefined);
  });

  it('supports wildcards', () => {
    assert.deepEqual(JSONDoctor.get(data, '$.users[*].email'), ['a@x.com', 'b@x.com']);
  });

  it('rejects invalid paths', () => {
    assert.throws(() => JSONDoctor.get(data, 'user.name'), /must start with "\$"/);
  });
});
