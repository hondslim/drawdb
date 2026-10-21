# #1 Postgres schemas as a table property

## Spec

- A table has an optional `schema` string. An empty or missing schema means the default schema (`public` in Postgres), so existing diagrams are unchanged.
- A table is identified by `(schema, name)`. `digivacc.users` and `auth.users` are two tables, and a duplicate-name issue is raised only when both schema and name match.
- DBML import keeps `schemaName`. `public` maps to the default schema, so unqualified DBML round-trips unchanged. Refs resolve by `(schema, table)`.
- Postgres SQL import keeps the schema from `CREATE TABLE s.t`, and resolves `REFERENCES`, `ALTER TABLE`, `CREATE INDEX ... ON` and `COMMENT ON` by `(schema, table)`.
- When the diagram has more than one schema, the canvas header shows `schema.` before the name (muted), and the Tables tab shows a schema filter. With one schema, both look as they do today.
- The table details panel has a Schema input for Postgres diagrams, and for any table that already has a schema.
- DBML export writes `schema.table` for tables with a schema, in `Table` and `Ref` lines.
- Postgres SQL export writes `"schema"."table"` everywhere a table is named, and starts with `CREATE SCHEMA IF NOT EXISTS` for each non-default schema.
- The DBML editor's diff applies schema changes.

## Plan

- `src/utils/schema.js`: `tableKey`, `qualifiedName`, `findTable`, `diagramSchemas`.
- `src/utils/dbml/parse.js`: `schema` on tables, `startSchemaName`/`endSchemaName` on refs.
- `src/utils/dbml/reconcile.js`: match tables and resolve refs by key; carry `schema`.
- `src/utils/dbml/diff.js`: add `schema` to the table keys.
- `src/utils/exportAs/dbml.js`, `src/utils/exportSQL/postgres.js`: qualified names.
- `src/utils/importSQL/postgres.js`: schema from the AST (`db`, `schema`).
- `src/utils/issues.js`: duplicates by key.
- UI: `Table.jsx` header, `TablesTab.jsx` filter, `TableInfo.jsx` input. New `en` strings: `schema`, `all_schemas`.
- Out of scope: other SQL dialects keep unqualified names.
