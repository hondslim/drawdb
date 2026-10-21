# #15 Grants per role

## Spec

Builds on `postgres.grants` from #9: `[{table, role, privileges: [...]}]`. dbdraw fills it from `information_schema.role_table_grants`, one entry per (table, role).

- Privileges are `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES` and `TRIGGER`, always shown in that order. Duplicate entries for one table and role are merged.
- Table details: a **Grants** card shows a small matrix, one row per role and one column per privilege, with a check where granted.
- A **Grants** sidebar tab (Postgres diagrams whose metadata has grants) shows the diagram-wide matrix: one row per (table, role), with a role filter ("All roles" or one role). With one role selected, only tables where that role holds a grant are listed. If there are none, the tab says so: "authenticated holds no grants".
- Table names in the matrix are links that open the table in the Tables tab.

## Plan

- `src/utils/postgresMeta.js`: `PRIVILEGES`, `grantMatrix(meta, role)`, `grantRoles(meta)`.
- `src/components/EditorSidePanel/GrantsTab.jsx`, `Tab.GRANTS`, registered in `SidePanel.jsx`.
- `PostgresDetails.jsx`: the Grants card, sharing a `GrantTable` component with the tab.
- `en` strings.
