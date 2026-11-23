import JSONDoctor from '../src/index.js';

console.log('JSONDoctor complete demonstration\n');

console.log('1. Invalid JSON with line/column');
console.log(JSONDoctor.validate('{"name":"John",}'));

console.log('\n2. Nested comparison');
console.log(
  JSONDoctor.compare(
    { name: 'John', age: 22, address: { city: 'Delhi', country: 'India' } },
    { name: 'John', age: 23, address: { city: 'Mumbai', country: 'India' }, active: true }
  )
);

console.log('\n3. Flatten / unflatten');
const nested = { user: { profile: { name: 'John', age: 22 } }, active: true };
const flat = JSONDoctor.flatten(nested);
const restored = JSONDoctor.unflatten(flat);
console.log({ flat, restored, roundTrip: JSON.stringify(nested) === JSON.stringify(restored) });

console.log('\n4. Schema validation');
console.log(
  JSONDoctor.validateSchema(
    { name: 'John', age: 16 },
    {
      type: 'object',
      required: ['name', 'age'],
      properties: {
        name: { type: 'string' },
        age: { type: 'number', minimum: 18 }
      }
    }
  )
);

console.log('\n5. Query, stats, repair');
console.log(JSONDoctor.get({ user: { profile: { email: 'john@example.com' } } }, '$.user.profile.email'));
console.log(JSONDoctor.stats(nested));
console.log(JSONDoctor.repair("{name:'Ada',}"));
