# #13 Database views from their SQL definition

## Spec

- The share payload's `postgres.views` lists database views: `[{schema, name, materialized, columns: [{name, type}], definition, dependsOn: ["digivacc.animals"]}]`. dbdraw fills it from `pg_views`/`pg_matviews`, `information_schema.columns` and `pg_depend`/`pg_rewrite`.
- Each view becomes a read-only _SQL view table_ in the diagram: a table with `sqlView: {definition, dependsOn, materialized}` and one field per column. drawDB's query-builder views (`src/utils/views.js`) are a separate feature and are unchanged.
- Because a SQL view table is a table, it can be moved, collapsed, hidden, found in search and deep-linked. Its position is kept across reloads (#6), matched by `(schema, name)`.
- New view tables go to the right of the existing tables.
- Canvas: the header shows an eye icon and a "view" (or "materialized view") tag. A dashed edge runs from the view to each table it depends on.
- Table details for a view show its columns, its source tables as links, and the definition in a read-only `pgsql` editor. Nothing is editable.
- Like stubs (#5), SQL view tables raise no issues and are left out of SQL and DBML export. Editing the DBML in the editor keeps them.
- On a shareId reload the share is the source of truth: a view that left the database disappears, and its columns and definition update.

## Plan

- `src/utils/sqlViews.js`: `sqlViewTables(views)` and `withSqlViews(tables, postgres)` (placement), `isReadOnlyTable(table)`.
- `src/utils/share.js`: add the view tables from `postgres.views` to the share's tables, in both branches.
- `src/utils/share.js` and `src/utils/dbml/reconcile.js`: carry `sqlView`. `reconcileDbml` keeps base view tables unless told not to; `mergeShare` turns that off.
- Export filters and `issues.js`: skip `sqlView` tables. `diff.js`: add the key.
- UI: `Table.jsx` header, `Canvas.jsx` dependency edges, `TableInfo.jsx` details.
- Out of scope: `CREATE VIEW` in SQL export.
