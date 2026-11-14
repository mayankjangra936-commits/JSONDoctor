import { MaxDepthExceededError } from '../errors/index.js';
import { coerceToJsonValue } from '../utils/input.js';
import { appendIndexPath, appendObjectPath, jsonType, ownKeys } from '../utils/objects.js';
import { pathMatchesPattern } from '../utils/paths.js';

/**
 * Recursively compare two JSON values.
 * @param {unknown} oldData
 * @param {unknown} newData
 * @param {object} [options]
 */
export function compare(oldData, newData, options = {}) {
  const opts = {
    caseSensitiveKeys: options.caseSensitiveKeys !== false,
    ignoreKeys: options.ignoreKeys || [],
    ignorePaths: options.ignorePaths || [],
    ignoreArrayOrder: Boolean(options.ignoreArrayOrder),
    includeUnchanged: options.includeUnchanged !== false,
    maxDepth: options.maxDepth ?? 64
  };

  const left = coerceToJsonValue(oldData, { maxDepth: opts.maxDepth });
  const right = coerceToJsonValue(newData, { maxDepth: opts.maxDepth });

  const added = [];
  const removed = [];
  const modified = [];
  const unchanged = [];

  walk('$', left, right, 0, opts, { added, removed, modified, unchanged });

  return {
    equal: added.length === 0 && removed.length === 0 && modified.length === 0,
    added,
    removed,
    modified,
    unchanged: opts.includeUnchanged ? unchanged : [],
    summary: {
      added: added.length,
      removed: removed.length,
      modified: modified.length,
      unchanged: unchanged.length
    }
  };
}

function walk(path, left, right, depth, opts, acc) {
  if (shouldIgnorePath(path, opts)) return;

  if (depth > opts.maxDepth) {
    throw new MaxDepthExceededError(`Maximum comparison depth of ${opts.maxDepth} exceeded at ${path}`, {
      details: { path, maxDepth: opts.maxDepth }
    });
  }

  const leftType = jsonType(left);
  const rightType = jsonType(right);

  if (leftType !== rightType) {
    acc.modified.push({ path, oldValue: left, newValue: right, oldType: leftType, newType: rightType });
    return;
  }

  if (leftType !== 'object' && leftType !== 'array') {
    if (Object.is(left, right) || (leftType === 'number' && left === right)) {
      acc.unchanged.push(path);
    } else {
      acc.modified.push({ path, oldValue: left, newValue: right });
    }
    return;
  }

  if (leftType === 'array') {
    compareArrays(path, left, right, depth, opts, acc);
    return;
  }

  compareObjects(path, left, right, depth, opts, acc);
}

function compareObjects(path, left, right, depth, opts, acc) {
  const leftKeys = mapKeys(ownKeys(left), opts);
  const rightKeys = mapKeys(ownKeys(right), opts);
  const all = new Set([...leftKeys.keys(), ...rightKeys.keys()]);

  for (const normalized of all) {
    const leftKey = leftKeys.get(normalized);
    const rightKey = rightKeys.get(normalized);
    const displayKey = rightKey ?? leftKey;
    if (shouldIgnoreKey(displayKey, opts) || shouldIgnoreKey(leftKey, opts) || shouldIgnoreKey(rightKey, opts)) {
      continue;
    }

    const childPath = appendObjectPath(path, displayKey);
    if (shouldIgnorePath(childPath, opts)) continue;

    const hasLeft = leftKey !== undefined && Object.prototype.hasOwnProperty.call(left, leftKey);
    const hasRight = rightKey !== undefined && Object.prototype.hasOwnProperty.call(right, rightKey);

    if (hasLeft && !hasRight) {
      acc.removed.push({ path: childPath, value: left[leftKey] });
      continue;
    }
    if (!hasLeft && hasRight) {
      acc.added.push({ path: childPath, value: right[rightKey] });
      continue;
    }
    walk(childPath, left[leftKey], right[rightKey], depth + 1, opts, acc);
  }
}

function compareArrays(path, left, right, depth, opts, acc) {
  if (opts.ignoreArrayOrder) {
    compareArraysUnordered(path, left, right, depth, opts, acc);
    return;
  }

  const max = Math.max(left.length, right.length);
  for (let i = 0; i < max; i += 1) {
    const childPath = appendIndexPath(path, i);
    if (shouldIgnorePath(childPath, opts)) continue;
    if (i >= left.length) {
      acc.added.push({ path: childPath, value: right[i] });
    } else if (i >= right.length) {
      acc.removed.push({ path: childPath, value: left[i] });
    } else {
      walk(childPath, left[i], right[i], depth + 1, opts, acc);
    }
  }
}

function compareArraysUnordered(path, left, right, depth, opts, acc) {
  const remainingRight = right.map((value, index) => ({ value, index, used: false }));
  left.forEach((leftValue, leftIndex) => {
    const match = remainingRight.find((item) => !item.used && deepEqual(item.value, leftValue));
    const childPath = appendIndexPath(path, leftIndex);
    if (match) {
      match.used = true;
      walk(childPath, leftValue, match.value, depth + 1, opts, acc);
    } else {
      acc.removed.push({ path: childPath, value: leftValue });
    }
  });
  remainingRight.forEach((item) => {
    if (!item.used) {
      acc.added.push({ path: appendIndexPath(path, item.index), value: item.value });
    }
  });
}

function deepEqual(a, b) {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

function mapKeys(keys, opts) {
  const map = new Map();
  for (const key of keys) {
    const normalized = opts.caseSensitiveKeys ? key : key.toLowerCase();
    if (!map.has(normalized)) map.set(normalized, key);
  }
  return map;
}

function shouldIgnoreKey(key, opts) {
  if (key == null) return false;
  if (opts.ignoreKeys.includes(key)) return true;
  if (!opts.caseSensitiveKeys) {
    return opts.ignoreKeys.some((ignored) => ignored.toLowerCase() === key.toLowerCase());
  }
  return false;
}

function shouldIgnorePath(path, opts) {
  return opts.ignorePaths.some((pattern) => pathMatchesPattern(path, pattern));
}
