import { InvalidPathError } from '../errors/index.js';
import { coerceToJsonValue } from '../utils/input.js';
import { parseJsonPath } from '../utils/paths.js';

/**
 * Extract a nested value using a documented JSONPath subset.
 * Missing paths return { found: false, value: undefined }.
 * Wildcard queries return { found: true, value: array }.
 *
 * @param {unknown} data
 * @param {string} path
 * @returns {unknown | { found: boolean, value: unknown, wildcard: boolean }}
 */
export function get(data, path, options = {}) {
  const json = coerceToJsonValue(data, { maxDepth: options.maxDepth });
  const segments = parseJsonPath(path);
  const wildcard = segments.some((segment) => segment.type === 'wildcard');
  const matches = [];
  collect(json, segments, 0, matches);

  if (options.structured) {
    return {
      found: wildcard ? true : matches.length > 0,
      wildcard,
      value: wildcard ? matches : matches[0],
      matches: wildcard ? matches : matches.slice(0, 1)
    };
  }

  if (wildcard) return matches;
  if (matches.length === 0) return undefined;
  return matches[0];
}

function collect(current, segments, index, matches) {
  if (index >= segments.length) {
    matches.push(current);
    return;
  }

  if (current === null || current === undefined) return;
  const segment = segments[index];

  if (segment.type === 'wildcard') {
    if (Array.isArray(current)) {
      for (const item of current) collect(item, segments, index + 1, matches);
      return;
    }
    if (typeof current === 'object') {
      for (const key of Object.keys(current)) {
        collect(current[key], segments, index + 1, matches);
      }
    }
    return;
  }

  if (segment.type === 'index') {
    if (!Array.isArray(current)) return;
    if (segment.value < 0 || segment.value >= current.length) return;
    collect(current[segment.value], segments, index + 1, matches);
    return;
  }

  if (typeof current !== 'object' || Array.isArray(current)) {
    if (Array.isArray(current)) return;
    return;
  }
  if (!Object.prototype.hasOwnProperty.call(current, segment.value)) return;
  collect(current[segment.value], segments, index + 1, matches);
}

export function assertPath(path) {
  if (typeof path !== 'string') {
    throw new InvalidPathError('JSON path must be a string');
  }
  return parseJsonPath(path);
}
