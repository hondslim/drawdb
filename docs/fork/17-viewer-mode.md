# #17 Read-only viewer mode by URL parameter

## Spec

- `?readOnly=true` opens the editor as a viewer. It applies to any editor URL, including `/editor?shareId=X&readOnly=true`.
- In viewer mode `layout.readOnly` is on, so tables, fields, relationships, enums, notes' text and so on cannot be changed: every control that respects `readOnly` today is disabled, and creating a relationship by dragging from a field is blocked.
- Moving tables, notes and areas, auto-arrange, panning and zooming still work. The new positions are saved to the diagram's existing IndexedDB record.
- Viewer mode never adds a diagram to IndexedDB from the editor's save path. With a shareId, the share import from #6 keeps one record per share, which is what holds the positions.
- Today's `readOnly` (cloud diagrams without write access) is unchanged: no moves, no saves.
- The Share modal's query-parameter options list `readOnly` like the other keys.

## Plan

- `src/utils/queryConfig.js`: `readOnly` key with `isActive`.
- `src/context/LayoutContext.jsx`: the effective layout gets `readOnly: true` and `viewer: true` when the parameter is active.
- `src/components/EditorCanvas/Canvas.jsx`: let drags through when `layout.viewer`; guard `handleLinking` with `readOnly`.
- `src/components/Workspace.jsx`: the save effect runs in viewer mode; `save()` only modifies an existing record when `layout.viewer`.
