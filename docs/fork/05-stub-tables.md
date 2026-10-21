# #5 Stub tables for FKs that point outside the diagram

## Spec

- DBML import accepts refs whose table is not declared, in all three forms: `Ref: a > b`, `Ref { a > b }` and inline `[ref: > b]`. It does not error.
- Each undeclared table becomes a _stub_: `stub: true`, with only the referenced columns. A stub column takes the type of the FK column that points at it.
- Text inside strings, backticks and comments is never read as a ref.
- Table aliases (`Table users as U`) count as declared.
- Canvas: a stub has a dashed border, a muted header, an "external" tag, and always shows its schema-qualified name. It can be moved, collapsed and deleted.
- Table details for a stub show a short notice instead of the editor.
- Stubs raise no issues (no primary key, and so on).
- Export:
  - SQL (every dialect) omits stub tables. FKs to them stay, because they are real constraints in the database.
  - DBML omits stub tables, so re-importing recreates them.
- The DBML editor's diff carries `stub`.
- Out of scope: stubs from SQL import. A SQL file can reference a table that it creates later, so an unknown table there is not reliably external.

## Plan

- `src/utils/dbml/stubs.js`: `declareStubTables(src)` returns `{src, stubs}`: the DBML with stub tables appended, and their keys.
- `src/utils/dbml/parse.js`: run it first, mark stub tables, copy FK column types onto stub columns.
- `src/utils/dbml/reconcile.js`, `diff.js`: carry `stub`.
- `src/utils/exportSQL/index.js`, `src/utils/exportAs/dbml.js`: filter stubs.
- `src/utils/issues.js`: skip stubs.
- UI: `Table.jsx`, `TableInfo.jsx`. `en` strings: `external_table`, `external_table_notice`.
