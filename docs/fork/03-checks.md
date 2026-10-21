# #3 CHECK constraints

## Spec

- A table has `checks: [{name, expression}]` for table-level CHECK constraints. Missing means none.
- A field keeps its single `check` expression (existing model).
- Import:
  - DBML 10.x: an unnamed column `check:` goes to `field.check` (several are joined with `AND`). A named column check, and every entry in a `checks {}` block, goes to `table.checks` with its name.
  - Postgres SQL: the same rule for column `CHECK`, `CONSTRAINT x CHECK` and table `CHECK`, and `ALTER TABLE ... ADD CONSTRAINT x CHECK`.
  - Reloading DBML over a diagram replaces checks with the imported ones.
- Canvas:
  - A field with a check shows a small check icon. Its tooltip, and the field summary popover, show the expression.
  - A table with table checks shows a check icon with the count in the header. Its tooltip lists `name: expression`.
- Table details: a Checks card lists each table check with name and expression inputs and a delete button. "Add check" sits in the add menu. Edits are undoable.
- Export:
  - SQL (every dialect): `CONSTRAINT "name" CHECK (expr)`, or `CHECK (expr)` when unnamed, after the unique constraints.
  - DBML: `check:` on columns and a `checks {}` block on tables, which round-trips.
- The DBML editor's diff applies check changes.

## Plan

- `src/utils/dbml/parse.js` already returns `checks` (#2). `reconcile.js` maps them onto `field.check` and `table.checks`; `diff.js` adds the keys.
- `src/utils/importSQL/postgres.js`: named column checks and table checks.
- `src/utils/exportSQL/shared.js`: `tableConstraintClause` = unique + checks, used by every dialect.
- `src/utils/exportAs/dbml.js`: column `check:` and `checks {}`.
- UI: `Table.jsx` markers, new `TablesTab/CheckDetails.jsx`, `TableInfo.jsx` card and menu item, `en` strings.
- `src/data/schemas.js`: `checks` on the table schema.
