import { describe, expect, it } from "vitest";
import pkg from "node-sql-parser";
import { fromDBML } from "../importFrom/dbml";
import { toDBML } from "../exportAs/dbml";
import { toPostgres } from "../exportSQL/postgres";
import { toMySQL } from "../exportSQL/mysql";
import { fromPostgres } from "../importSQL/postgres";
import { DB } from "../../data/constants";

const dbml = `
Table animals {
  id int [pk]
  birth_date date [check: \`birth_date <= now()\`]
  microchip text
  microchipped_at date [check: \`microchipped_at > '2000-01-01'\`, check: \`microchipped_at < '2100-01-01'\`]
  weight int

  checks {
    \`(microchipped_at IS NULL) OR (microchip IS NOT NULL)\` [name: 'animals_microchipped_at_needs_a_number']
    \`weight > 0\`
  }
}
`;

function diagramFrom(imported, database) {
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

describe("checks from DBML", () => {
  const imported = fromDBML(dbml, DB.POSTGRES);
  const [animals] = imported.tables;
  const field = (name) => animals.fields.find((f) => f.name === name);

  it("puts an unnamed column check on the field", () => {
    expect(field("birth_date").check).toBe("birth_date <= now()");
    expect(field("weight").check).toBe("");
  });

  it("joins several column checks", () => {
    expect(field("microchipped_at").check).toBe(
      "(microchipped_at > '2000-01-01') AND (microchipped_at < '2100-01-01')",
    );
  });

  it("keeps table checks and their names", () => {
    expect(animals.checks).toEqual([
      {
        name: "animals_microchipped_at_needs_a_number",
        expression: "(microchipped_at IS NULL) OR (microchip IS NOT NULL)",
      },
      { name: "", expression: "weight > 0" },
    ]);
  });

  it("round-trips checks through DBML", () => {
    const first = toDBML(diagramFrom(imported, DB.POSTGRES));
    expect(first).toContain("check: `birth_date <= now()`");
    expect(first).toContain(
      "`(microchipped_at IS NULL) OR (microchip IS NOT NULL)` [name: 'animals_microchipped_at_needs_a_number']",
    );
    const again = fromDBML(first, DB.POSTGRES);
    expect(toDBML(diagramFrom(again, DB.POSTGRES))).toEqual(first);
  });

  it("exports table checks to Postgres and MySQL", () => {
    const pg = toPostgres(diagramFrom(imported, DB.POSTGRES));
    expect(pg).toContain(
      'CONSTRAINT "animals_microchipped_at_needs_a_number" CHECK ((microchipped_at IS NULL) OR (microchip IS NOT NULL))',
    );
    expect(pg).toContain("\tCHECK (weight > 0)");
    const my = toMySQL(diagramFrom(fromDBML(dbml, DB.MYSQL), DB.MYSQL));
    expect(my).toContain("CHECK (weight > 0)");
  });
});

describe("checks from Postgres SQL", () => {
  const sql = `
CREATE TABLE a (
  id int PRIMARY KEY,
  n int CHECK (n > 0),
  m int CONSTRAINT m_pos CHECK (m > 0),
  CONSTRAINT a_nm CHECK (n < m),
  CHECK (n <> 5)
);
ALTER TABLE a ADD CONSTRAINT a_late CHECK (m < 100);
`;
  const ast = new pkg.Parser().astify(sql, { database: "postgresql" });
  const [a] = fromPostgres(ast, DB.POSTGRES).tables;

  it("keeps an unnamed column check on the field", () => {
    expect(a.fields.find((f) => f.name === "n").check).toBe("n > 0");
  });

  it("moves named and table checks to the table, with names", () => {
    expect(a.fields.find((f) => f.name === "m").check).toBe("");
    expect(a.checks).toEqual([
      { name: "m_pos", expression: "m > 0" },
      { name: "a_nm", expression: "n < m" },
      { name: "", expression: "n <> 5" },
      { name: "a_late", expression: "m < 100" },
    ]);
  });
});
