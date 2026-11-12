import { InvalidPathError } from '../errors/index.js';

/**
 * Parse a documented JSONPath subset:
 *   $
 *   $.user.name
 *   $.users[0].email
 *   $.users[*].name
 *   $['user']["name"]
 */
export function parseJsonPath(path) {
  if (typeof path !== 'string' || path.trim() === '') {
    throw new InvalidPathError('Path must be a non-empty string');
  }

  const input = path.trim();
  if (input[0] !== '$') {
    throw new InvalidPathError(`Path must start with "$" (received: ${path})`);
  }

  const segments = [];
  let i = 1;

  while (i < input.length) {
    const ch = input[i];
    if (ch === '.') {
      i += 1;
      if (input[i] === '*') {
        segments.push({ type: 'wildcard' });
        i += 1;
        continue;
      }
      if (input[i] === '[') {
        continue;
      }
      const start = i;
      if (i >= input.length || !isIdentStart(input[i])) {
        throw new InvalidPathError(`Expected property name after "." at index ${i} in ${path}`);
      }
      i += 1;
      while (i < input.length && isIdentPart(input[i])) i += 1;
      segments.push({ type: 'key', value: input.slice(start, i) });
      continue;
    }

    if (ch === '[') {
      i += 1;
      if (input[i] === '*') {
        if (input[i + 1] !== ']') {
          throw new InvalidPathError(`Invalid wildcard in ${path}`);
        }
        segments.push({ type: 'wildcard' });
        i += 2;
        continue;
      }
      if (input[i] === "'" || input[i] === '"') {
        const quote = input[i];
        i += 1;
        let value = '';
        while (i < input.length && input[i] !== quote) {
          if (input[i] === '\\') {
            value += input[i + 1] ?? '';
            i += 2;
            continue;
          }
          value += input[i];
          i += 1;
        }
        if (input[i] !== quote || input[i + 1] !== ']') {
          throw new InvalidPathError(`Unclosed bracket notation in ${path}`);
        }
        segments.push({ type: 'key', value });
        i += 2;
        continue;
      }
      const start = i;
      if (input[i] === '-') i += 1;
      if (i >= input.length || !isDigit(input[i])) {
        throw new InvalidPathError(`Expected array index in ${path}`);
      }
      while (i < input.length && isDigit(input[i])) i += 1;
      if (input[i] !== ']') {
        throw new InvalidPathError(`Unclosed array index in ${path}`);
      }
      segments.push({ type: 'index', value: Number(input.slice(start, i)) });
      i += 1;
      continue;
    }

    throw new InvalidPathError(`Unexpected character "${ch}" in path ${path}`);
  }

  return segments;
}

export function pathMatchesPattern(path, pattern) {
  if (path === pattern) return true;

  const normalizedPattern = pattern
    .replace(/\.\[\]/g, '[*]')
    .replace(/\[\]/g, '[*]');

  if (normalizedPattern.endsWith('.*')) {
    const prefix = normalizedPattern.slice(0, -2);
    return path === prefix || path.startsWith(`${prefix}.`) || path.startsWith(`${prefix}[`);
  }

  if (normalizedPattern.includes('[*]')) {
    const regex = new RegExp(
      `^${escapeRegExp(normalizedPattern).replaceAll('\\[\\*\\]', '\\[\\d+\\]').replaceAll('\\*', '[^.\\[]+')}$`
    );
    return regex.test(path);
  }

  return false;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isIdentStart(ch) {
  return /[A-Za-z_]/.test(ch);
}

function isIdentPart(ch) {
  return /[A-Za-z0-9_]/.test(ch);
}

function isDigit(ch) {
  return ch >= '0' && ch <= '9';
}
