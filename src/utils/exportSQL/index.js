import { DB } from "../../data/constants";
import { toMariaDB } from "./mariadb";
import { toMSSQL } from "./mssql";
import { toMySQL } from "./mysql";
import { toOracleSQL } from "./oraclesql";
import { toPostgres } from "./postgres";
import { toSqlite } from "./sqlite";

export function exportSQL(diagram) {
  const sql = schemaSQL(withoutStubTables(diagram));
  const header = diagram.sqlHeader?.trim();
  return header ? `${header}\n\n${sql}` : sql;
}

function schemaSQL(diagram) {
  switch (diagram.database) {
    case DB.SQLITE:
      return toSqlite(diagram);
    case DB.MYSQL:
      return toMySQL(diagram);
    case DB.POSTGRES:
      return toPostgres(diagram);
    case DB.MARIADB:
      return toMariaDB(diagram);
    case DB.MSSQL:
      return toMSSQL(diagram);
    case DB.ORACLESQL:
      return toOracleSQL(diagram);
    default:
      return "";
  }
}

function withoutStubTables(diagram) {
  if (!diagram.tables?.some((table) => table.stub)) return diagram;
  const stubIds = new Set(
    diagram.tables.filter((table) => table.stub).map((table) => table.id),
  );
  const keepsStubReferences = diagram.database === DB.POSTGRES;
  return {
    ...diagram,
    tables: diagram.tables.filter((table) => !table.stub),
    stubTables: diagram.tables.filter((table) => table.stub),
    references: (diagram.references ?? []).filter(
      (r) =>
        keepsStubReferences ||
        (!stubIds.has(r.startTableId) && !stubIds.has(r.endTableId)),
    ),
  };
}
