# #7 Postgres TEXT/VARCHAR default flagged as a problem

Upstream: drawdb-io/drawdb#1144.

## Spec

- An unsized Postgres `TEXT` column accepts any string default. `TEXT` has no length.
- A Postgres `VARCHAR` with an empty size accepts any string default (`varchar` without a length is unbounded).
- A sized `VARCHAR` still reports a default longer than its size.

## Plan

- `src/data/datatypes.js`: add `defaultFitsSize(field)`, which treats an empty size as unbounded. Use it for Postgres `VARCHAR`. Postgres `TEXT` always passes.
- Tests: `src/utils/__tests__/issues.test.js`.
