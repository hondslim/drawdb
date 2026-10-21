import { describe, expect, it } from "vitest";
import pkg from "node-sql-parser";
import { fromDBML } from "../importFrom/dbml";
import { toDBML } from "../exportAs/dbml";
import { fromPostgres } from "../importSQL/postgres";
import { DB } from "../../data/constants";

const tables = `
Table certificates {
  id int [pk]
}
Table records {
  id int [pk]
  certificate_id int [not null]
  corrects_certificate_id int
}
`;

function diagramFrom(imported) {
  return {
    database: DB.POSTGRES,
    notes: [],
    areas: [],
    types: [],
    views: [],
    ...imported,
    references: imported.relationships,
  };
}

describe("optionality from DBML", () => {
  it("derives the parent end from FK nullability", () => {
    const { relationships } = fromDBML(
      `${tables}
Ref: records.certificate_id > certificates.id
Ref: records.corrects_certificate_id > certificates.id`,
      DB.POSTGRES,
    );
    expect(relationships[0]).toMatchObject({ endOptional: false });
    expect(relationships[0].startOptional).toBeUndefined();
    expect(relationships[1]).toMatchObject({ endOptional: true });
  });

  it("treats a primary key FK column as NOT NULL", () => {
    const { relationships } = fromDBML(
      `${tables}
Ref: records.id - certificates.id`,
      DB.POSTGRES,
    );
    expect(relationships[0].endOptional).toBe(false);
  });

  it("derives the parent end when the ref is written parent first", () => {
    const { relationships } = fromDBML(
      `${tables}
Ref: certificates.id < records.corrects_certificate_id`,
      DB.POSTGRES,
    );
    expect(relationships[0].startOptional).toBe(true);
    expect(relationships[0].endOptional).toBeUndefined();
  });

  it("takes explicit DBML 10.x optional markers", () => {
    const { relationships } = fromDBML(
      `${tables}
Ref: records.certificate_id ?>? certificates.id`,
      DB.POSTGRES,
    );
    expect(relationships[0]).toMatchObject({
      startOptional: true,
      endOptional: true,
    });
  });

  it("writes only the optional ends that nullability does not imply", () => {
    const imported = fromDBML(
      `${tables}
Ref: records.corrects_certificate_id ?> certificates.id`,
      DB.POSTGRES,
    );
    const dbml = toDBML(diagramFrom(imported));
    expect(dbml).toContain(
      "records.corrects_certificate_id ?> certificates.id",
    );
    const again = fromDBML(dbml, DB.POSTGRES);
    expect(again.relationships[0]).toMatchObject({
      startOptional: true,
      endOptional: true,
    });
    expect(toDBML(diagramFrom(again))).toEqual(dbml);
  });

  it("writes an optional parent end on a NOT NULL FK", () => {
    const imported = fromDBML(
      `${tables}
Ref: records.certificate_id >? certificates.id`,
      DB.POSTGRES,
    );
    expect(toDBML(diagramFrom(imported))).toContain(
      "records.certificate_id >? certificates.id",
    );
  });
});

describe("optionality from Postgres SQL", () => {
  const sql = `
CREATE TABLE certificates (id int PRIMARY KEY);
CREATE TABLE records (
  id int PRIMARY KEY,
  certificate_id int NOT NULL REFERENCES certificates(id),
  corrects_certificate_id int
);
ALTER TABLE records ADD FOREIGN KEY (corrects_certificate_id) REFERENCES certificates(id);
`;
  const ast = new pkg.Parser().astify(sql, { database: "postgresql" });
  const { relationships } = fromPostgres(ast, DB.POSTGRES);

  it("marks a NOT NULL FK mandatory and a nullable FK optional", () => {
    expect(relationships[0].endOptional).toBe(false);
    expect(relationships[1].endOptional).toBe(true);
  });
});
