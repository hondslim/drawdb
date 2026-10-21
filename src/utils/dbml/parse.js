import { Parser } from "@dbml/core";
import { Cardinality, Constraint } from "../../data/constants";
import { inlineEnumTypeName } from "./types";
import { findTable, normalizeSchema } from "../schema";
import { declareStubTables, stubKey } from "./stubs";
import { indexDetails } from "../indexes";

const parser = new Parser();

const CONSTRAINT_BY_KEYWORD = {
  "no action": Constraint.NONE,
  restrict: Constraint.RESTRICT,
  cascade: Constraint.CASCADE,
  "set null": Constraint.SET_NULL,
  "set default": Constraint.SET_DEFAULT,
};

const CARDINALITY_BY_RELATION = {
  "*:1": Cardinality.MANY_TO_ONE,
  "1:*": Cardinality.ONE_TO_MANY,
  "1:1": Cardinality.ONE_TO_ONE,
};

const OPTIONAL_PREFIX = "0..";

function splitRelation(relation) {
  const value = String(relation ?? "");
  const optional = value.startsWith(OPTIONAL_PREFIX);
  return {
    multiplicity: optional ? value.slice(OPTIONAL_PREFIX.length) : value,
    optional,
  };
}

function parseChecks(checks) {
  return (checks ?? []).map((check) => ({
    name: check.name ?? "",
    expression: String(check.expression ?? ""),
  }));
}

function baseTypeName(type) {
  const name = String(type?.type_name ?? "");
  if (type?.args == null) return name;

  const openingBracket = name.lastIndexOf("(");
  return openingBracket === -1 ? name : name.slice(0, openingBracket);
}

function fieldDefault(column) {
  const value = column.dbdefault?.value;
  return value === undefined || value === null ? "" : String(value);
}

function parseField(column, primaryKeyColumns) {
  const rawType = String(column.type?.type_name ?? "");
  const isArray = rawType.endsWith("[]");
  const type = isArray
    ? { ...column.type, type_name: rawType.slice(0, -2) }
    : column.type;
  return {
    name: column.name,
    type: baseTypeName(type).toUpperCase(),
    ...(isArray && { isArray: true }),
    size: type?.args ?? "",
    default: fieldDefault(column),
    primary: !!column.pk || primaryKeyColumns.has(column.name),
    unique: !!column.unique,
    notNull: !!column.not_null,
    increment: !!column.increment,
    comment: column.note ?? "",
    check: joinChecks(
      parseChecks(column.checks).filter((check) => !check.name),
    ),
  };
}

function joinChecks(checks) {
  if (checks.length <= 1) return checks[0]?.expression ?? "";
  return checks.map((check) => `(${check.expression})`).join(" AND ");
}

function parseTable(table) {
  const compositeKey = table.indexes.find((index) => index.pk);
  const primaryKeyColumns = new Set(
    compositeKey?.columns.map((column) => column.value) ?? [],
  );

  return {
    name: table.name,
    schema: normalizeSchema(table.schema?.name),
    comment: table.note ?? "",
    color: table.headerColor ?? null,
    fields: table.fields.map((field) => parseField(field, primaryKeyColumns)),
    checks: [
      ...table.fields.flatMap((column) =>
        parseChecks(column.checks).filter((check) => check.name),
      ),
      ...parseChecks(table.checks),
    ],
    indices: table.indexes
      .filter((index) => !index.pk)
      .map((index) => ({
        name: index.name ?? "",
        fields: index.columns
          .filter((column) => column.type !== "expression")
          .map((column) => column.value),
        unique: !!index.unique,
        ...indexDetails({
          method: index.type,
          expressions: index.columns
            .filter((column) => column.type === "expression")
            .map((column) => column.value),
        }),
      })),
  };
}

function parseRef(ref) {
  const [start, end] = ref.endpoints;
  const startRelation = splitRelation(start.relation);
  const endRelation = splitRelation(end.relation);
  const cardinality =
    CARDINALITY_BY_RELATION[
      `${startRelation.multiplicity}:${endRelation.multiplicity}`
    ];
  if (!cardinality) return null;

  return {
    name:
      ref.name ||
      `fk_${start.tableName}_${start.fieldNames[0]}_${end.tableName}`,
    startSchemaName: normalizeSchema(start.schemaName),
    startTableName: start.tableName,
    startFieldNames: [...start.fieldNames],
    endSchemaName: normalizeSchema(end.schemaName),
    endTableName: end.tableName,
    endFieldNames: [...end.fieldNames],
    cardinality,
    startOptional: startRelation.optional,
    endOptional: endRelation.optional,
    deleteConstraint: constraintFor(ref.onDelete),
    updateConstraint: constraintFor(ref.onUpdate),
  };
}

function constraintFor(keyword) {
  return (
    CONSTRAINT_BY_KEYWORD[String(keyword).toLowerCase()] ?? Constraint.NONE
  );
}

function foldInlineEnums(tables, enums) {
  const enumsByName = new Map(enums.map((en) => [en.name.toUpperCase(), en]));
  const folded = new Set();

  for (const table of tables) {
    for (const field of table.fields) {
      const candidate = enumsByName.get(field.type);
      if (!candidate) continue;

      const expected = inlineEnumTypeName({
        name: field.name,
        values: candidate.values,
      });
      if (expected.toUpperCase() !== field.type) continue;

      field.type = "ENUM";
      field.values = [...candidate.values];
      folded.add(candidate.name);
    }
  }

  return enums.filter((en) => !folded.has(en.name));
}

function typeStubColumns(tables, relationships) {
  const stubColumn = (schema, tableName, fieldName) =>
    findTable(tables, schema, tableName)?.stub &&
    findTable(tables, schema, tableName).fields.find(
      (field) => field.name === fieldName,
    );
  const sourceColumn = (schema, tableName, fieldName) =>
    findTable(tables, schema, tableName)?.fields.find(
      (field) => field.name === fieldName,
    );

  for (const ref of relationships) {
    ref.startFieldNames.forEach((startName, i) => {
      const endName = ref.endFieldNames[i];
      const pairs = [
        [
          stubColumn(ref.startSchemaName, ref.startTableName, startName),
          sourceColumn(ref.endSchemaName, ref.endTableName, endName),
        ],
        [
          stubColumn(ref.endSchemaName, ref.endTableName, endName),
          sourceColumn(ref.startSchemaName, ref.startTableName, startName),
        ],
      ];
      for (const [stub, source] of pairs) {
        if (!stub || !source || stub.type !== "UNKNOWN") continue;
        stub.type = source.type;
        stub.size = source.size;
      }
    });
  }
}

export function parseDbml(dbml) {
  const { src, stubs } = declareStubTables(dbml);
  const ast = parser.parse(src, "dbmlv2");

  const tables = [];
  const relationships = [];
  const enums = [];

  for (const schema of ast.schemas) {
    tables.push(...schema.tables.map(parseTable));
    relationships.push(...schema.refs.map(parseRef).filter(Boolean));
    enums.push(
      ...schema.enums.map((en) => ({
        name: en.name,
        values: en.values.map((value) => value.name),
      })),
    );
  }

  tables.forEach((table) => {
    if (stubs.has(stubKey(table.schema, table.name))) table.stub = true;
  });
  typeStubColumns(tables, relationships);

  return {
    tables,
    relationships,
    enums: foldInlineEnums(tables, enums),
  };
}
