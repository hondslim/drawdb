# #19 Deep link to a table

## Spec

- `#table=<ref>` or `?table=<ref>` on any editor URL names a table. `<ref>` is `schema.name` or `name`, URL-encoded if needed. The hash wins if both are present.
- A bare `name` matches a table in the default schema first, then any table with that name.
- Once the diagram has loaded, the editor selects the table, centres it, and zooms so the whole table fits the canvas, at no more than 125% and no less than 25%.
- It applies once per diagram and link. Changing the hash in the address bar applies the new link.
- An unknown table does nothing.
- `#table=x&focus=1` is reserved for focus mode (#18).

## Plan

- `src/utils/deepLink.js`: `readTableLink(search, hash)`, `findTableByRef(tables, ref)`, `transformForTable(rect, canvasRect)`.
- `src/hooks/useTableDeepLink.js`: reads the link from the router location, waits for the table, sets the transform and selection. Called from `Canvas.jsx`.
- Tests: `src/utils/__tests__/deepLink.test.js`.
