import { Cardinality } from "../data/constants";
import i18n from "../i18n/i18n";

const TIMESTAMP_TYPES = new Set([
  "DATETIME",
  "DATETIME2",
  "DATETIMEOFFSET",
  "SMALLDATETIME",
]);

function isTimestamp(field) {
  const type = String(field.type ?? "").toUpperCase();
  return type.startsWith("TIMESTAMP") || TIMESTAMP_TYPES.has(type);
}

function fkOnEnd(cardinality) {
  return (
    cardinality === Cardinality.ONE_TO_MANY ||
    cardinality === i18n.t(Cardinality.ONE_TO_MANY)
  );
}

function pairsOf(relationship) {
  return Array.isArray(relationship.fields) && relationship.fields.length
    ? relationship.fields
    : [
        {
          startFieldId: relationship.startFieldId,
          endFieldId: relationship.endFieldId,
        },
      ];
}

export function foreignKeyFieldIds(tableId, relationships) {
  const ids = new Set();
  relationships.forEach((relationship) => {
    const onEnd = fkOnEnd(relationship.cardinality);
    const fkTableId = onEnd
      ? relationship.endTableId
      : relationship.startTableId;
    if (fkTableId !== tableId) return;
    pairsOf(relationship).forEach((pair) =>
      ids.add(onEnd ? pair.endFieldId : pair.startFieldId),
    );
  });
  return ids;
}

function rank(field, foreignKeys) {
  const name = String(field.name ?? "").toLowerCase();
  if (name === "created_at") return 5;
  if (name === "updated_at") return 4;
  if (field.primary) return 0;
  if (foreignKeys.has(field.id)) return 1;
  if (isTimestamp(field)) return 3;
  return 2;
}

export function orderFieldEntries(entries, tableId, relationships) {
  const foreignKeys = foreignKeyFieldIds(tableId, relationships);
  return entries
    .map((entry) => ({ entry, rank: rank(entry.field, foreignKeys) }))
    .sort(
      (a, b) =>
        a.rank - b.rank || a.entry.originalIndex - b.entry.originalIndex,
    )
    .map(({ entry }) => entry);
}
