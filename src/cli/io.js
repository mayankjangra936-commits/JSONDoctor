import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FileOperationError, InvalidJsonError } from '../errors/index.js';
import { validate } from '../validator/validate.js';

export function readTextFile(filePath) {
  const resolved = resolve(filePath);
  if (!existsSync(resolved)) {
    throw new FileOperationError(`File not found: ${filePath}`, { details: { path: resolved } });
  }
  return readFileSync(resolved, 'utf8');
}

export function readJsonFile(filePath) {
  const text = readTextFile(filePath);
  const result = validate(text);
  if (!result.valid) {
    throw new InvalidJsonError(result.error.message, { ...result.error, details: { path: filePath } });
  }
  return { text, data: result.data, path: filePath };
}

export function writeTextFile(filePath, content, { overwrite = false } = {}) {
  const resolved = resolve(filePath);
  if (existsSync(resolved) && !overwrite) {
    throw new FileOperationError(
      `Refusing to overwrite existing file: ${filePath}. Pass --overwrite or choose a new --out path.`,
      { details: { path: resolved } }
    );
  }
  writeFileSync(resolved, content, { encoding: 'utf8', flag: overwrite ? 'w' : 'wx' });
  return resolved;
}

export async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf8');
}
