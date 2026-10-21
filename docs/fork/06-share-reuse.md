# #6 Reuse the stored diagram for a shareId and keep its layout

## Spec

- Opening `/editor?shareId=X` fetches the share and looks for a stored diagram with `loadedFromGistId === X` (the most recently modified one if there are several).
  - Found: the shared tables are reconciled into it by `(schema, name)`, using `reconcileDbml`. Matched tables keep their ids, positions, sizes, colours, collapsed and hidden state. Matched fields and relationships keep their ids. Tables, columns and relationships missing from the share are removed. New tables are placed to the right of the existing ones.
  - The stored diagram also keeps its pan, zoom, notes and subject areas. Title, database, enums, types, views and SQL header come from the share.
  - Not found: the share is stored as a new diagram, as is.
- The share is written to IndexedDB once, then the editor opens `/editor/diagrams/<id>` and drops `shareId` from the URL, keeping any other query parameters. The normal diagram load takes over, so there is no autosave race and one record per share.
- **File → Reload from source** (shown when the diagram has a `loadedFromGistId`) runs the same path again.

## Plan

- `src/utils/share.js`: `diagramToParsed(diagram)` converts a diagram into the name-based shape `reconcileDbml` takes; `mergeShare(share, stored)` returns the record to save.
- `src/components/Workspace.jsx`: replace `loadFromGist` with `importShare`: fetch, merge, `add` or `put`, navigate.
- `ControlPanel.jsx`: the menu item. `en` string `reload_from_source`.
- Tests: `src/utils/__tests__/share.test.js`.
