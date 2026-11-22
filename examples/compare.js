import JSONDoctor from '../src/index.js';

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

console.log(JSON.stringify(JSONDoctor.compare(oldData, newData), null, 2));
console.log(JSON.stringify(JSONDoctor.diff(oldData, newData), null, 2));
