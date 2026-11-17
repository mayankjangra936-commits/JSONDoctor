import { MaxDepthExceededError } from '../errors/index.js';
import { coerceToJsonValue } from '../utils/input.js';
import { appendIndexPath, appendObjectPath, jsonType, ownKeys } from '../utils/objects.js';

/**
 * Structural statistics for a JSON value.
 * Counts are recursive. totalKeys is the number of object properties at all levels.
 *
 * @param {unknown} data
 * @param {{ maxDepth?: number }} [options]
 */
export function stats(data, options = {}) {
  const maxDepth = options.maxDepth ?? 64;
  const value = coerceToJsonValue(data, { maxDepth });
  const counters = {
    totalKeys: 0,
    totalObjects: 0,
    totalArrays: 0,
    totalArrayItems: 0,
    totalStrings: 0,
    totalNumbers: 0,
    totalBooleans: 0,
    totalNulls: 0,
    emptyObjects: 0,
    emptyArrays: 0,
    maxDepth: 1,
    largest: []
  };

  visit(value, '$', 1, maxDepth, counters);

  let sizeBytes = 0;
  try {
    sizeBytes = Buffer.byteLength(JSON.stringify(value), 'utf8');
  } catch {
    sizeBytes = 0;
  }

  counters.largest.sort((a, b) => b.sizeBytes - a.sizeBytes);

  return {
    totalKeys: counters.totalKeys,
    totalObjects: counters.totalObjects,
    totalArrays: counters.totalArrays,
    totalArrayItems: counters.totalArrayItems,
    totalStrings: counters.totalStrings,
    totalNumbers: counters.totalNumbers,
    totalBooleans: counters.totalBooleans,
    totalNulls: counters.totalNulls,
    emptyObjects: counters.emptyObjects,
    emptyArrays: counters.emptyArrays,
    maxDepth: counters.maxDepth,
    sizeBytes,
    largestNested: counters.largest.slice(0, 5)
  };
}

function visit(value, path, depth, maxDepth, counters) {
  if (depth > maxDepth) {
    throw new MaxDepthExceededError(`Maximum stats depth of ${maxDepth} exceeded at ${path}`);
  }
  counters.maxDepth = Math.max(counters.maxDepth, depth);
  const type = jsonType(value);

  if (type === 'string') {
    counters.totalStrings += 1;
    return;
  }
  if (type === 'number') {
    counters.totalNumbers += 1;
    return;
  }
  if (type === 'boolean') {
    counters.totalBooleans += 1;
    return;
  }
  if (type === 'null') {
    counters.totalNulls += 1;
    return;
  }

  if (type === 'array') {
    counters.totalArrays += 1;
    counters.totalArrayItems += value.length;
    if (value.length === 0) counters.emptyArrays += 1;
    recordLargest(counters, path, value);
    for (let i = 0; i < value.length; i += 1) {
      visit(value[i], appendIndexPath(path, i), depth + 1, maxDepth, counters);
    }
    return;
  }

  counters.totalObjects += 1;
  const keys = ownKeys(value);
  counters.totalKeys += keys.length;
  if (keys.length === 0) counters.emptyObjects += 1;
  recordLargest(counters, path, value);
  for (const key of keys) {
    visit(value[key], appendObjectPath(path, key), depth + 1, maxDepth, counters);
  }
}

function recordLargest(counters, path, value) {
  let sizeBytes = 0;
  try {
    sizeBytes = Buffer.byteLength(JSON.stringify(value), 'utf8');
  } catch {
    return;
  }
  counters.largest.push({ path, sizeBytes, type: Array.isArray(value) ? 'array' : 'object' });
}
