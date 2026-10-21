import { qualifiedName, tableKey } from "./schema";
import { getRelationshipFields } from "./utils";

const FIELD_PROPS = [
  ["type", "type"],
  ["size", "size"],
  ["isArray", "array"],
  ["notNull", "NOT NULL"],
  ["default", "default"],
  ["primary", "primary key"],
  ["unique", "unique"],
  ["check", "check"],
  ["identity", "identity"],
  ["generated", "generated"],
  ["domain", "domain"],
];

const TABLE_PROPS = ["indices", "uniqueConstraints", "checks", "comment"];

const RELATIONSHIP_PROPS = [
  ["cardinality", "cardinality"],
  ["updateConstraint", "ON UPDATE"],
  ["deleteConstraint", "ON DELETE"],
  ["deferrable", "deferrable"],
];

function normalized(value) {
  if (value === undefined || value === null || value === false) return "";
  if (typeof value === "object") return JSON.stringify(stripIds(value));
  return String(value);
}

function stripIds(value) {
  if (Array.isArray(value)) return value.map(stripIds);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key !== "id")
        .map(([key, item]) => [key, stripIds(item)]),
    );
  }
  return value;
}

function describe(label, before, after) {
  if (label === "NOT NULL") {
    return `${before ? "NOT NULL" : "NULL"} → ${after ? "NOT NULL" : "NULL"}`;
  }
  if (typeof before === "boolean" || typeof after === "boolean") {
    return `${label} ${before ? "on" : "off"} → ${after ? "on" : "off"}`;
  }
  return `${label} ${before || "∅"} → ${after || "∅"}`;
}

function fieldChanges(before, after) {
  return FIELD_PROPS.filter(
    ([key]) => normalized(before[key]) !== normalized(after[key]),
  ).map(([key, label]) => describe(label, before[key], after[key]));
}

function relationshipSignature(rel, tablesById) {
  const start = tablesById.get(rel.startTableId);
  const end = tablesById.get(rel.endTableId);
  if (!start || !end) return null;
  const pairs = getRelationshipFields(rel);
  const names = (table, ids) =>
    ids.map((id) => table.fields.find((f) => f.id === id)?.name).join(",");
  return `${tableKey(start)}(${names(
    start,
    pairs.map((p) => p.startFieldId),
  )})>${tableKey(end)}(${names(
    end,
    pairs.map((p) => p.endFieldId),
  )})`;
}

function signatures(diagram) {
  const tablesById = new Map(diagram.tables.map((t) => [t.id, t]));
  const bySignature = new Map();
  (diagram.relationships ?? []).forEach((rel) => {
    const signature = relationshipSignature(rel, tablesById);
    if (signature) bySignature.set(signature, rel);
  });
  return bySignature;
}

export function computeDiff(base, current) {
  const tables = new Map();
  const relationships = new Map();
  const removedTables = [];
  const removedRelationships = [];
  const changes = [];

  const baseByKey = new Map((base.tables ?? []).map((t) => [tableKey(t), t]));
  const currentByKey = new Map(current.tables.map((t) => [tableKey(t), t]));

  current.tables.forEach((table) => {
    const before = baseByKey.get(tableKey(table));
    const name = qualifiedName(table);
    if (!before) {
      tables.set(table.id, {
        status: "added",
        fields: new Map(),
        removedFields: [],
        details: [],
      });
      changes.push({ kind: "table", status: "added", name, tableId: table.id });
      return;
    }

    const details = TABLE_PROPS.filter(
      (key) => normalized(before[key]) !== normalized(table[key]),
    );
    const fields = new Map();
    table.fields.forEach((field) => {
      const old = before.fields.find((f) => f.name === field.name);
      if (!old) {
        fields.set(field.id, { status: "added", details: [] });
        changes.push({
          kind: "column",
          status: "added",
          table: name,
          name: field.name,
          tableId: table.id,
        });
        return;
      }
      const fieldDetails = fieldChanges(old, field);
      if (!fieldDetails.length) return;
      fields.set(field.id, { status: "changed", details: fieldDetails });
      changes.push({
        kind: "column",
        status: "changed",
        table: name,
        name: field.name,
        tableId: table.id,
        details: fieldDetails,
      });
    });
    const removedFields = before.fields.filter(
      (old) => !table.fields.some((f) => f.name === old.name),
    );
    removedFields.forEach((field) =>
      changes.push({
        kind: "column",
        status: "removed",
        table: name,
        name: field.name,
        tableId: table.id,
      }),
    );
    if (details.length) {
      changes.push({
        kind: "table",
        status: "changed",
        name,
        tableId: table.id,
        details,
      });
    }

    if (details.length || fields.size || removedFields.length) {
      tables.set(table.id, {
        status: details.length ? "changed" : null,
        fields,
        removedFields,
        details,
      });
    }
  });

  (base.tables ?? []).forEach((table) => {
    if (currentByKey.has(tableKey(table))) return;
    removedTables.push(table);
    changes.push({
      kind: "table",
      status: "removed",
      name: qualifiedName(table),
    });
  });

  const baseRelationships = signatures(base);
  const currentRelationships = signatures(current);
  currentRelationships.forEach((rel, signature) => {
    const before = baseRelationships.get(signature);
    if (!before) {
      relationships.set(rel.id, { status: "added", details: [] });
      changes.push({
        kind: "relationship",
        status: "added",
        name: signature,
        tableId: rel.startTableId,
      });
      return;
    }
    const details = RELATIONSHIP_PROPS.filter(
      ([key]) => normalized(before[key]) !== normalized(rel[key]),
    ).map(([key, label]) => describe(label, before[key], rel[key]));
    if (!details.length) return;
    relationships.set(rel.id, { status: "changed", details });
    changes.push({
      kind: "relationship",
      status: "changed",
      name: signature,
      tableId: rel.startTableId,
      details,
    });
  });

  const baseTablesById = new Map((base.tables ?? []).map((t) => [t.id, t]));
  baseRelationships.forEach((rel, signature) => {
    if (currentRelationships.has(signature)) return;
    const start = currentByKey.get(
      tableKey(baseTablesById.get(rel.startTableId)),
    );
    const end = currentByKey.get(tableKey(baseTablesById.get(rel.endTableId)));
    removedRelationships.push({
      name: rel.name,
      signature,
      startTableId: start?.id ?? null,
      endTableId: end?.id ?? null,
    });
    changes.push({
      kind: "relationship",
      status: "removed",
      name: signature,
      tableId: start?.id,
    });
  });

  return {
    tables,
    relationships,
    removedTables,
    removedRelationships,
    changes,
  };
}
