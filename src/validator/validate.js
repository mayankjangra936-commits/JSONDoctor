import { InvalidInputTypeError } from '../errors/index.js';
import { extractParseLocation } from '../utils/location.js';

/**
 * Validate a JSON string using JSON.parse as the authoritative parser.
 * @param {unknown} input
 * @returns {{ valid: boolean, error: object|null, data: unknown|null }}
 */
export function validate(input) {
  if (typeof input !== 'string') {
    throw new InvalidInputTypeError('validate() requires a JSON string');
  }

  if (input.length === 0) {
    return invalidResult('Empty input is not valid JSON', 1, 1, 0);
  }

  if (input.trim().length === 0) {
    return invalidResult('Whitespace-only input is not valid JSON', 1, 1, 0);
  }

  try {
    const data = JSON.parse(input);
    return { valid: true, error: null, data };
  } catch (error) {
    const loc = extractParseLocation(error, input);
    return {
      valid: false,
      error: {
        message: loc.message,
        line: loc.line,
        column: loc.column,
        position: loc.position,
        rawMessage: loc.rawMessage
      },
      data: null
    };
  }
}

function invalidResult(message, line, column, position) {
  return {
    valid: false,
    error: { message, line, column, position, rawMessage: message },
    data: null
  };
}
