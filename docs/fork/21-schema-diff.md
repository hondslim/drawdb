# #21 Schema diff between two versions

## Spec

- A share payload can carry `base`: an older version of the same diagram, `{tables, relationships}` in the same shape as the payload's own. dbdraw's `diff` command builds both sides, for example `staging` against the working tree.
- The share import (#6) stores it with the diagram as `diffBase`, replacing any earlier one. A share without `base` clears it.
- The diff compares `diffBase` with the current diagram:
  - tables by `(schema, name)`, columns by name within a table, and FKs by (FK table, FK columns, referenced table, referenced columns).
  - A column is _changed_ when its type, size, array flag, NOT NULL, default, primary key, unique, check, identity, generated expression or domain differs.
  - A table is _changed_ when its table-level parts differ: indexes, unique constraints, checks or comment. Adding, removing or changing a column does not, by itself, mark the table changed.
  - An FK is _changed_ when its cardinality, ON UPDATE, ON DELETE or deferrable differs.
- Canvas, while **Highlight changes** is on (the default when a base exists):
  - Added tables, columns and FKs are green, changed ones amber, each with a tooltip listing what changed.
  - A table with removed columns shows a red "−N" badge, with the column names in the tooltip.
  - Removed tables are drawn ghosted in red at their base position. If that position is missing or would overlap a current table, they go in a column to the right of the diagram. They cannot be clicked.
  - Removed FKs are drawn as dashed red lines between the tables, when both still exist.
  - Nothing else is highlighted. A branch that adds one column highlights only that column.
- A **Changes** sidebar tab (shown when a base exists) has the highlight switch and lists every change, grouped as tables, columns and foreign keys, with `+`, `−` or `~`. Clicking an entry that still exists selects that table.

## Plan

- `src/utils/schemaDiff.js`: `computeDiff(base, current)`, pure, tested in `src/utils/__tests__/schemaDiff.test.js`.
- `DiagramContext`: `diffBase` state. Saved, loaded and reset in `Workspace.jsx` like `postgres`. `share.js` sets it from `share.base`.
- `LayoutContext`: `showDiff: true`.
- `Canvas.jsx`: compute the diff once per structural change, not on every drag. Pass per-table and per-relationship status to `Table` and `Relationship`. Draw ghosts in `DiffGhosts.jsx`.
- `ChangesTab.jsx`, `Tab.CHANGES`. `en` strings.
