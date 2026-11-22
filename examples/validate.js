import JSONDoctor from '../src/index.js';

const valid = JSONDoctor.validate('{"name":"John","age":22}');
console.log('valid', valid);

const invalid = JSONDoctor.validate('{"name":"John",}');
console.log('invalid', invalid);
