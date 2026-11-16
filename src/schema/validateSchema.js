import Ajv from 'ajv';
import { InvalidSchemaError } from '../errors/index.js';
import { coerceToJsonValue } from '../utils/input.js';
import { isPlainObject } from '../utils/objects.js';

/**
 * Validate data against JSON Schema draft-07 (Ajv).
 * Syntax validation is separate: this function accepts already-parsed data.
 *
 * @param {unknown} data
 * @param {object|boolean} schema
 */
export function validateSchema(data, schema, options = {}) {
  if (typeof schema !== 'boolean' && !isPlainObject(schema)) {
    throw new InvalidSchemaError('schema must be a JSON Schema object or boolean');
  }

  const json = options.parseData === true ? coerceToJsonValue(data) : data;

  let validate;
  try {
    const ajv = new Ajv({
      allErrors: true,
      strict: false,
      validateSchema: true,
      addUsedSchema: false
    });
    validate = ajv.compile(schema);
  } catch (error) {
    throw new InvalidSchemaError(error.message, { details: { cause: error.message } });
  }

  const valid = validate(json) === true;
  const errors = (validate.errors || []).map((err) => ({
    path: pointerToJsonPath(err.instancePath),
    jsonPointer: err.instancePath || '',
    message: err.message,
    keyword: err.keyword,
    params: err.params,
    schemaPath: err.schemaPath
  }));

  return {
    valid,
    schemaDraft: 'draft-07',
    errors
  };
}

function pointerToJsonPath(pointer) {
  if (!pointer) return '$';
  const parts = pointer.split('/').slice(1).map(decodePointer);
  let path = '$';
  for (const part of parts) {
    if (/^\d+$/.test(part)) {
      path += `[${part}]`;
    } else if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(part)) {
      path += `.${part}`;
    } else {
      path += `[${JSON.stringify(part)}]`;
    }
  }
  return path;
}

function decodePointer(part) {
  return part.replace(/~1/g, '/').replace(/~0/g, '~');
}
