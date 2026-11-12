import { InvalidInputTypeError, MaxDepthExceededError } from '../errors/index.js';

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

export function jsonType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  const t = typeof value;
  if (t === 'string' || t === 'boolean') return t;
  if (t === 'number') {
    if (!Number.isFinite(value)) return 'unsupported';
    return 'number';
  }
  if (t === 'object' && isPlainObject(value)) return 'object';
  return 'unsupported';
}

export function isJsonValue(value) {
  return jsonType(value) !== 'unsupported';
}

export function safeSet(target, key, value) {
  if (DANGEROUS_KEYS.has(key) || typeof key !== 'string' && typeof key !== 'number') {
    Object.defineProperty(target, key, {
      value,
      enumerable: true,
      configurable: true,
      writable: true
    });
    return target;
  }
  target[key] = value;
  return target;
}

export function safeGet(target, key) {
  if (target == null) return undefined;
  return Object.prototype.hasOwnProperty.call(target, key) ? target[key] : undefined;
}

export function ownKeys(value) {
  return Object.keys(value);
}

export function assertJsonValue(value, path = '$', seen = new WeakSet(), depth = 0, maxDepth = 64) {
  if (depth > maxDepth) {
    throw new MaxDepthExceededError(`Maximum depth of ${maxDepth} exceeded at ${path}`, {
      details: { path, maxDepth }
    });
  }

  const type = jsonType(value);
  if (type === 'unsupported') {
    throw new InvalidInputTypeError(
      `Unsupported JSON value at ${path} (type: ${value === undefined ? 'undefined' : typeof value})`,
      { details: { path } }
    );
  }

  if (type === 'object' || type === 'array') {
    if (seen.has(value)) {
      throw new InvalidInputTypeError(`Circular reference detected at ${path}`, {
        details: { path }
      });
    }
    seen.add(value);
    if (type === 'array') {
      for (let i = 0; i < value.length; i += 1) {
        assertJsonValue(value[i], `${path}[${i}]`, seen, depth + 1, maxDepth);
      }
    } else {
      for (const key of ownKeys(value)) {
        const childPath = appendObjectPath(path, key);
        assertJsonValue(value[key], childPath, seen, depth + 1, maxDepth);
      }
    }
  }
}

export function appendObjectPath(path, key) {
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
    return `${path}.${key}`;
  }
  return `${path}[${JSON.stringify(key)}]`;
}

export function appendIndexPath(path, index) {
  return `${path}[${index}]`;
}
