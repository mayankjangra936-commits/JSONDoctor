import { coerceToJsonValue } from '../utils/input.js';

/**
 * Minify JSON by removing insignificant whitespace.
 * @param {string|object} input
 * @param {{ maxDepth?: number }} [options]
 * @returns {string}
 */
export function minify(input, options = {}) {
  const data = coerceToJsonValue(input, { maxDepth: options.maxDepth, parseStrings: true });
  return JSON.stringify(data);
}
