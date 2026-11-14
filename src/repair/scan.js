import { positionToLineColumn } from '../utils/location.js';

const IDENT_START = /[A-Za-z_]/;
const IDENT_PART = /[A-Za-z0-9_]/;

export function scanIssues(source) {
  const issues = [];
  let i = 0;
  let brace = 0;
  let bracket = 0;
  let expectKey = true;
  let stack = [];

  const pushIssue = (code, message, index, extra = {}) => {
    const loc = positionToLineColumn(source, index);
    issues.push({
      code,
      message,
      line: loc.line,
      column: loc.column,
      position: index,
      safeToRepair: Boolean(extra.safeToRepair),
      ...extra
    });
  };

  while (i < source.length) {
    const ch = source[i];

    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }

    if (ch === '"') {
      const str = readDoubleString(source, i);
      if (!str.ok) {
        pushIssue('UNTERMINATED_STRING', 'Unterminated double-quoted string', i, { safeToRepair: false });
        return { issues, brace, bracket };
      }
      if (str.invalidEscape) {
        pushIssue('INVALID_ESCAPE', 'Invalid string escape sequence', str.invalidEscapeAt, { safeToRepair: false });
      }
      i = str.end;
      expectKey = false;
      continue;
    }

    if (ch === "'") {
      const str = readSingleString(source, i);
      pushIssue('SINGLE_QUOTED_STRING', 'Single-quoted strings are not valid JSON', i, {
        safeToRepair: str.ok && str.unambiguous
      });
      if (!str.ok) {
        return { issues, brace, bracket };
      }
      i = str.end;
      expectKey = false;
      continue;
    }

    if (ch === '{') {
      brace += 1;
      stack.push('object');
      expectKey = true;
      i += 1;
      continue;
    }

    if (ch === '[') {
      bracket += 1;
      stack.push('array');
      expectKey = false;
      i += 1;
      continue;
    }

    if (ch === '}') {
      brace -= 1;
      stack.pop();
      expectKey = false;
      i += 1;
      continue;
    }

    if (ch === ']') {
      bracket -= 1;
      stack.pop();
      expectKey = false;
      i += 1;
      continue;
    }

    if (ch === ',') {
      let j = i + 1;
      while (j < source.length && /\s/.test(source[j])) j += 1;
      if (source[j] === '}' || source[j] === ']') {
        pushIssue('TRAILING_COMMA', 'Trailing comma is not valid JSON', i, { safeToRepair: true });
      }
      const ctx = stack[stack.length - 1];
      expectKey = ctx === 'object';
      i += 1;
      continue;
    }

    if (ch === ':') {
      expectKey = false;
      i += 1;
      continue;
    }

    if (IDENT_START.test(ch)) {
      const start = i;
      i += 1;
      while (i < source.length && IDENT_PART.test(source[i])) i += 1;
      const ident = source.slice(start, i);
      let j = i;
      while (j < source.length && /\s/.test(source[j])) j += 1;
      if (source[j] === ':' || expectKey) {
        pushIssue('UNQUOTED_KEY', `Unquoted property name "${ident}" is not valid JSON`, start, {
          safeToRepair: true,
          key: ident
        });
        expectKey = false;
      } else if (ident !== 'true' && ident !== 'false' && ident !== 'null') {
        pushIssue('UNQUOTED_IDENTIFIER', `Unexpected identifier "${ident}"`, start, { safeToRepair: false });
      }
      continue;
    }

    if (ch === '/' && (source[i + 1] === '/' || source[i + 1] === '*')) {
      pushIssue('COMMENT', 'Comments are not valid JSON', i, { safeToRepair: false });
      if (source[i + 1] === '/') {
        while (i < source.length && source[i] !== '\n') i += 1;
      } else {
        i += 2;
        while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) i += 1;
        i += 2;
      }
      continue;
    }

    i += 1;
  }

  if (brace > 0) {
    pushIssue('UNBALANCED_BRACE', `Missing ${brace} closing brace(s)`, source.length, { safeToRepair: false });
  } else if (brace < 0) {
    pushIssue('UNBALANCED_BRACE', 'Too many closing braces', source.length, { safeToRepair: false });
  }
  if (bracket > 0) {
    pushIssue('UNBALANCED_BRACKET', `Missing ${bracket} closing bracket(s)`, source.length, { safeToRepair: false });
  } else if (bracket < 0) {
    pushIssue('UNBALANCED_BRACKET', 'Too many closing brackets', source.length, { safeToRepair: false });
  }

  return { issues, brace, bracket };
}

function readDoubleString(source, start) {
  let i = start + 1;
  let invalidEscape = false;
  let invalidEscapeAt = null;
  while (i < source.length) {
    const ch = source[i];
    if (ch === '"') return { ok: true, end: i + 1, invalidEscape, invalidEscapeAt };
    if (ch === '\\') {
      const next = source[i + 1];
      if (next == null) break;
      if (!'"\\/bfnrtu'.includes(next)) {
        invalidEscape = true;
        invalidEscapeAt = i;
      }
      if (next === 'u') i += 6;
      else i += 2;
      continue;
    }
    if (ch === '\n') break;
    i += 1;
  }
  return { ok: false, end: i, invalidEscape, invalidEscapeAt };
}

function readSingleString(source, start) {
  let i = start + 1;
  let unambiguous = true;
  while (i < source.length) {
    const ch = source[i];
    if (ch === "'") return { ok: true, end: i + 1, unambiguous };
    if (ch === '\n') {
      unambiguous = false;
      break;
    }
    if (ch === '\\') {
      i += 2;
      continue;
    }
    i += 1;
  }
  return { ok: false, end: i, unambiguous: false };
}
