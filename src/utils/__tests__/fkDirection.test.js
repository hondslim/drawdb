import { describe, expect, it } from "vitest";
import { fromDBML } from "../importFrom/dbml";
import { exportSQL } from "../exportSQL";
import { mergeShare } from "../share";
import { DB } from "../../data/constants";

const dbml = `
Table owners {
  id int [pk]
}
Table animals {
  id int [pk]
  owner_id int
}
Ref "animals_owner_id_fkey": owners.id < animals.owner_id
`;

function diagram(imported, database) {
  return {
    database,
    types: [],
    enums: [],
    views: [],
    ...imported,
    references: imported.relationships ?? imported.references,
  };
}

describe("FKs written parent first", () => {
  it("export the FK on the child table", () => {
    for (const database of [DB.POSTGRES, DB.MYSQL, DB.SQLITE]) {
      const sql = exportSQL(diagram(fromDBML(dbml, database), database));
      expect(sql).toMatch(
        /owner_id.{0,40}REFERENCES\s+["`]?owners["`]?\s*\(["`]?id/s,
      );
      expect(sql).not.toMatch(/REFERENCES\s+["`]?animals/);
    }
  });

  it("take deferrable metadata for the child table", () => {
    const imported = fromDBML(dbml, DB.POSTGRES);
    const record = mergeShare(
      {
        title: "t",
        database: DB.POSTGRES,
        tables: imported.tables,
        relationships: imported.relationships,
        postgres: {
          foreignKeys: [
            {
              table: "animals",
              name: "animals_owner_id_fkey",
              columns: ["owner_id"],
              deferrable: true,
              initiallyDeferred: true,
            },
          ],
        },
      },
      null,
      "X",
    );
    expect(record.references[0].deferrable).toBe("DEFERRED");
  });
});
