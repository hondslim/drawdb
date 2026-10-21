import { postgresTableKey } from "./postgresMeta";

const DETAIL_KEYS = ["method", "where", "include", "expressions"];

export function indexKeySQL(index, quote) {
  return [
    ...(index.fields ?? []).map(quote),
    ...(index.expressions ?? []),
  ].join(", ");
}

export function indexDetails({ method, where, include, expressions }) {
  return {
    ...(method &&
      method.toLowerCase() !== "btree" && {
        method: method.toLowerCase(),
      }),
    ...(where && { where }),
    ...(include?.length && { include }),
    ...(expressions?.length && { expressions }),
  };
}

function withoutDetails(index) {
  return Object.fromEntries(
    Object.entries(index).filter(([key]) => !DETAIL_KEYS.includes(key)),
  );
}

export function applyIndexMetadata(tables, meta) {
  if (!meta?.indexes?.length) return tables;

  const byTable = new Map();
  meta.indexes.forEach((item) => {
    if (item.primary || item.constraint) return;
    if (!byTable.has(item.table)) byTable.set(item.table, []);
    byTable.get(item.table).push(item);
  });

  return tables.map((table) => {
    const items = byTable.get(postgresTableKey(table));
    if (!items || table.stub || table.sqlView) return table;

    const fieldNames = new Set(table.fields.map((field) => field.name));
    const constraintNames = new Set(
      (table.uniqueConstraints ?? []).map((constraint) => constraint.name),
    );
    const indices = [...(table.indices ?? [])];

    items.forEach((item) => {
      if (constraintNames.has(item.name)) return;
      const columns = item.columns ?? [];
      const entry = {
        name: item.name,
        unique: !!item.unique,
        fields: columns.filter((column) => fieldNames.has(column)),
        ...indexDetails({
          ...item,
          expressions: columns.filter((column) => !fieldNames.has(column)),
        }),
      };
      const position = indices.findIndex((index) => index.name === item.name);
      if (position === -1) {
        indices.push({ id: indices.length, ...entry });
      } else {
        indices[position] = { ...withoutDetails(indices[position]), ...entry };
      }
    });

    return { ...table, indices };
  });
}
