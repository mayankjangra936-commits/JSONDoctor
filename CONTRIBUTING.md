# Contributing to JSONDoctor

Thank you for improving JSONDoctor.

## Requirements

- Node.js 18.18 or later
- npm 9 or later

## Workflow

1. Keep modules focused. Business logic belongs in `src/`, not in the CLI layer.
2. Public functions should return structured results or throw typed errors from `src/errors`.
3. Never use `eval` or `Function`.
4. Treat user JSON as untrusted. Use `safeSet` when assigning dynamic keys.
5. Add tests under `tests/` using the Node.js test runner.
6. Run `npm test` before opening a change.

## Repair policy

Only add repair transforms that are deterministic and unambiguous. If a case requires guessing missing values, diagnose it and refuse to repair.

## Documentation

Update `README.md` and `CHANGELOG.md` when behaviour changes. Do not add fake download or star badges.
