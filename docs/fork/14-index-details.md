# #14 Index details: partial, expression, method, INCLUDE

## Spec

- An index has optional `method` (`btree`, `hash`, `gist`, `spgist`, `gin`, `brin`), `where` (predicate), `include` (field names) and `expressions` (SQL strings) alongside `fields`. Missing keys mean plain btree on `fields`, so existing diagrams are unchanged.
- In SQL and DBML the key is `fields` followed by `expressions`. Postgres allows any order; mixed indexes lose their order, which is accepted.
- Import:
  - DBML: backtick column entries become `expressions`, and `type:` becomes `method`.
  - Postgres SQL: `USING`, `WHERE`, `INCLUDE`, and expression columns. An expression column used to crash the import.
  - Share payload (#9): each `postgres.indexes` entry updates the table's index with the same name (method, where, include, and its columns split into fields and expressions), or is added if missing. It runs on every share import, so the database stays the source of truth.
  - The DBML editor keeps `where` and `include`, because DBML cannot express them.
- Export:
  - Postgres SQL: `CREATE [UNIQUE] INDEX "n" ON t USING method (cols, exprs) INCLUDE (...) WHERE pred;`, leaving out `USING btree`.
  - DBML: `type: method` (except btree) and backtick expressions.
- Table details: under each index row, tags show the method (except btree), the expressions, `INCLUDE (...)` and `WHERE ...`. For Postgres, the index popover edits method, include and where.

## Plan

- `src/utils/indexes.js`: `indexKeySQL`, `applyIndexMetadata(tables, postgres)`.
- `parse.js`, `reconcile.js`, `exportAs/dbml.js`, `importSQL/postgres.js`, `exportSQL/postgres.js`, `share.js`.
- `IndexDetails.jsx`. `en` strings.
