import { describe, expect, it } from "vitest";
import { fromDBML } from "../importFrom/dbml";
import { toDBML } from "../exportAs/dbml";
import { toPostgres } from "../exportSQL/postgres";
import { fromPostgres } from "../importSQL/postgres";
import { getIssues } from "../issues";
import { DB } from "../../data/constants";
import pkg from "node-sql-parser";

const multiSchema = `
Table digivacc.users {
  id uuid [pk]
  auth_user_id uuid
}

Table auth.users {
  id uuid [pk]
}

Table plain {
  id int [pk]
}

Ref: digivacc.users.auth_user_id > auth.users.id
`;

function diagramFrom(imported, database = DB.POSTGRES) {
  return {
    database,
    notes: [],
    areas: [],
    types: [],
    views: [],
    ...imported,
    references: imported.relationships,
  };
}

describe("schemas from DBML", () => {
  const imported = fromDBML(multiSchema, DB.POSTGRES);

  it("imports two tables with one name in different schemas", () => {
    expect(imported.tables.map((t) => [t.schema, t.name])).toEqual([
      ["digivacc", "users"],
      ["auth", "users"],
      ["", "plain"],
    ]);
  });

  it("draws a cross-schema FK between the right tables", () => {
    const [digivaccUsers, authUsers] = imported.tables;
    expect(imported.relationships).toHaveLength(1);
    expect(imported.relationships[0].startTableId).toBe(digivaccUsers.id);
    expect(imported.relationships[0].endTableId).toBe(authUsers.id);
  });

  it("exports schema-qualified DBML that imports back the same", () => {
    const dbml = toDBML(diagramFrom(imported));
    expect(dbml).toContain("Table digivacc.users");
    expect(dbml).toContain("Table auth.users");
    expect(dbml).toContain("Table plain");
    expect(dbml).toContain("digivacc.users.auth_user_id > auth.users.id");
    const again = fromDBML(dbml, DB.POSTGRES);
    expect(toDBML(diagramFrom(again))).toEqual(dbml);
  });

  it("does not report the two users tables as duplicates", () => {
    expect(
      getIssues(diagramFrom(imported)).filter((i) => i.includes("users")),
    ).toEqual([]);
  });

  it("exports schema-qualified Postgres SQL", () => {
    const sql = toPostgres(diagramFrom(imported));
    expect(sql).toContain('CREATE SCHEMA IF NOT EXISTS "digivacc";');
    expect(sql).toContain('CREATE SCHEMA IF NOT EXISTS "auth";');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "digivacc"."users"');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "plain"');
    expect(sql).toContain('ALTER TABLE "digivacc"."users"');
    expect(sql).toContain('REFERENCES "auth"."users"("id")');
  });
});

describe("schemas from Postgres SQL", () => {
  const sql = `
CREATE TABLE auth.users (id uuid PRIMARY KEY);
CREATE TABLE digivacc.users (id uuid PRIMARY KEY, auth_user_id uuid REFERENCES auth.users(id));
CREATE TABLE digivacc.owners (id uuid PRIMARY KEY, user_id uuid);
CREATE TABLE public.plain (id int PRIMARY KEY);
ALTER TABLE digivacc.owners ADD CONSTRAINT fk FOREIGN KEY (user_id) REFERENCES digivacc.users(id);
CREATE INDEX owners_user_idx ON digivacc.owners (user_id);
COMMENT ON TABLE digivacc.users IS 'app users';
`;
  const ast = new pkg.Parser().astify(sql, { database: "postgresql" });
  const imported = fromPostgres(ast, DB.POSTGRES);
  const byKey = (schema, name) =>
    imported.tables.find((t) => t.schema === schema && t.name === name);

  it("keeps the schema of each table, with public as the default", () => {
    expect(imported.tables.map((t) => [t.schema, t.name])).toEqual([
      ["auth", "users"],
      ["digivacc", "users"],
      ["digivacc", "owners"],
      ["", "plain"],
    ]);
  });

  it("resolves inline and ALTER TABLE references by schema", () => {
    const [inline, altered] = imported.relationships;
    expect(inline.startTableId).toBe(byKey("digivacc", "users").id);
    expect(inline.endTableId).toBe(byKey("auth", "users").id);
    expect(altered.startTableId).toBe(byKey("digivacc", "owners").id);
    expect(altered.endTableId).toBe(byKey("digivacc", "users").id);
  });

  it("attaches indexes and comments to the schema-qualified table", () => {
    expect(byKey("digivacc", "owners").indices).toHaveLength(1);
    expect(byKey("digivacc", "users").comment).toBe("app users");
    expect(byKey("auth", "users").comment).toBe("");
  });
});
