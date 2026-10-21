import { DEFAULT_SCHEMA, normalizeSchema } from "./schema";

const MAX_ZOOM = 1.25;
const MIN_ZOOM = 0.25;
const PADDING = 80;

export function readTableLink(search, hash) {
  const fromHash = new URLSearchParams(String(hash ?? "").replace(/^#/, ""));
  const fromSearch = new URLSearchParams(search ?? "");
  const params = fromHash.has("table") ? fromHash : fromSearch;
  const table = params.get("table");
  if (!table) return null;
  return { table, focus: params.get("focus") === "1" };
}

export function findTableByRef(tables, ref) {
  const value = String(ref ?? "").trim();
  const dot = value.indexOf(".");
  if (dot !== -1) {
    const schema = normalizeSchema(value.slice(0, dot));
    const name = value.slice(dot + 1);
    const qualified = tables.find(
      (t) => (t.schema ?? "") === schema && t.name === name,
    );
    if (qualified || value.startsWith(`${DEFAULT_SCHEMA}.`)) return qualified;
  }
  return (
    tables.find((t) => !t.schema && t.name === value) ??
    tables.find((t) => t.name === value)
  );
}

export function transformForTable(rect, canvas) {
  const fit = Math.min(
    canvas.width / (rect.width + PADDING),
    canvas.height / (rect.height + PADDING),
  );
  const zoom = Math.max(
    MIN_ZOOM,
    Math.min(MAX_ZOOM, Math.floor(fit * 20) / 20),
  );
  return {
    zoom,
    pan: { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 },
  };
}
