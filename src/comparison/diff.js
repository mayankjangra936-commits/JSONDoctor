import { compare } from './compare.js';

/**
 * Developer-friendly diff built on the comparison engine.
 * @param {unknown} oldData
 * @param {unknown} newData
 * @param {object} [options]
 */
export function diff(oldData, newData, options = {}) {
  const comparison = compare(oldData, newData, options);
  const changes = [];

  for (const item of comparison.removed) {
    changes.push({ type: 'removed', path: item.path, before: item.value });
  }
  for (const item of comparison.added) {
    changes.push({ type: 'added', path: item.path, value: item.value });
  }
  for (const item of comparison.modified) {
    changes.push({
      type: 'modified',
      path: item.path,
      before: item.oldValue,
      after: item.newValue,
      ...(item.oldType ? { oldType: item.oldType, newType: item.newType } : {})
    });
  }

  changes.sort((a, b) => a.path.localeCompare(b.path));

  const unchanged = options.includeUnchanged === false ? [] : comparison.unchanged.map((path) => ({
    type: 'unchanged',
    path
  }));

  return {
    equal: comparison.equal,
    changes,
    unchanged,
    summary: {
      added: comparison.summary.added,
      removed: comparison.summary.removed,
      modified: comparison.summary.modified,
      unchanged: comparison.summary.unchanged,
      total: comparison.summary.added + comparison.summary.removed + comparison.summary.modified
    }
  };
}
