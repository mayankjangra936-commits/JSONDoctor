#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { JsonDoctorError } from '../errors/index.js';
import { VERSION } from '../version.js';
import {
  cmdCompare,
  cmdDiagnose,
  cmdDiff,
  cmdFlatten,
  cmdFormat,
  cmdGet,
  cmdMinify,
  cmdRepair,
  cmdSchema,
  cmdStats,
  cmdUnflatten,
  cmdValidate
} from './commands.js';
import { HELP_TEXT, createPrinter } from './print.js';

const COMMANDS = {
  validate: cmdValidate,
  format: cmdFormat,
  minify: cmdMinify,
  compare: cmdCompare,
  diff: cmdDiff,
  diagnose: cmdDiagnose,
  repair: cmdRepair,
  flatten: cmdFlatten,
  unflatten: cmdUnflatten,
  stats: cmdStats,
  schema: cmdSchema,
  get: cmdGet,
  help: () => 0,
  version: () => 0
};

export async function run(argv = process.argv.slice(2)) {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      strict: false,
      options: {
        json: { type: 'boolean', default: false },
        quiet: { type: 'boolean', default: false },
        help: { type: 'boolean', default: false },
        version: { type: 'boolean', default: false },
        out: { type: 'string' },
        overwrite: { type: 'boolean', default: false },
        indent: { type: 'string' },
        separator: { type: 'string' },
        'ignore-key': { type: 'string', multiple: true },
        'ignore-path': { type: 'string', multiple: true },
        'ignore-array-order': { type: 'boolean', default: false },
        unchanged: { type: 'boolean', default: true },
        color: { type: 'boolean', default: true },
        'no-color': { type: 'boolean', default: false },
        'no-unchanged': { type: 'boolean', default: false }
      }
    });
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    return 2;
  }

  const values = {
    json: parsed.values.json,
    quiet: parsed.values.quiet,
    help: parsed.values.help,
    version: parsed.values.version,
    out: parsed.values.out,
    overwrite: parsed.values.overwrite,
    indent: parsed.values.indent,
    separator: parsed.values.separator,
    ignoreKey: parsed.values['ignore-key'],
    ignorePath: parsed.values['ignore-path'],
    ignoreArrayOrder: parsed.values['ignore-array-order'],
    unchanged: parsed.values['no-unchanged'] ? false : parsed.values.unchanged,
    color: parsed.values['no-color'] ? false : parsed.values.color
  };

  const positionals = parsed.positionals;
  const command = positionals[0];
  const args = positionals.slice(1);
  const printer = createPrinter(values);

  if (values.help || command === 'help' || positionals.length === 0) {
    process.stdout.write(`${HELP_TEXT}\n`);
    return 0;
  }
  if (values.version || command === 'version') {
    process.stdout.write(`${VERSION}\n`);
    return 0;
  }

  const handler = COMMANDS[command];
  if (!handler) {
    process.stderr.write(`Unknown command: ${command}\nRun jsondoctor --help for usage.\n`);
    return 2;
  }

  try {
    return handler(args, printer, values) ?? 0;
  } catch (error) {
    if (values.json) {
      printer.jsonOut({
        ok: false,
        error: error.message,
        code: error.code || error.name
      });
    } else {
      printer.fail(error.message);
      if (error.line) {
        printer.line(`Location: line ${error.line}, column ${error.column}`);
      }
    }
    if (error.code === 'USAGE' || error.code === 'FILE_OPERATION') return 2;
    if (error instanceof JsonDoctorError) return 1;
    return 1;
  }
}

const isDirect = Boolean(
  process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url
);

if (isDirect) {
  run().then((code) => {
    process.exitCode = code;
  });
}
