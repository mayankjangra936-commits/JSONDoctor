import JSONDoctor from '../src/index.js';

const compact = '{"user":{"name":"John","active":true},"scores":[10,20,30]}';
console.log(JSONDoctor.format(compact, { indent: 2 }));
console.log(JSONDoctor.minify(`{\n  "name": "John",\n  "age": 22\n}`));
