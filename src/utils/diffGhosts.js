import { getTableHeight, getTableWidth } from "./utils";

const FIELD_HEIGHT = 36;
const HEADER_HEIGHT = 50;
const GHOST_GAP = 80;

function rectOf(table) {
  return {
    x: table.x,
    y: table.y,
    width: getTableWidth(table),
    height: getTableHeight(table, false, []),
  };
}

function overlaps(a, b) {
  return (
    a.x < b.x + b.width &&
    b.x < a.x + a.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height
  );
}

export function ghostRects(removedTables, tables) {
  const rightEdge = tables.length
    ? Math.max(...tables.map((t) => t.x + getTableWidth(t)))
    : 0;
  let fallbackY = tables.length ? Math.min(...tables.map((t) => t.y)) : 0;

  return removedTables.map((table) => {
    const width = getTableWidth(table);
    const height = HEADER_HEIGHT + table.fields.length * FIELD_HEIGHT;
    let { x, y } = table;
    const blocked =
      x === undefined ||
      y === undefined ||
      tables.some((t) => overlaps(rectOf(t), { x, y, width, height }));
    if (blocked) {
      x = rightEdge + GHOST_GAP;
      y = fallbackY;
      fallbackY += height + GHOST_GAP;
    }
    return { table, x, y, width, height };
  });
}
