# Canvas field order

Requested directly, without an issue.

## Spec

On the canvas, each table lists its columns in this order. Within a group, the column order of the table is kept.

1. Primary key columns.
2. Foreign key columns: columns on the FK side of a relationship. The referenced columns at the other end do not count.
3. Every other column.
4. Timestamp columns: `TIMESTAMP*`, `DATETIME`, `DATETIME2`, `DATETIMEOFFSET`, `SMALLDATETIME`. `DATE` is not a timestamp.
5. `updated_at`.
6. `created_at`.

`updated_at` and `created_at` are matched by name and go last whatever their type or key status.

This changes display only. The table's column order is kept in the model, the Tables tab editor (where columns are reordered by dragging), and SQL and DBML export. Relationship lines attach to the displayed rows.

## Plan

- `src/utils/fieldOrder.js`: `orderFieldEntries(entries, tableId, relationships)`.
- `getVisibleFieldEntries` in `src/utils/utils.js` sorts with it. The table body and relationship anchors both read it, so they stay in step.
- Tests: `src/utils/__tests__/fieldOrder.test.js`.
