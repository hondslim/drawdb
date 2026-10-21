import { reconcileDbml } from "./dbml/reconcile";
import { tableKey } from "./schema";
import { getRelationshipFields } from "./utils";
import { normalizePostgresMeta } from "./postgresMeta";
import { placeSqlViews, sqlViewTables } from "./sqlViews";
import { applyIndexMetadata } from "./indexes";
import { applyColumnMetadata } from "./columnDetails";
import {
  fitSourceAreas,
  layoutAreaClusters,
  placeNewAreaMembers,
} from "./subjectAreas";

function parsedField(field) {
  return {
    name: field.name,
    type: field.type,
    size: field.size ?? "",
    default: field.default ?? "",
    check: field.check ?? "",
    primary: !!field.primary,
    unique: !!field.unique,
    notNull: !!field.notNull,
    increment: !!field.increment,
    comment: field.comment ?? "",
    ...(field.values && { values: field.values }),
    ...(field.isArray && { isArray: true }),
  };
}

function parsedTable(table) {
  return {
    name: table.name,
    schema: table.schema ?? "",
    comment: table.comment ?? "",
    fields: (table.fields ?? []).map(parsedField),
    indices: [
      ...(table.indices ?? []).map((index) => ({
        ...index,
        unique: !!index.unique,
      })),
      ...(table.uniqueConstraints ?? []).map((constraint) => ({
        name: constraint.name,
        fields: constraint.fields,
        unique: true,
      })),
    ],
    checks: table.checks ?? [],
    ...(table.stub && { stub: true }),
    ...(table.sqlView && { sqlView: table.sqlView }),
  };
}

function parsedRelationship(rel, tablesById) {
  const start = tablesById.get(rel.startTableId);
  const end = tablesById.get(rel.endTableId);
  if (!start || !end) return null;

  const pairs = getRelationshipFields(rel);
  const fieldName = (table, id) => table.fields.find((f) => f.id === id)?.name;
  const startFieldNames = pairs.map((p) => fieldName(start, p.startFieldId));
  const endFieldNames = pairs.map((p) => fieldName(end, p.endFieldId));
  if ([...startFieldNames, ...endFieldNames].some((name) => !name)) return null;

  return {
    name: rel.name,
    startSchemaName: start.schema ?? "",
    startTableName: start.name,
    startFieldNames,
    endSchemaName: end.schema ?? "",
    endTableName: end.name,
    endFieldNames,
    cardinality: rel.cardinality,
    startOptional: !!rel.startOptional,
    endOptional: !!rel.endOptional,
    updateConstraint: rel.updateConstraint,
    deleteConstraint: rel.deleteConstraint,
  };
}

export function diagramToParsed(diagram) {
  const tables = diagram.tables ?? [];
  const tablesById = new Map(tables.map((table) => [table.id, table]));
  return {
    tables: tables.map(parsedTable),
    relationships: (diagram.relationships ?? [])
      .map((rel) => parsedRelationship(rel, tablesById))
      .filter(Boolean),
    enums: (diagram.enums ?? []).map((en) => ({
      name: en.name,
      values: en.values ?? [],
    })),
  };
}

function sharedState(share) {
  return {
    database: share.database,
    name: share.title,
    views: share.views ?? [],
    types: share.types ?? [],
    sqlHeader: share.sqlHeader ?? "",
    postgres: normalizePostgresMeta(share.postgres),
    diffBase: share.base
      ? {
          tables: share.base.tables ?? [],
          relationships: share.base.relationships ?? [],
        }
      : null,
    lastModified: new Date(),
  };
}

export function mergeShare(share, stored, shareId) {
  return withAreas(
    withColumnMetadata(mergeTables(share, stored, shareId), share),
    share,
    stored,
  );
}

function withAreas(record, share, stored) {
  if (!Array.isArray(share.areas)) return record;

  if (!stored) {
    return {
      ...record,
      ...layoutAreaClusters(
        record.tables,
        record.references,
        share.areas,
        record.areas,
      ),
    };
  }

  const storedIds = new Set((stored.tables ?? []).map((table) => table.id));
  const tables = placeNewAreaMembers(record.tables, share.areas, storedIds);
  return {
    ...record,
    tables,
    areas: fitSourceAreas(tables, share.areas, record.areas),
  };
}

function withColumnMetadata(record, share) {
  const meta = normalizePostgresMeta(share.postgres);
  const { tables, relationships } = applyColumnMetadata(
    applyIndexMetadata(record.tables, meta),
    record.references,
    meta,
  );
  return { ...record, tables, references: relationships };
}

function mergeTables(share, stored, shareId) {
  const viewTables = sqlViewTables(share.postgres?.views);
  if (!stored) {
    return {
      ...sharedState(share),
      gistId: shareId,
      loadedFromGistId: shareId,
      tables: placeSqlViews(share.tables ?? [], viewTables),
      references: share.relationships ?? [],
      enums: share.enums ?? [],
      notes: share.notes ?? [],
      areas: share.subjectAreas ?? [],
      pan: share.transform?.pan ?? { x: 0, y: 0 },
      zoom: share.transform?.zoom ?? 1,
    };
  }

  const reconciled = reconcileDbml(
    diagramToParsed({
      ...share,
      tables: [...(share.tables ?? []), ...viewTables],
    }),
    {
      tables: stored.tables ?? [],
      relationships: stored.references ?? [],
      enums: stored.enums ?? [],
    },
    share.database,
    { keepSqlViews: false },
  );

  const storedIds = new Set((stored.tables ?? []).map((table) => table.id));
  const sharedByKey = new Map(
    [...(share.tables ?? []), ...viewTables].map((table) => [
      tableKey(table),
      table,
    ]),
  );
  reconciled.tables.forEach((table) => {
    if (storedIds.has(table.id)) return;
    const shared = sharedByKey.get(tableKey(table));
    if (shared?.color) table.color = shared.color;
  });

  return {
    ...stored,
    ...sharedState(share),
    loadedFromGistId: shareId,
    tables: reconciled.tables,
    references: reconciled.relationships,
    enums: reconciled.enums,
  };
}
