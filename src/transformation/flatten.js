import { MaxDepthExceededError, TransformationConflictError } from '../errors/index.js';
import { coerceToJsonValue } from '../utils/input.js';
import { jsonType, safeSet } from '../utils/objects.js';
import { serializeFlatPath } from './path-codec.js';

/**
 * Flatten nested JSON into a single-level path map.
 * Array indices use [n]; object keys use the configured separator (default ".").
 * Keys containing separator or bracket characters are backslash-escaped.
 *
 * @param {unknown} data
 * @param {{ separator?: string, maxDepth?: number }} [options]
 * @returns {Record<string, unknown>}
 */
export function flatten(data, options = {}) {
  const separator = options.separator ?? '.';
  const maxDepth = options.maxDepth ?? 64;
  if (typeof separator !== 'string' || separator.length === 0) {
    throw new TransformationConflictError('separator must be a non-empty string');
  }

  const value = coerceToJsonValue(data, { maxDepth });
  const result = Object.create(null);
  const stack = [{ value, parts: [], depth: 0 }];

  while (stack.length > 0) {
    const current = stack.pop();
    if (current.depth > maxDepth) {
      throw new MaxDepthExceededError(`Maximum flatten depth of ${maxDepth} exceeded`, {
        details: { maxDepth }
      });
    }

    const type = jsonType(current.value);
    if (type === 'array') {
      if (current.value.length === 0) {
        assign(result, current.parts, separator, current.value);
        continue;
      }
      for (let i = current.value.length - 1; i >= 0; i -= 1) {
        stack.push({
          value: current.value[i],
          parts: [...current.parts, { type: 'index', value: i }],
          depth: current.depth + 1
        });
      }
      continue;
    }

    if (type === 'object') {
      const keys = Object.keys(current.value);
      if (keys.length === 0) {
        assign(result, current.parts, separator, current.value);
        continue;
      }
      for (let i = keys.length - 1; i >= 0; i -= 1) {
        const key = keys[i];
        stack.push({
          value: current.value[key],
          parts: [...current.parts, { type: 'key', value: key }],
          depth: current.depth + 1
        });
      }
      continue;
    }

    assign(result, current.parts, separator, current.value);
  }

  return result;
}

function assign(result, parts, separator, value) {
  const path = parts.length === 0 ? '' : serializeFlatPath(parts, separator);
  if (Object.prototype.hasOwnProperty.call(result, path)) {
    throw new TransformationConflictError(`Flatten path collision at "${path}"`, {
      details: { path }
    });
  }
  safeSet(result, path, value);
}
