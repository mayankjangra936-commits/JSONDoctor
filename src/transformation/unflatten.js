import { TransformationConflictError } from '../errors/index.js';
import { InvalidInputTypeError } from '../errors/index.js';
import { isPlainObject, jsonType, safeSet } from '../utils/objects.js';
import { tokenizeFlatPath } from './path-codec.js';

/**
 * Reconstruct nested JSON from a flattened path map.
 * Conflicting paths throw TransformationConflictError instead of overwriting.
 *
 * @param {Record<string, unknown>} flatData
 * @param {{ separator?: string }} [options]
 */
export function unflatten(flatData, options = {}) {
  const separator = options.separator ?? '.';
  if (!isPlainObject(flatData) && jsonType(flatData) !== 'object') {
    if (flatData == null || typeof flatData !== 'object' || Array.isArray(flatData)) {
      throw new InvalidInputTypeError('unflatten() requires a flat object');
    }
  }

  const entries = Object.keys(flatData);
  if (entries.length === 1 && entries[0] === '') {
    return flatData[''];
  }

  const rootBox = { value: undefined };

  for (const path of entries) {
    const tokens = path === '' ? [{ type: 'key', value: '' }] : tokenizeFlatPath(path, separator);
    if (tokens.length === 0) {
      throw new TransformationConflictError('Cannot unflatten an empty path alongside other keys');
    }
    assignPath(rootBox, tokens, flatData[path]);
  }

  if (rootBox.value === undefined) {
    return {};
  }
  return rootBox.value;
}

function assignPath(rootBox, tokens, value) {
  if (rootBox.value === undefined) {
    rootBox.value = tokens[0].type === 'index' ? [] : {};
  }

  let current = rootBox.value;
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    const last = i === tokens.length - 1;
    const next = tokens[i + 1];

    if (token.type === 'index') {
      if (!Array.isArray(current)) {
        throw new TransformationConflictError(
          `Path conflict: expected array for index ${token.value}`,
          { details: { token } }
        );
      }
      if (last) {
        if (Object.prototype.hasOwnProperty.call(current, token.value) && current[token.value] !== undefined) {
          throw new TransformationConflictError(`Cannot overwrite existing value at index ${token.value}`);
        }
        current[token.value] = value;
        return;
      }
      if (current[token.value] === undefined) {
        current[token.value] = next?.type === 'index' ? [] : {};
      } else if (next?.type === 'index' && !Array.isArray(current[token.value])) {
        throw new TransformationConflictError('Path conflict: array vs object');
      } else if (next?.type === 'key' && Array.isArray(current[token.value])) {
        throw new TransformationConflictError('Path conflict: object vs array');
      }
      current = current[token.value];
      continue;
    }

    if (typeof current !== 'object' || current === null || Array.isArray(current)) {
      throw new TransformationConflictError(`Path conflict: expected object for key "${token.value}"`);
    }

    if (last) {
      if (Object.prototype.hasOwnProperty.call(current, token.value)) {
        throw new TransformationConflictError(`Cannot overwrite existing value at key "${token.value}"`);
      }
      safeSet(current, token.value, value);
      return;
    }

    if (!Object.prototype.hasOwnProperty.call(current, token.value)) {
      safeSet(current, token.value, next?.type === 'index' ? [] : {});
    } else {
      const existing = current[token.value];
      if (next?.type === 'index' && !Array.isArray(existing)) {
        throw new TransformationConflictError(`Path conflict at "${token.value}": expected array`);
      }
      if (next?.type === 'key' && (existing === null || typeof existing !== 'object' || Array.isArray(existing))) {
        throw new TransformationConflictError(`Path conflict at "${token.value}": expected object`);
      }
    }
    current = current[token.value];
  }
}
