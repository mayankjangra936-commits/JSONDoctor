import { InvalidInputTypeError, InvalidJsonError } from '../errors/index.js';
import { assertJsonValue, isPlainObject, jsonType } from './objects.js';
import { validate } from '../validator/validate.js';

export function requireString(input, name = 'input') {
  if (typeof input !== 'string') {
    throw new InvalidInputTypeError(`${name} must be a string`);
  }
  return input;
}

function looksLikeJsonDocument(text) {
  const trimmed = text.trim();
  if (!trimmed) return true;
  const ch = trimmed[0];
  return (
    ch === '{' ||
    ch === '[' ||
    ch === '"' ||
    ch === 't' ||
    ch === 'f' ||
    ch === 'n' ||
    ch === '-' ||
    (ch >= '0' && ch <= '9')
  );
}

export function coerceToJsonValue(input, options = {}) {
  const maxDepth = options.maxDepth ?? 64;
  const parseStrings = options.parseStrings ?? 'auto';
  if (typeof input === 'string') {
    if (parseStrings === false) {
      return input;
    }
    if (parseStrings === 'auto' && !looksLikeJsonDocument(input)) {
      return input;
    }
    const result = validate(input);
    if (!result.valid) {
      throw new InvalidJsonError(result.error.message, result.error);
    }
    return result.data;
  }

  const type = jsonType(input);
  if (type === 'unsupported' && !isPlainObject(input) && !Array.isArray(input)) {
    throw new InvalidInputTypeError(
      'Expected a JSON string or JSON-compatible value (object, array, string, number, boolean, or null)'
    );
  }

  assertJsonValue(input, '$', new WeakSet(), 0, maxDepth);
  return input;
}
