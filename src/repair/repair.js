import { InvalidInputTypeError } from '../errors/index.js';
import { diagnose } from './diagnose.js';

/**
 * Apply only explicit, deterministic repairs:
 * - strip UTF-8 BOM
 * - remove trailing commas
 * - convert unambiguous single-quoted strings
 * - quote identifier keys
 *
 * Never uses eval or Function. Never invents missing values.
 *
 * @param {string} input
 * @param {{ apply?: string[] }} [options]
 */
export function repair(input, options = {}) {
  if (typeof input !== 'string') {
    throw new InvalidInputTypeError('repair() requires a JSON string');
  }

  const original = input;
  const diagnostics = diagnose(original);
  if (diagnostics.valid) {
    return {
      success: true,
      original,
      repaired: original,
      changes: [],
      warnings: ['Input was already valid JSON; no repair applied.']
    };
  }

  const allowed = new Set(
    options.apply || ['bom', 'trailing-comma', 'single-quotes', 'unquoted-keys']
  );

  const { text, changes, warnings, aborted } = applySafeTransforms(original, allowed);
  if (aborted) {
    return {
      success: false,
      original,
      repaired: null,
      changes,
      warnings,
      diagnostics: diagnostics.issues,
      error: {
        message: 'Repair aborted because the input could not be transformed unambiguously.'
      }
    };
  }

  try {
    JSON.parse(text);
    return {
      success: true,
      original,
      repaired: text,
      changes,
      warnings
    };
  } catch {
    return {
      success: false,
      original,
      repaired: null,
      changes,
      warnings: [
        ...warnings,
        'Safe transformations were applied but the result is still not valid JSON. Remaining issues require human interpretation.'
      ],
      diagnostics: diagnostics.issues,
      error: {
        message: 'A safe repair could not produce valid JSON without guessing.'
      }
    };
  }
}

function applySafeTransforms(source, allowed) {
  const changes = [];
  const warnings = [];
  let text = source;

  if (allowed.has('bom') && text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
    changes.push({ type: 'bom', message: 'Removed UTF-8 BOM' });
  }

  let out = '';
  let i = 0;
  const n = text.length;

  while (i < n) {
    const ch = text[i];

    if (ch === '"') {
      const copied = copyDoubleQuoted(text, i);
      if (!copied.ok) {
        return { text: null, changes, warnings, aborted: true };
      }
      out += copied.text;
      i = copied.end;
      continue;
    }

    if (ch === "'" && allowed.has('single-quotes')) {
      const converted = convertSingleQuoted(text, i);
      if (!converted.ok) {
        warnings.push('Encountered an ambiguous single-quoted string; it was left unchanged.');
        return { text: null, changes, warnings, aborted: true };
      }
      out += converted.text;
      i = converted.end;
      changes.push({ type: 'single-quotes', message: 'Converted single-quoted string to JSON string' });
      continue;
    }

    if (ch === ',' && allowed.has('trailing-comma')) {
      let j = i + 1;
      while (j < n && /\s/.test(text[j])) j += 1;
      if (text[j] === '}' || text[j] === ']') {
        changes.push({ type: 'trailing-comma', message: 'Removed trailing comma' });
        i += 1;
        continue;
      }
      out += ch;
      i += 1;
      continue;
    }

    if (/[A-Za-z_]/.test(ch) && allowed.has('unquoted-keys')) {
      const start = i;
      i += 1;
      while (i < n && /[A-Za-z0-9_]/.test(text[i])) i += 1;
      const ident = text.slice(start, i);
      let j = i;
      while (j < n && /\s/.test(text[j])) j += 1;
      if (text[j] === ':') {
        out += JSON.stringify(ident);
        changes.push({ type: 'unquoted-key', message: `Quoted property name "${ident}"` });
        continue;
      }
      out += ident;
      continue;
    }

    out += ch;
    i += 1;
  }

  return { text: out, changes, warnings, aborted: false };
}

function copyDoubleQuoted(source, start) {
  let i = start + 1;
  let out = '"';
  while (i < source.length) {
    const ch = source[i];
    if (ch === '"') return { ok: true, text: `${out}"`, end: i + 1 };
    if (ch === '\\') {
      out += ch + (source[i + 1] ?? '');
      i += 2;
      continue;
    }
    if (ch === '\n') return { ok: false };
    out += ch;
    i += 1;
  }
  return { ok: false };
}

function convertSingleQuoted(source, start) {
  let i = start + 1;
  let body = '';
  while (i < source.length) {
    const ch = source[i];
    if (ch === "'") {
      const json = JSON.stringify(body);
      return { ok: true, text: json, end: i + 1 };
    }
    if (ch === '\n') return { ok: false };
    if (ch === '\\') {
      const next = source[i + 1];
      if (next === "'" || next === '\\') {
        body += next;
        i += 2;
        continue;
      }
      body += ch;
      i += 1;
      continue;
    }
    body += ch;
    i += 1;
  }
  return { ok: false };
}
