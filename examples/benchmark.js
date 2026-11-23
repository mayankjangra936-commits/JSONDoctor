import { performance } from 'node:perf_hooks';
import JSONDoctor from '../src/index.js';

function sample(n = 200) {
  const users = [];
  for (let i = 0; i < n; i += 1) {
    users.push({
      id: i,
      name: `user-${i}`,
      nested: { city: i % 2 ? 'Delhi' : 'Mumbai', tags: ['a', 'b', i] }
    });
  }
  return { users, generated: true };
}

const a = sample();
const b = sample();
b.users[10].name = 'changed';
b.users.push({ id: 999, name: 'new', nested: { city: 'Pune', tags: [] } });

const ops = {
  format: () => JSONDoctor.format(a),
  compare: () => JSONDoctor.compare(a, b),
  flatten: () => JSONDoctor.flatten(a),
  stats: () => JSONDoctor.stats(a)
};

for (const [name, fn] of Object.entries(ops)) {
  const start = performance.now();
  fn();
  console.log(`${name}: ${(performance.now() - start).toFixed(2)} ms`);
}
