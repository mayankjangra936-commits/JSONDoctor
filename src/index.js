import { compare } from './comparison/compare.js';
import { diff } from './comparison/diff.js';
import * as errors from './errors/index.js';
import { format } from './formatter/format.js';
import { minify } from './formatter/minify.js';
import { get } from './query/get.js';
import { diagnose } from './repair/diagnose.js';
import { repair } from './repair/repair.js';
import { validateSchema } from './schema/validateSchema.js';
import { stats } from './statistics/stats.js';
import { flatten } from './transformation/flatten.js';
import { unflatten } from './transformation/unflatten.js';
import { validate } from './validator/validate.js';
import { PRODUCT_NAME, VERSION } from './version.js';

const JSONDoctor = {
  version: VERSION,
  name: PRODUCT_NAME,
  validate,
  format,
  minify,
  compare,
  diff,
  diagnose,
  repair,
  flatten,
  unflatten,
  get,
  validateSchema,
  stats,
  errors
};

export {
  VERSION,
  compare,
  diagnose,
  diff,
  errors,
  flatten,
  format,
  get,
  minify,
  repair,
  stats,
  unflatten,
  validate,
  validateSchema
};

export default JSONDoctor;
