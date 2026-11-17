import { PRODUCT_NAME, VERSION } from '../version.js';

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

export function createPrinter({ json = false, quiet = false, color = null } = {}) {
  const useColor = color === true || (color !== false && process.stdout.isTTY && !process.env.NO_COLOR && !json);
  const paint = (code, text) => (useColor ? `${code}${text}${COLORS.reset}` : text);

  return {
    jsonMode: json,
    quiet,
    paint,
    header() {
      if (quiet || json) return;
      writeLine(paint(COLORS.bold, `${PRODUCT_NAME} v${VERSION}`));
    },
    section(title) {
      if (quiet || json) return;
      writeLine('');
      writeLine(paint(COLORS.cyan, title.toUpperCase()));
    },
    ok(message) {
      if (quiet || json) return;
      writeLine(`${paint(COLORS.green, '✓')} ${message}`);
    },
    fail(message) {
      if (json) return;
      writeLine(`${paint(COLORS.red, '✗')} ${message}`);
    },
    warn(message) {
      if (quiet || json) return;
      writeLine(`${paint(COLORS.yellow, '!')} ${message}`);
    },
    line(message = '') {
      if (quiet || json) return;
      writeLine(message);
    },
    kv(key, value) {
      if (quiet || json) return;
      writeLine(`${key}: ${value}`);
    },
    jsonOut(value) {
      writeLine(JSON.stringify(value, null, 2));
    },
    text(value) {
      writeLine(value);
    }
  };
}

function writeLine(text) {
  process.stdout.write(`${text}\n`);
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const HELP_TEXT = `${PRODUCT_NAME} v${VERSION}
The complete JSON debugging & analysis toolkit

Usage:
  jsondoctor <command> [options] [files]

Commands:
  validate <file>              Validate JSON syntax
  format <file>                Pretty-print JSON
  minify <file>                Remove insignificant whitespace
  compare <old> <new>          Deep-compare two JSON documents
  diff <old> <new>             Show a developer-friendly diff
  diagnose <file>              Diagnose common JSON mistakes
  repair <file>                Apply safe, explicit repairs
  flatten <file>               Flatten nested objects to path keys
  unflatten <file>             Rebuild nested JSON from a flat map
  stats <file>                 Structural statistics
  schema <data> <schema>       Validate data against JSON Schema (draft-07)
  get <file> <path>            Extract a nested value (JSONPath subset)
  help                         Show this help
  version                      Show version

Global options:
  --json                       Machine-readable JSON output
  --quiet                      Suppress human-readable banners
  --no-color                   Disable ANSI colours
  --help                       Show help
  --version                    Show version

Write options (format, minify, repair, flatten, unflatten):
  --out <file>                 Write result to a new file
  --overwrite                  Allow replacing an existing --out file
  --indent <n>                 Formatter indent (default: 2)
  --separator <s>              Flatten/unflatten separator (default: .)

Compare/diff options:
  --ignore-key <name>          Ignore a property name at any depth (repeatable)
  --ignore-path <path>         Ignore a JSONPath (repeatable)
  --ignore-array-order         Compare arrays as unordered collections
  --no-unchanged               Hide unchanged paths

Exit codes:
  0  Success (valid JSON / equal documents / schema valid)
  1  Invalid JSON, failed repair, or schema errors
  2  Usage error, missing file, or unsafe overwrite
`;
