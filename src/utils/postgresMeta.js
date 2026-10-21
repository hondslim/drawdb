import { DEFAULT_SCHEMA } from "./schema";

const TABLE_LISTS = ["policies", "triggers", "grants", "indexes"];

export function qualifyTableName(name) {
  const value = String(name ?? "");
  return value.includes(".") ? value : `${DEFAULT_SCHEMA}.${value}`;
}

export function postgresTableKey(table) {
  return `${table.schema || DEFAULT_SCHEMA}.${table.name}`;
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

function withTable(item) {
  return { ...item, table: qualifyTableName(item.table) };
}

export function normalizePostgresMeta(meta) {
  if (!meta || typeof meta !== "object") return null;

  const rls = Object.fromEntries(
    Object.entries(meta.rls ?? {}).map(([table, state]) => [
      qualifyTableName(table),
      { enabled: !!state?.enabled, forced: !!state?.forced },
    ]),
  );

  return {
    ...meta,
    rls,
    policies: list(meta.policies).map((policy) => ({
      command: "ALL",
      permissive: true,
      roles: [],
      using: null,
      withCheck: null,
      ...withTable(policy),
    })),
    triggers: list(meta.triggers).map((trigger) => ({
      events: [],
      level: "ROW",
      when: null,
      enabled: true,
      ...withTable(trigger),
    })),
    functions: list(meta.functions).map((fn) => ({
      schema: DEFAULT_SCHEMA,
      arguments: "",
      kind: "function",
      securityDefiner: false,
      ...fn,
    })),
    grants: list(meta.grants).map((grant) => ({
      privileges: [],
      ...withTable(grant),
    })),
    indexes: list(meta.indexes).map((index) => ({
      unique: false,
      method: "btree",
      columns: [],
      include: [],
      where: null,
      ...withTable(index),
    })),
    views: list(meta.views),
  };
}

export function metadataForTable(meta, table) {
  if (!meta) return null;
  const key = postgresTableKey(table);
  return {
    rls: meta.rls?.[key] ?? null,
    ...Object.fromEntries(
      TABLE_LISTS.map((name) => [
        name,
        list(meta[name]).filter((item) => item.table === key),
      ]),
    ),
  };
}
