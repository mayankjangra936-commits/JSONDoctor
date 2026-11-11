# JSONDoctor

**The Complete JSON Debugging & Analysis Toolkit**

```
  JSONDoctor
  Understand your JSON. Detect its problems.
  Compare its structure. Transform it confidently.
```

JSONDoctor is a standalone JavaScript library and CLI for inspecting, validating, comparing, repairing, and transforming JSON. It runs entirely offline.

Package name on npm: **`jsondoctor`**  
(`jsondoctor-js` was also unused; this project uses `jsondoctor` so the install name matches the `jsondoctor` binary.)

Requires **Node.js 18.18+**.

## Problem

JSON is everywhere: APIs, configs, databases, tests. Developers still spend time on trailing commas, opaque parse errors, huge nested payloads, and “what actually changed?” diffs. JSONDoctor puts those jobs in one toolkit with structured results instead of log-only helpers.

## Features

- Syntax validation with line and column
- Pretty-print and minify
- Deep object/array comparison and a path-based diff
- Diagnostics plus **safe, explicit** repairs only
- Flatten / unflatten with escaped keys
- JSONPath-subset queries (`$`, dots, indices, brackets, `[*]`)
- JSON Schema draft-07 validation (Ajv)
- Structural statistics
- CLI with exit codes, `--json`, and no accidental overwrites

## Installation

```bash
npm install jsondoctor
```

Global CLI (optional):

```bash
npm install -g jsondoctor
```

## Quick start

```javascript
import JSONDoctor, { validate, compare, flatten, get } from 'jsondoctor';

const result = JSONDoctor.validate('{"name":"John","age":22}');
// { valid: true, error: null, data: { name: "John", age: 22 } }

JSONDoctor.format('{"user":{"name":"John"}}');
JSONDoctor.compare(oldData, newData);
JSONDoctor.get(data, '$.user.profile.email');
```

## Input conventions

| API | Accepts |
| --- | --- |
| `validate`, `diagnose`, `repair` | JSON **strings** only |
| `format`, `minify` | JSON string **or** parsed JSON value |
| `compare`, `diff`, `flatten`, `get`, `stats`, `validateSchema` | Parsed JSON values, or JSON strings that will be parsed first |
| `unflatten` | Flat object of path keys |

On invalid syntax, `format` / `minify` / `compare` / etc. throw `InvalidJsonError` with `line` and `column`. `validate` never throws for bad JSON; it returns `{ valid: false, error }`.

## API

### validate(jsonString)

```javascript
JSONDoctor.validate('{"name":"John",}');
// {
//   valid: false,
//   error: { message, line, column, position, rawMessage },
//   data: null
// }
```

Uses `JSON.parse` as the authoritative parser. Trailing commas, unquoted keys, and invalid escapes fail because native parsing fails.

### format(input, options?) / minify(input)

Default indent is `2`. `indent` may be `4` or a string such as `'\t'`.

### compare(oldData, newData, options?)

```javascript
JSONDoctor.compare(
  { name: 'John', age: 22, address: { city: 'Delhi', country: 'India' } },
  { name: 'John', age: 23, address: { city: 'Mumbai', country: 'India' }, active: true }
);
```

Returns `added`, `removed`, `modified`, optional `unchanged` paths, and `summary`.

Options:

- `caseSensitiveKeys` (default `true`)
- `ignoreKeys`
- `ignorePaths` — exact paths, `$.meta.*`, `$.features[*].temp`, or `$.features.[].temp`
- `ignoreArrayOrder` (opt-in; default comparison is **index-based**)
- `includeUnchanged` (default `true`)
- `maxDepth` (default `64`)

Reordered arrays are **not** equal unless `ignoreArrayOrder` is set.

### diff(oldData, newData, options?)

Same engine as `compare`, with a `changes[]` list (`added` / `removed` / `modified`) and counts.

### diagnose(jsonString) / repair(jsonString)

Diagnosis is **not** a repair. Repair only:

- strips a UTF-8 BOM
- removes trailing commas
- converts unambiguous single-quoted strings
- quotes identifier keys

It will not invent missing values or close ambiguous structures. Success:

```javascript
{
  success: true,
  original: '...',
  repaired: '...',
  changes: [],
  warnings: []
}
```

### flatten(data, options?) / unflatten(flat, options?)

```javascript
JSONDoctor.flatten({
  user: { profile: { name: 'John', age: 22 } },
  active: true
});
// { "user.profile.name": "John", "user.profile.age": 22, active: true }
```

Arrays use `[index]`. Keys containing `.`, `\`, `[`, or `]` are backslash-escaped so round-trips stay reversible. Conflicting paths throw `TransformationConflictError` instead of overwriting.

### get(data, path)

Documented JSONPath subset (not the full standard):

- `$.user.name`
- `$.users[0].email`
- `$.products[2].price`
- `$['user']['name']`
- `$.users[*].name`

Missing paths return `undefined`. Wildcards return an array.

### validateSchema(data, schema)

JSON Schema **draft-07** via [Ajv](https://ajv.js.org/). Syntax-valid JSON can still fail schema checks.

### stats(data)

Counts objects, keys, arrays, array items, strings, numbers, booleans, nulls, empty containers, max depth, UTF-8 serialized size, and the largest nested sections.

## CLI

```bash
jsondoctor validate ./data.json
jsondoctor format ./data.json
jsondoctor minify ./data.json
jsondoctor compare ./old.json ./new.json
jsondoctor diff ./old.json ./new.json
jsondoctor diagnose ./broken.json
jsondoctor repair ./broken.json --out ./fixed.json
jsondoctor flatten ./data.json
jsondoctor stats ./data.json
jsondoctor schema ./data.json ./schema.json
jsondoctor get ./data.json "$.user.name"
```

`--json` prints machine-readable output. `--out` writes a file; existing files are **not** replaced unless you also pass `--overwrite`.

Exit codes: `0` success, `1` invalid JSON / failed repair / schema or compare inequality, `2` usage or missing file / refused overwrite.

## Error handling

Typed errors: `InvalidJsonError`, `InvalidInputTypeError`, `InvalidPathError`, `InvalidSchemaError`, `UnsupportedRepairError`, `MaxDepthExceededError`, `TransformationConflictError`, `FileOperationError`.

## Security

- No `eval`, no `Function`, no execution of JSON as code
- No network calls in the library
- Own-property assignment for `__proto__`, `constructor`, and `prototype`
- Depth limits on recursive walks
- CLI refuses to overwrite files by default

## Limitations

- JSONPath is a subset, not RFC 9535 / full JSONPath
- Schema support is draft-07 as implemented by Ajv 8
- Array comparison is index-based unless `ignoreArrayOrder` is enabled
- Repair refuses anything that is not a listed deterministic transform
- `ignoreArrayOrder` uses greedy deep-equality matching, not a minimum-edit assignment

## Testing

```bash
npm test
node examples/complete-demo.js
npx jsondoctor validate tests/fixtures/valid.json
```

## License

MIT. See [LICENSE](./LICENSE) and [CONTRIBUTING.md](./CONTRIBUTING.md).
