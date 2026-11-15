import { InvalidInputTypeError } from '../errors/index.js';
import { extractParseLocation } from '../utils/location.js';
import { scanIssues } from './scan.js';

/**
 * Diagnose common JSON mistakes without modifying input.
 * Diagnostics are not repairs.
 *
 * @param {unknown} input
 */
export function diagnose(input) {
  if (typeof input !== 'string') {
    throw new InvalidInputTypeError('diagnose() requires a JSON string');
  }

  const original = input;
  if (original.trim() === '') {
    return {
      valid: false,
      issues: [
        {
          code: 'EMPTY_INPUT',
          message: original.length === 0 ? 'Empty input is not valid JSON' : 'Whitespace-only input is not valid JSON',
          line: 1,
          column: 1,
          position: 0,
          safeToRepair: false
        }
      ],
      parseError: null
    };
  }

  try {
    JSON.parse(original);
    return { valid: true, issues: [], parseError: null };
  } catch (error) {
    const loc = extractParseLocation(error, original);
    const scanned = scanIssues(original);
    const parseError = {
      code: 'PARSE_ERROR',
      message: loc.message,
      line: loc.line,
      column: loc.column,
      position: loc.position,
      safeToRepair: false,
      rawMessage: loc.rawMessage
    };

    const issues = [parseError, ...scanned.issues.filter((issue) => issue.code !== 'PARSE_ERROR')];
    const unique = [];
    const seen = new Set();
    for (const issue of issues) {
      const key = `${issue.code}:${issue.position}:${issue.message}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(issue);
    }

    return {
      valid: false,
      issues: unique,
      parseError,
      canSafelyRepair: unique.some((issue) => issue.safeToRepair) && unique.every((issue) => issue.safeToRepair || issue.code === 'PARSE_ERROR')
    };
  }
}
