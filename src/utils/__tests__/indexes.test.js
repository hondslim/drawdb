import { describe, expect, it } from "vitest";
import pkg from "node-sql-parser";
import { fromDBML } from "../importFrom/dbml";
import { toDBML } from "../exportAs/dbml";
import { toPostgres } from "../exportSQL/postgres";
import { fromPostgres } from "../importSQL/postgres";
import { mergeShare } from "../share";
import { DB } from "../../data/constants";

function diagramFrom(imported) {
  return {
    database: DB.POSTGRES,
    notes: [],
    areas: [],
    types: [],
    views: [],
    enums: [],
    ...imported,
    references: imported.relationships,
  };
}

const dbml = `
Table animals {
  id uuid [pk]
  owner_id uuid
  name text
  tags text

  indexes {
    (\`lower(name)\`, owner_id) [name: 'animals_lower_name']
    tags [type: gin, name: 'animals_tags']
    owner_id [name: 'animals_owner']
  }
}
`;

describe("index details from DBML", () => {
  const imported = fromDBML(dbml, DB.POSTGRES);
  const [animals] = imported.tables;

  it("splits expressions from fields and reads the method", () => {
    expect(animals.indices[0]).toMatchObject({
      name: "animals_lower_name",
      fields: ["owner_id"],
      expressions: ["lower(name)"],
    });
    expect(animals.indices[1]).toMatchObject({
      fields: ["tags"],
      method: "gin",
    });
    expect(animals.indices[2].method).toBeUndefined();
  });

  it("round-trips through DBML", () => {
    const out = toDBML(diagramFrom(imported));
    expect(out).toContain(
      "(owner_id, `lower(name)`) [ name: 'animals_lower_name' ]",
    );
    expect(out).toContain("(tags) [ name: 'animals_tags', type: gin ]");
    expect(toDBML(diagramFrom(fromDBML(out, DB.POSTGRES)))).toEqual(out);
  });
});

describe("index details from Postgres SQL", () => {
  const sql = `
CREATE TABLE animals (id uuid PRIMARY KEY, owner_id uuid, name text, tags text, archived_at timestamptz);
CREATE UNIQUE INDEX animals_live_owner ON animals (owner_id) WHERE archived_at IS NULL;
CREATE INDEX animals_tags ON animals USING gin (tags);
CREATE INDEX animals_cover ON animals (owner_id) INCLUDE (name);
CREATE INDEX animals_lower_name ON animals (lower(name), id);
`;
  const ast = new pkg.Parser().astify(sql, { database: "postgresql" });
  const imported = fromPostgres(ast, DB.POSTGRES);
  const [animals] = imported.tables;
  const byName = (name) => animals.indices.find((i) => i.name === name);

  it("imports where, method, include and expressions", () => {
    expect(byName("animals_live_owner")).toMatchObject({
      unique: true,
      fields: ["owner_id"],
      where: "archived_at IS NULL",
    });
    expect(byName("animals_tags").method).toBe("gin");
    expect(byName("animals_cover").include).toEqual(["name"]);
    expect(byName("animals_lower_name")).toMatchObject({
      fields: ["id"],
      expressions: ["lower(name)"],
    });
  });

  it("exports them back to Postgres", () => {
    const out = toPostgres(diagramFrom(imported));
    expect(out).toContain(
      'CREATE UNIQUE INDEX "animals_live_owner"\nON "animals" ("owner_id")\nWHERE archived_at IS NULL;',
    );
    expect(out).toContain(
      'CREATE INDEX "animals_tags"\nON "animals" USING gin ("tags");',
    );
    expect(out).toContain('ON "animals" ("owner_id")\nINCLUDE ("name");');
    expect(out).toContain('ON "animals" ("id", lower(name));');
  });
});

describe("index details from share metadata", () => {
  const imported = fromDBML(dbml, DB.POSTGRES);
  const share = {
    title: "t",
    database: DB.POSTGRES,
    tables: imported.tables,
    relationships: [],
    enums: [],
    postgres: {
      indexes: [
        {
          table: "animals",
          name: "animals_owner",
          unique: true,
          columns: ["owner_id"],
          where: "archived_at IS NULL",
        },
        {
          table: "public.animals",
          name: "animals_brin",
          method: "brin",
          columns: ["id", "date_trunc('day', created_at)"],
          include: ["name"],
        },
      ],
    },
  };

  it("enriches named indexes and adds missing ones", () => {
    const record = mergeShare(share, null, "X");
    const animals = record.tables.find((t) => t.name === "animals");
    expect(
      animals.indices.find((i) => i.name === "animals_owner"),
    ).toMatchObject({
      unique: true,
      where: "archived_at IS NULL",
    });
    expect(
      animals.indices.find((i) => i.name === "animals_brin"),
    ).toMatchObject({
      method: "brin",
      fields: ["id"],
      expressions: ["date_trunc('day', created_at)"],
      include: ["name"],
    });
  });
});
