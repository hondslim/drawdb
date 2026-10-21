import { describe, expect, it } from "vitest";
import { fromDBML } from "../importFrom/dbml";
import { mergeShare } from "../share";
import { DB } from "../../data/constants";

function share(dbml) {
  const imported = fromDBML(dbml, DB.POSTGRES);
  return {
    title: "digivacc",
    database: DB.POSTGRES,
    tables: imported.tables,
    relationships: imported.relationships,
    enums: imported.enums,
    notes: [],
    subjectAreas: [],
    views: [],
    transform: { zoom: 1, pan: { x: 0, y: 0 } },
  };
}

const v1 = `
Table digivacc.owners {
  id uuid [pk]
  name text
}
Table digivacc.animals {
  id uuid [pk]
  owner_id uuid [not null]
  nickname text
}
Ref: digivacc.animals.owner_id > digivacc.owners.id
`;

const v2 = `
Table digivacc.owners {
  id uuid [pk]
  name text
}
Table digivacc.animals {
  id uuid [pk]
  owner_id uuid [not null]
}
Table digivacc.vaccinations {
  id uuid [pk]
  animal_id uuid [not null]
}
Ref: digivacc.animals.owner_id > digivacc.owners.id
Ref: digivacc.vaccinations.animal_id > digivacc.animals.id
`;

describe("mergeShare", () => {
  it("stores a share as is when nothing is stored", () => {
    const record = mergeShare(share(v1), null, "X");
    expect(record.loadedFromGistId).toBe("X");
    expect(record.tables.map((t) => t.name)).toEqual(["owners", "animals"]);
    expect(record.references).toHaveLength(1);
  });

  it("keeps moved tables, ids, pan, zoom, notes and areas", () => {
    const stored = mergeShare(share(v1), null, "X");
    stored.tables[0] = {
      ...stored.tables[0],
      x: 1234,
      y: 567,
      color: "#ff0000",
    };
    stored.pan = { x: 10, y: 20 };
    stored.zoom = 0.5;
    stored.notes = [{ id: 1, title: "mine" }];
    stored.areas = [{ id: 1, name: "area" }];

    const merged = mergeShare(share(v1), stored, "X");
    expect(merged.tables[0]).toMatchObject({
      id: stored.tables[0].id,
      x: 1234,
      y: 567,
      color: "#ff0000",
    });
    expect(merged.tables[1].fields.map((f) => f.id)).toEqual(
      stored.tables[1].fields.map((f) => f.id),
    );
    expect(merged.references[0].id).toBe(stored.references[0].id);
    expect(merged).toMatchObject({
      pan: { x: 10, y: 20 },
      zoom: 0.5,
      notes: [{ id: 1, title: "mine" }],
      areas: [{ id: 1, name: "area" }],
    });
  });

  it("drops removed columns, adds new tables and places them", () => {
    const stored = mergeShare(share(v1), null, "X");
    const merged = mergeShare(share(v2), stored, "X");
    const animals = merged.tables.find((t) => t.name === "animals");
    expect(animals.fields.map((f) => f.name)).toEqual(["id", "owner_id"]);
    const vaccinations = merged.tables.find((t) => t.name === "vaccinations");
    expect(vaccinations.x).toBeGreaterThan(
      Math.max(...stored.tables.map((t) => t.x)),
    );
    expect(merged.references).toHaveLength(2);
  });

  it("takes postgres metadata from the share, and null without it", () => {
    const stored = mergeShare(share(v1), null, "X");
    expect(stored.postgres).toBeNull();
    const merged = mergeShare(
      {
        ...share(v1),
        postgres: { rls: { "digivacc.owners": { enabled: true } } },
      },
      stored,
      "X",
    );
    expect(merged.postgres.rls["digivacc.owners"]).toEqual({
      enabled: true,
      forced: false,
    });
  });

  it("drops a table that left the share", () => {
    const stored = mergeShare(share(v2), null, "X");
    const merged = mergeShare(share(v1), stored, "X");
    expect(merged.tables.map((t) => t.name)).toEqual(["owners", "animals"]);
    expect(merged.references).toHaveLength(1);
  });
});
