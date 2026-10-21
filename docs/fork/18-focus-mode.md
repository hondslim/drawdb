# #18 Focus mode: a table and its N-hop neighbours

## Spec

- Focus mode shows one table and every table within 1, 2 or 3 FK hops of it, following relationships in both directions. Everything else (other tables, their relationships, notes, areas and views) is hidden.
- The visible tables are laid out with the existing dagre `autoArrange`, and the view fits them. These positions are temporary: they are not saved, and leaving focus mode shows the saved layout again. Tables cannot be dragged while in focus mode.
- Entering: **Focus** in a table's "more" menu (1 hop), or a deep link `#table=x&focus=N` (`N` = 1, 2 or 3).
- A bar at the top of the canvas names the focused table, switches between 1, 2 and 3 hops, and has an Exit button. Esc also exits.
- Focus state lives in the layout, not in the diagram. It is cleared when the focused table no longer exists.

## Plan

- `src/utils/focus.js`: `neighbourhood(tableId, relationships, hops)` (BFS), `focusView(tables, relationships, focus, settings)` returning arranged copies of the visible tables, the visible relationships and their bounds.
- `src/context/LayoutContext.jsx`: `focus: null`.
- `src/components/EditorCanvas/Canvas.jsx`: render from `focusView` when focused; fit the view when focus changes.
- `src/components/EditorCanvas/FocusBar.jsx`: the bar and the Esc handler.
- `Table.jsx`: the menu item. `deepLink.js` and `useTableDeepLink.js`: `focus=N`.
- `en` strings: `focus`, `focus_on`, `hops`, `exit_focus`.
