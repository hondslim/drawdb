import { Constraint } from "../data/constants";
import { postgresTableKey } from "./postgresMeta";
import { getRelationshipFields } from "./utils";

const LABELLED_DELETES = {
  [Constraint.CASCADE.toLowerCase()]: "CASCADE",
  [Constraint.SET_NULL.toLowerCase()]: "SET NULL",
  [Constraint.SET_DEFAULT.toLowerCase()]: "SET DEFAULT",
};

export function relationshipFlags(rel) {
  return [
    LABELLED_DELETES[String(rel.deleteConstraint ?? "").toLowerCase()],
    rel.deferrable,
  ].filter(Boolean);
}

function omit(object, keys) {
  return Object.fromEntries(
    Object.entries(object).filter(([key]) => !keys.includes(key)),
  );
}

function groupByTable(items) {
  const byTable = new Map();
  (items ?? []).forEach((item) => {
    if (!byTable.has(item.table)) byTable.set(item.table, []);
    byTable.get(item.table).push(item);
  });
  return byTable;
}

function deferrableValue(fk) {
  if (!fk.deferrable) return undefined;
  return fk.initiallyDeferred ? "DEFERRED" : "IMMEDIATE";
}

export function applyColumnMetadata(tables, relationships, meta) {
  if (!meta) return { tables, relationships };
  const columns = groupByTable(meta.columns);
  const foreignKeys = groupByTable(meta.foreignKeys);

  const nextTables = tables.map((table) => {
    if (table.stub || table.sqlView) return table;
    const items = columns.get(postgresTableKey(table)) ?? [];
    return {
      ...table,
      fields: table.fields.map((field) => {
        const item = items.find((c) => c.column === field.name) ?? {};
        return {
          ...omit(field, ["identity", "generated", "domain"]),
          ...(item.identity && {
            identity: String(item.identity).toUpperCase(),
          }),
          ...(item.generated && { generated: item.generated }),
          ...(item.domain && { domain: item.domain }),
        };
      }),
    };
  });

  const tablesById = new Map(nextTables.map((table) => [table.id, table]));
  const nextRelationships = relationships.map((rel) => {
    const start = tablesById.get(rel.startTableId);
    if (!start) return rel;
    const items = foreignKeys.get(postgresTableKey(start)) ?? [];

    const columnNames = getRelationshipFields(rel).map(
      (pair) => start.fields.find((f) => f.id === pair.startFieldId)?.name,
    );
    const fk =
      items.find(
        (item) =>
          Array.isArray(item.columns) &&
          item.columns.length === columnNames.length &&
          item.columns.every((column, i) => column === columnNames[i]),
      ) ?? items.find((item) => item.name && item.name === rel.name);
    const rest = omit(rel, ["deferrable"]);
    const deferrable = fk && deferrableValue(fk);
    return deferrable ? { ...rest, deferrable } : rest;
  });

  return { tables: nextTables, relationships: nextRelationships };
}
