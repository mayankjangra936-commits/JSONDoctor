import { compare } from '../comparison/compare.js';
import { diff } from '../comparison/diff.js';
import { format } from '../formatter/format.js';
import { minify } from '../formatter/minify.js';
import { get } from '../query/get.js';
import { diagnose } from '../repair/diagnose.js';
import { repair } from '../repair/repair.js';
import { validateSchema } from '../schema/validateSchema.js';
import { stats } from '../statistics/stats.js';
import { flatten } from '../transformation/flatten.js';
import { unflatten } from '../transformation/unflatten.js';
import { validate } from '../validator/validate.js';
import { readJsonFile, readTextFile, writeTextFile } from './io.js';
import { formatBytes } from './print.js';

function maybeWrite(printer, text, options) {
  if (options.out) {
    const written = writeTextFile(options.out, text.endsWith('\n') ? text : `${text}\n`, {
      overwrite: options.overwrite
    });
    if (!printer.jsonMode) printer.ok(`Wrote ${written}`);
    return written;
  }
  return null;
}

export function cmdValidate(args, printer, options) {
  const file = requireFile(args, 0, 'validate <file>');
  const text = readTextFile(file);
  const result = validate(text);
  if (printer.jsonMode) {
    printer.jsonOut({ file, ...result });
  } else {
    printer.header();
    printer.kv('FILE', file);
    printer.section('Validation');
    if (result.valid) {
      printer.ok('Valid JSON syntax');
    } else {
      printer.fail(`Invalid JSON syntax: ${result.error.message}`);
      printer.line(`Location: line ${result.error.line}, column ${result.error.column}`);
    }
    printer.section('Status');
    printer.ok(result.valid ? 'Analysis completed successfully' : 'Validation failed');
  }
  return result.valid ? 0 : 1;
}

export function cmdFormat(args, printer, options) {
  const file = requireFile(args, 0, 'format <file>');
  const text = readTextFile(file);
  const indent = options.indent === undefined ? 2 : Number(options.indent);
  const formatted = format(text, { indent });
  if (printer.jsonMode && options.out) {
    maybeWrite(printer, formatted, options);
    printer.jsonOut({ file, written: options.out, ok: true });
  } else if (printer.jsonMode) {
    printer.jsonOut({ file, json: formatted });
  } else {
    printer.header();
    printer.kv('FILE', file);
    printer.section('Format');
    maybeWrite(printer, formatted, options);
    if (!options.out) printer.text(formatted);
  }
  return 0;
}

export function cmdMinify(args, printer, options) {
  const file = requireFile(args, 0, 'minify <file>');
  const text = readTextFile(file);
  const minified = minify(text);
  if (printer.jsonMode && !options.out) {
    printer.jsonOut({ file, json: minified });
  } else {
    if (!printer.jsonMode) {
      printer.header();
      printer.kv('FILE', file);
      printer.section('Minify');
    }
    maybeWrite(printer, minified, options);
    if (!options.out && !printer.jsonMode) printer.text(minified);
  }
  return 0;
}

export function cmdCompare(args, printer, options) {
  const oldFile = requireFile(args, 0, 'compare <old> <new>');
  const newFile = requireFile(args, 1, 'compare <old> <new>');
  const left = readJsonFile(oldFile);
  const right = readJsonFile(newFile);
  const result = compare(left.data, right.data, compareOptions(options));
  if (printer.jsonMode) {
    printer.jsonOut({ oldFile, newFile, ...result });
    return result.equal ? 0 : 1;
  }
  printer.header();
  printer.kv('LEFT', oldFile);
  printer.kv('RIGHT', newFile);
  printer.section('Compare');
  printer.kv('Added', String(result.summary.added));
  printer.kv('Removed', String(result.summary.removed));
  printer.kv('Modified', String(result.summary.modified));
  for (const item of result.added) printer.line(`+ ${item.path}`);
  for (const item of result.removed) printer.line(`- ${item.path}`);
  for (const item of result.modified) printer.line(`~ ${item.path}`);
  printer.section('Status');
  if (result.equal) printer.ok('Documents are structurally equal');
  else printer.fail('Documents differ');
  return result.equal ? 0 : 1;
}

export function cmdDiff(args, printer, options) {
  const oldFile = requireFile(args, 0, 'diff <old> <new>');
  const newFile = requireFile(args, 1, 'diff <old> <new>');
  const left = readJsonFile(oldFile);
  const right = readJsonFile(newFile);
  const result = diff(left.data, right.data, compareOptions(options));
  if (printer.jsonMode) {
    printer.jsonOut({ oldFile, newFile, ...result });
    return result.equal ? 0 : 1;
  }
  printer.header();
  printer.kv('LEFT', oldFile);
  printer.kv('RIGHT', newFile);
  printer.section('Diff');
  for (const change of result.changes) {
    if (change.type === 'added') printer.line(`ADD    ${change.path}`);
    else if (change.type === 'removed') printer.line(`REMOVE ${change.path}`);
    else printer.line(`MODIFY ${change.path}`);
  }
  printer.section('Summary');
  printer.kv('Added', String(result.summary.added));
  printer.kv('Removed', String(result.summary.removed));
  printer.kv('Modified', String(result.summary.modified));
  return result.equal ? 0 : 1;
}

export function cmdDiagnose(args, printer) {
  const file = requireFile(args, 0, 'diagnose <file>');
  const text = readTextFile(file);
  const result = diagnose(text);
  if (printer.jsonMode) {
    printer.jsonOut({ file, ...result });
    return result.valid ? 0 : 1;
  }
  printer.header();
  printer.kv('FILE', file);
  printer.section('Diagnostics');
  if (result.valid) printer.ok('No issues found');
  else {
    for (const issue of result.issues) {
      const safety = issue.safeToRepair ? 'safe to repair' : 'not auto-repaired';
      printer.line(`${issue.code} @ ${issue.line}:${issue.column} (${safety}): ${issue.message}`);
    }
  }
  return result.valid ? 0 : 1;
}

export function cmdRepair(args, printer, options) {
  const file = requireFile(args, 0, 'repair <file>');
  const text = readTextFile(file);
  const result = repair(text);
  if (printer.jsonMode) {
    if (result.success && options.out) maybeWrite(printer, result.repaired, options);
    printer.jsonOut({ file, ...result, written: options.out || null });
    return result.success ? 0 : 1;
  }
  printer.header();
  printer.kv('FILE', file);
  printer.section('Repair');
  if (result.success) {
    printer.ok('Safe repair produced valid JSON');
    for (const change of result.changes) printer.line(`- ${change.message}`);
    maybeWrite(printer, result.repaired, options);
    if (!options.out) printer.text(result.repaired);
  } else {
    printer.fail(result.error.message);
    for (const warning of result.warnings) printer.warn(warning);
  }
  return result.success ? 0 : 1;
}

export function cmdFlatten(args, printer, options) {
  const file = requireFile(args, 0, 'flatten <file>');
  const parsed = readJsonFile(file);
  const result = flatten(parsed.data, { separator: options.separator || '.' });
  const text = JSON.stringify(result, null, 2);
  if (printer.jsonMode && !options.out) {
    printer.jsonOut(result);
  } else {
    if (!printer.jsonMode) {
      printer.header();
      printer.kv('FILE', file);
      printer.section('Flatten');
    }
    maybeWrite(printer, text, options);
    if (!options.out && !printer.jsonMode) printer.text(text);
  }
  return 0;
}

export function cmdUnflatten(args, printer, options) {
  const file = requireFile(args, 0, 'unflatten <file>');
  const parsed = readJsonFile(file);
  const result = unflatten(parsed.data, { separator: options.separator || '.' });
  const text = JSON.stringify(result, null, 2);
  if (printer.jsonMode && !options.out) printer.jsonOut(result);
  else {
    if (!printer.jsonMode) {
      printer.header();
      printer.kv('FILE', file);
      printer.section('Unflatten');
    }
    maybeWrite(printer, text, options);
    if (!options.out && !printer.jsonMode) printer.text(text);
  }
  return 0;
}

export function cmdStats(args, printer) {
  const file = requireFile(args, 0, 'stats <file>');
  const parsed = readJsonFile(file);
  const result = stats(parsed.data);
  if (printer.jsonMode) {
    printer.jsonOut({ file, ...result });
    return 0;
  }
  printer.header();
  printer.kv('FILE', file);
  printer.section('Statistics');
  printer.kv('Objects', String(result.totalObjects));
  printer.kv('Arrays', String(result.totalArrays));
  printer.kv('Properties', String(result.totalKeys));
  printer.kv('Array items', String(result.totalArrayItems));
  printer.kv('Strings', String(result.totalStrings));
  printer.kv('Numbers', String(result.totalNumbers));
  printer.kv('Booleans', String(result.totalBooleans));
  printer.kv('Nulls', String(result.totalNulls));
  printer.kv('Maximum depth', String(result.maxDepth));
  printer.kv('File size', formatBytes(result.sizeBytes));
  printer.section('Status');
  printer.ok('Analysis completed successfully');
  return 0;
}

export function cmdSchema(args, printer) {
  const dataFile = requireFile(args, 0, 'schema <data> <schema>');
  const schemaFile = requireFile(args, 1, 'schema <data> <schema>');
  const data = readJsonFile(dataFile);
  const schema = readJsonFile(schemaFile);
  const result = validateSchema(data.data, schema.data);
  if (printer.jsonMode) {
    printer.jsonOut({ dataFile, schemaFile, ...result });
    return result.valid ? 0 : 1;
  }
  printer.header();
  printer.kv('DATA', dataFile);
  printer.kv('SCHEMA', schemaFile);
  printer.section('Schema');
  if (result.valid) printer.ok('Data matches JSON Schema (draft-07)');
  else {
    printer.fail('Schema validation failed');
    for (const err of result.errors) {
      printer.line(`${err.path}: ${err.message} (${err.keyword})`);
    }
  }
  return result.valid ? 0 : 1;
}

export function cmdGet(args, printer) {
  const file = requireFile(args, 0, 'get <file> <path>');
  const path = args[1];
  if (!path) throw usageError('get <file> <path>');
  const parsed = readJsonFile(file);
  const value = get(parsed.data, path);
  if (printer.jsonMode) {
    printer.jsonOut({ file, path, found: value !== undefined, value });
    return 0;
  }
  printer.header();
  printer.kv('FILE', file);
  printer.kv('PATH', path);
  printer.section('Result');
  if (value === undefined) printer.warn('Path not found');
  else printer.text(JSON.stringify(value, null, 2));
  return 0;
}

function compareOptions(options) {
  return {
    ignoreKeys: asArray(options.ignoreKey),
    ignorePaths: asArray(options.ignorePath),
    ignoreArrayOrder: Boolean(options.ignoreArrayOrder),
    includeUnchanged: options.unchanged !== false
  };
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function requireFile(args, index, usage) {
  if (!args[index]) throw usageError(usage);
  return args[index];
}

export function usageError(usage) {
  const error = new Error(`Usage: jsondoctor ${usage}`);
  error.code = 'USAGE';
  return error;
}
