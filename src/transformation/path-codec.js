import { TransformationConflictError } from '../errors/index.js';

export function escapeKey(key, separator) {
  let out = '';
  let i = 0;
  while (i < key.length) {
    if (separator.length > 1 && key.startsWith(separator, i)) {
      out += `\\${separator}`;
      i += separator.length;
      continue;
    }
    const ch = key[i];
    if (ch === '\\' || ch === '[' || ch === ']' || (separator.length === 1 && ch === separator)) {
      out += `\\${ch}`;
    } else {
      out += ch;
    }
    i += 1;
  }
  return out;
}

export function serializeFlatPath(parts, separator) {
  let out = '';
  for (const part of parts) {
    if (part.type === 'index') {
      out += `[${part.value}]`;
    } else {
      const encoded = escapeKey(String(part.value), separator);
      out = out.length === 0 ? encoded : `${out}${separator}${encoded}`;
    }
  }
  return out;
}

export function tokenizeFlatPath(path, separator) {
  const tokens = [];
  let buf = '';
  let i = 0;

  const pushKey = () => {
    tokens.push({ type: 'key', value: buf });
    buf = '';
  };

  while (i < path.length) {
    if (path[i] === '\\') {
      if (separator.length > 1 && path.startsWith(separator, i + 1)) {
        buf += separator;
        i += 1 + separator.length;
        continue;
      }
      buf += path[i + 1] ?? '';
      i += 2;
      continue;
    }

    if (path[i] === '[') {
      if (buf.length > 0) pushKey();
      const end = path.indexOf(']', i);
      if (end === -1) {
        throw new TransformationConflictError(`Unclosed array index in flattened path "${path}"`);
      }
      const inner = path.slice(i + 1, end);
      if (!/^\d+$/.test(inner)) {
        throw new TransformationConflictError(`Invalid array index in flattened path "${path}"`);
      }
      tokens.push({ type: 'index', value: Number(inner) });
      i = end + 1;
      continue;
    }

    if (separator.length === 1 ? path[i] === separator : path.startsWith(separator, i)) {
      if (buf.length > 0) {
        pushKey();
      } else if (tokens.length === 0 || tokens[tokens.length - 1].type === 'key') {
        pushKey();
      }
      i += separator.length;
      continue;
    }

    buf += path[i];
    i += 1;
  }

  if (buf.length > 0) pushKey();
  return tokens;
}
