import { describe, expect, it } from "vitest";
import { fromDBML } from "../../importFrom/dbml";
import { toDBML } from "../../exportAs/dbml";
import { exportSQL } from "../../exportSQL";
import { getIssues } from "../../issues";
import { DB } from "../../../data/constants";

const dbml = `
Table digivacc.profiles {
  id uuid [pk, ref: - auth.users.id]
  note text [note: 'mirrors auth.users.id > x.y.z']
}

Table digivacc.owners {
  id uuid [pk]
  user_id uuid [not null]
  session_id bigint
  checks {
    \`owners.id > other.thing\`
  }
}

Table digivacc.administrators as A {
  id uuid [pk]
  user_id uuid
}

// Ref: digivacc.owners.id > commented.out.id
Ref "owners_user_id_fkey": digivacc.owners.user_id > auth.users.id [delete: cascade]
Ref {
  digivacc.owners.session_id > "auth"."sessions"."id"
}
Ref: A.user_id > auth.users.id
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

describe("stub tables", () => {
  const imported = fromDBML(dbml, DB.POSTGRES);
  const stub = (schema, name) =>
    imported.tables.find((t) => t.schema === schema && t.name === name);

  it("creates one stub per undeclared table, with referenced columns only", () => {
    const stubs = imported.tables.filter((t) => t.stub);
    expect(stubs.map((t) => `${t.schema}.${t.name}`)).toEqual([
      "auth.users",
      "auth.sessions",
    ]);
    expect(stub("auth", "users").fields.map((f) => f.name)).toEqual(["id"]);
  });

  it("gives stub columns the FK column type", () => {
    expect(stub("auth", "users").fields[0].type).toBe("UUID");
    expect(stub("auth", "sessions").fields[0].type).toBe("BIGINT");
  });

  it("keeps every FK to a stub", () => {
    const users = stub("auth", "users");
    expect(
      imported.relationships.filter((r) =>
        [r.startTableId, r.endTableId].includes(users.id),
      ),
    ).toHaveLength(3);
    expect(imported.relationships).toHaveLength(4);
  });

  it("raises no issues for stubs", () => {
    expect(
      getIssues(diagramFrom(imported)).filter((i) => /users|sessions/.test(i)),
    ).toEqual([]);
  });

  it("omits stubs from SQL but keeps the FKs to them", () => {
    const sql = exportSQL(diagramFrom(imported));
    expect(sql).not.toContain('CREATE TABLE IF NOT EXISTS "auth"');
    expect(sql).not.toContain('CREATE SCHEMA IF NOT EXISTS "auth"');
    expect(sql).toContain('REFERENCES "auth"."users"("id")');
  });

  it("omits stubs from DBML, and recreates them on import", () => {
    const out = toDBML(diagramFrom(imported));
    expect(out).not.toContain("Table auth.users");
    const again = fromDBML(out, DB.POSTGRES);
    expect(again.tables.filter((t) => t.stub)).toHaveLength(2);
    expect(toDBML(diagramFrom(again))).toEqual(out);
  });
});
