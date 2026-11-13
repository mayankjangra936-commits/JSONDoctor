import { InvalidInputTypeError } from '../errors/index.js';
import { coerceToJsonValue } from '../utils/input.js';

/**
 * Pretty-print JSON.
 * @param {string|object} input JSON string or JSON-compatible value
 * @param {{ indent?: number|string, trailingNewline?: boolean, maxDepth?: number }} [options]
 * @returns {string}
 */
export function format(input, options = {}) {
  const indent = options.indent === undefined ? 2 : options.indent;
  if (typeof indent !== 'number' && typeof indent !== 'string') {
    throw new InvalidInputTypeError('indent must be a number or string');
  }
  if (typeof indent === 'number' && (!Number.isInteger(indent) || indent < 0 || indent > 10)) {
    throw new InvalidInputTypeError('numeric indent must be an integer between 0 and 10');
  }

  const data = coerceToJsonValue(input, { maxDepth: options.maxDepth, parseStrings: true });
  const text = JSON.stringify(data, null, indent);
  return options.trailingNewline ? `${text}\n` : text;
}
