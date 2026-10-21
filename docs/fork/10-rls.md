# #10 Row-level security: RLS flags and policies per table

## Spec

Builds on the `postgres` metadata from #9. Nothing changes for diagrams without it, or for other databases.

- RLS state per table: `forced` (enabled and forced), `enabled`, or `off`. A table missing from `postgres.rls` is `off`, since dbdraw lists every table. Stub tables have no state.
- Canvas header: an icon before the other badges, with a tooltip that says the state and the policy count.
  - `forced`: a solid shield.
  - `enabled`: a half shield.
  - `off`: an open padlock, in amber, so unprotected tables stand out.
- Table details: a **Row-level security** card shows the state, then one block per policy: name, command, PERMISSIVE/RESTRICTIVE, roles (or `PUBLIC` when empty), and the full `USING` and `WITH CHECK` expressions in monospace. Read-only.
- Tables tab: when the diagram has RLS metadata, an "RLS off only" switch filters the list to tables with RLS off. It combines with the schema filter.

## Plan

- `src/utils/postgresMeta.js`: `rlsState(meta, table)`.
- `src/components/EditorCanvas/PostgresBadges.jsx`: header badges (RLS now, triggers in #11).
- `src/components/EditorSidePanel/TablesTab/PostgresDetails.jsx`: the cards (RLS now; triggers in #11, grants in #15).
- `Canvas.jsx`: per-table metadata map, passed to `Table`. `TableInfo.jsx`: render the cards. `TablesTab.jsx`: the switch.
- `en` strings.
