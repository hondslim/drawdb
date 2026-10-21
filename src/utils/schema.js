export const DEFAULT_SCHEMA = "public";

export function normalizeSchema(schema) {
  const value = String(schema ?? "").trim();
  return value === DEFAULT_SCHEMA ? "" : value;
}

export function tableKey(table) {
  return `${table.schema ?? ""}\u0000${table.name}`;
}

export function qualifiedName(table) {
  return table.schema ? `${table.schema}.${table.name}` : table.name;
}

export function findTable(tables, schema, name) {
  const normalized = normalizeSchema(schema);
  return tables.find(
    (table) => table.name === name && (table.schema ?? "") === normalized,
  );
}

export function diagramSchemas(tables) {
  return [...new Set(tables.map((table) => table.schema ?? ""))];
}

export function hasMultipleSchemas(tables) {
  return diagramSchemas(tables).length > 1;
}
