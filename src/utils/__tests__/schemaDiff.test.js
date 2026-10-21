import { describe, expect, it } from "vitest";
import { fromDBML } from "../importFrom/dbml";
import { computeDiff } from "../schemaDiff";
import { DB } from "../../data/constants";

const baseDbml = `
Table digivacc.owners {
  id uuid [pk]
  name text
}
Table digivacc.animals {
  id uuid [pk]
  owner_id uuid [not null]
  nickname varchar(20)
}
Table digivacc.legacy {
  id int [pk]
}
Ref: digivacc.animals.owner_id > digivacc.owners.id
`;

function diagram(dbml) {
  const imported = fromDBML(dbml, DB.POSTGRES);
  return { tables: imported.tables, relationships: imported.relationships };
}

const base = diagram(baseDbml);

describe("computeDiff", () => {
  it("finds nothing between identical versions", () => {
    const diff = computeDiff(base, diagram(baseDbml));
    expect(diff.changes).toEqual([]);
  });

  it("highlights only an added column", () => {
    const current = diagram(
      baseDbml.replace("  name text\n", "  name text\n  email text\n"),
    );
    const diff = computeDiff(base, current);
    const owners = current.tables.find((t) => t.name === "owners");
    const email = owners.fields.find((f) => f.name === "email");

    expect(diff.changes).toEqual([
      {
        kind: "column",
        status: "added",
        table: "digivacc.owners",
        name: "email",
        tableId: owners.id,
      },
    ]);
    expect(diff.tables.get(owners.id)).toEqual({
      status: null,
      fields: new Map([[email.id, { status: "added", details: [] }]]),
      removedFields: [],
      details: [],
    });
    expect(diff.tables.size).toBe(1);
    expect(diff.relationships.size).toBe(0);
    expect(diff.removedTables).toEqual([]);
    expect(diff.removedRelationships).toEqual([]);
  });

  it("reports removed and changed columns", () => {
    const current = diagram(
      baseDbml
        .replace("  nickname varchar(20)\n", "")
        .replace("owner_id uuid [not null]", "owner_id uuid"),
    );
    const diff = computeDiff(base, current);
    const animals = current.tables.find((t) => t.name === "animals");
    const info = diff.tables.get(animals.id);
    expect(info.removedFields.map((f) => f.name)).toEqual(["nickname"]);
    const ownerId = animals.fields.find((f) => f.name === "owner_id");
    expect(info.fields.get(ownerId.id)).toEqual({
      status: "changed",
      details: ["NOT NULL → NULL"],
    });
  });

  it("reports added and removed tables", () => {
    const current = diagram(
      baseDbml.replace(
        "Table digivacc.legacy {\n  id int [pk]\n}\n",
        "Table digivacc.clinics {\n  id int [pk]\n}\n",
      ),
    );
    const diff = computeDiff(base, current);
    const clinics = current.tables.find((t) => t.name === "clinics");
    expect(diff.tables.get(clinics.id).status).toBe("added");
    expect(diff.removedTables.map((t) => t.name)).toEqual(["legacy"]);
  });

  it("reports added, removed and changed FKs", () => {
    const cascading = diagram(
      baseDbml.replace(
        "> digivacc.owners.id",
        "> digivacc.owners.id [delete: cascade]",
      ),
    );
    const changed = computeDiff(base, cascading);
    expect([...changed.relationships.values()]).toEqual([
      { status: "changed", details: ["ON DELETE No action → Cascade"] },
    ]);

    const withoutRef = diagram(baseDbml.replace(/Ref:.*\n/, ""));
    const removed = computeDiff(base, withoutRef);
    expect(removed.removedRelationships).toHaveLength(1);
    expect(removed.removedRelationships[0]).toMatchObject({
      startTableId: withoutRef.tables.find((t) => t.name === "animals").id,
      endTableId: withoutRef.tables.find((t) => t.name === "owners").id,
    });

    const added = computeDiff(
      diagram(baseDbml.replace(/Ref:.*\n/, "")),
      diagram(baseDbml),
    );
    expect([...added.relationships.values()]).toEqual([
      { status: "added", details: [] },
    ]);
  });

  it("marks a table changed when a table-level check changes", () => {
    const current = diagram(
      baseDbml.replace(
        "  name text\n}",
        "  name text\n  checks {\n    `length(name) > 0`\n  }\n}",
      ),
    );
    const diff = computeDiff(base, current);
    const owners = current.tables.find((t) => t.name === "owners");
    expect(diff.tables.get(owners.id)).toMatchObject({
      status: "changed",
      details: ["checks"],
    });
  });
});
