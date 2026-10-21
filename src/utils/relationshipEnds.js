import { Cardinality } from "../data/constants";
import i18n from "../i18n/i18n";
import { getRelationshipFields } from "./utils";

export function fkOnEnd(cardinality) {
  return (
    cardinality === Cardinality.ONE_TO_MANY ||
    cardinality === i18n.t(Cardinality.ONE_TO_MANY)
  );
}

export function deriveOptionality(rel, startTable, endTable, explicit = {}) {
  const onEnd = fkOnEnd(rel.cardinality);
  const fkTable = onEnd ? endTable : startTable;
  const fkFieldIds = getRelationshipFields(rel).map((pair) =>
    onEnd ? pair.endFieldId : pair.startFieldId,
  );
  const nullable = fkFieldIds.some((id) => {
    const field = fkTable?.fields.find((f) => f.id === id);
    return !field?.notNull && !field?.primary;
  });

  const parentKey = onEnd ? "startOptional" : "endOptional";
  const fkKey = onEnd ? "endOptional" : "startOptional";

  return {
    [parentKey]: nullable || !!explicit[parentKey],
    [fkKey]: explicit[fkKey] ? true : undefined,
  };
}
