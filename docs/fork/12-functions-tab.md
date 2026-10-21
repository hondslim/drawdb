# #12 Functions and procedures tab

## Spec

Builds on #9 and #11.

- A **Functions** sidebar tab appears for Postgres diagrams whose metadata has at least one function. Its label shows the count.
- A search box filters by schema, name or return type.
- Each function is a collapsible entry. The header shows `schema.name(arguments)` and `→ returns`, with tags for language, volatility, `SECURITY DEFINER` and `PROCEDURE`.
- The body shows the triggers that execute the function, each a link to its table, and then the body in a read-only Monaco editor with `pgsql` highlighting.
- A trigger's function in the table's Triggers card is a link that opens the Functions tab with that function expanded and scrolled into view.
- A trigger names its function as `schema.name` or `name` (meaning `public`). It matches every overload of that name.

## Plan

- `src/utils/postgresMeta.js`: `functionKey(fn)`, `triggerFunctionKey(trigger)`, `triggersByFunction(meta)`.
- `src/data/constants.js`: `Tab.FUNCTIONS`, `ObjectType.FUNCTION`.
- `src/components/EditorSidePanel/FunctionsTab.jsx`, registered in `SidePanel.jsx`.
- `PostgresDetails.jsx`: pass `onFunctionClick`.
- `en` strings.
