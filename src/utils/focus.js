import { autoArrange } from "./autoArrange";
import { getTableHeight, getTableWidth } from "./utils";

export function neighbourhood(tableId, relationships, hops) {
  const reached = new Set([tableId]);
  let ring = [tableId];
  for (let hop = 0; hop < hops && ring.length; hop++) {
    const next = [];
    for (const r of relationships) {
      for (const [from, to] of [
        [r.startTableId, r.endTableId],
        [r.endTableId, r.startTableId],
      ]) {
        if (ring.includes(from) && !reached.has(to)) {
          reached.add(to);
          next.push(to);
        }
      }
    }
    ring = next;
  }
  return reached;
}

export function focusView(tables, relationships, focus, settings) {
  if (!focus || !tables.some((t) => t.id === focus.tableId)) return null;

  const ids = neighbourhood(focus.tableId, relationships, focus.hops);
  const visibleRelationships = relationships.filter(
    (r) => ids.has(r.startTableId) && ids.has(r.endTableId),
  );
  const visible = tables
    .filter((t) => ids.has(t.id))
    .map((t) => ({ ...t, locked: false, hidden: false }));

  const positions = new Map(
    autoArrange(visible, visibleRelationships, settings).map((p) => [p.id, p]),
  );
  const arranged = visible.map((t) => ({
    ...t,
    x: positions.get(t.id)?.x ?? t.x,
    y: positions.get(t.id)?.y ?? t.y,
    locked: true,
  }));

  const minX = Math.min(...arranged.map((t) => t.x));
  const minY = Math.min(...arranged.map((t) => t.y));
  const maxX = Math.max(...arranged.map((t) => t.x + getTableWidth(t)));
  const maxY = Math.max(
    ...arranged.map(
      (t) =>
        t.y + getTableHeight(t, settings.showComments, visibleRelationships),
    ),
  );

  return {
    tables: arranged,
    relationships: visibleRelationships,
    bounds: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
  };
}
