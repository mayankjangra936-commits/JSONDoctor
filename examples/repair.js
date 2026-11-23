import JSONDoctor from '../src/index.js';

const broken = `{name:'John', city: 'Delhi',}`;
console.log(JSONDoctor.diagnose(broken));
console.log(JSONDoctor.repair(broken));
