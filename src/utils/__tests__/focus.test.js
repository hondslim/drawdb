import { describe, expect, it } from "vitest";
import { focusView, neighbourhood } from "../focus";

const rel = (id, from, to) => ({
  id,
  startTableId: from,
  endTableId: to,
  startFieldId: `${from}.f`,
  endFieldId: `${to}.id`,
});

const table = (id) => ({
  id,
  name: id,
  x: 0,
  y: 0,
  fields: [
    { id: `${id}.id`, name: "id", type: "INT" },
    { id: `${id}.f`, name: "f", type: "INT" },
  ],
});

const relationships = [
  rel("r1", "animals", "owners"),
  rel("r2", "vaccinations", "animals"),
  rel("r3", "owners", "users"),
  rel("r4", "certificates", "vaccinations"),
  rel("r5", "unrelated", "other"),
];
const tables = [
  "animals",
  "owners",
  "vaccinations",
  "users",
  "certificates",
  "unrelated",
  "other",
].map(table);

describe("neighbourhood", () => {
  it("returns the table and its direct parents and children at one hop", () => {
    expect([...neighbourhood("animals", relationships, 1)].sort()).toEqual([
      "animals",
      "owners",
      "vaccinations",
    ]);
  });

  it("grows by one ring per hop", () => {
    expect([...neighbourhood("animals", relationships, 2)].sort()).toEqual([
      "animals",
      "certificates",
      "owners",
      "users",
      "vaccinations",
    ]);
  });
});

describe("focusView", () => {
  const settings = { showComments: false };
  const view = focusView(
    tables,
    relationships,
    { tableId: "animals", hops: 1 },
    settings,
  );

  it("keeps only the neighbourhood and the relationships inside it", () => {
    expect(view.tables.map((t) => t.id).sort()).toEqual([
      "animals",
      "owners",
      "vaccinations",
    ]);
    expect(view.relationships.map((r) => r.id).sort()).toEqual(["r1", "r2"]);
  });

  it("arranges copies and leaves the diagram's tables alone", () => {
    expect(view.tables.every((t) => t.locked)).toBe(true);
    expect(new Set(view.tables.map((t) => `${t.x},${t.y}`)).size).toBe(3);
    expect(tables.every((t) => t.x === 0 && t.y === 0)).toBe(true);
  });

  it("returns bounds around the arranged tables", () => {
    expect(view.bounds.width).toBeGreaterThan(0);
    expect(view.bounds.height).toBeGreaterThan(0);
  });

  it("returns null for an unknown table", () => {
    expect(
      focusView(tables, relationships, { tableId: "nope", hops: 1 }, settings),
    ).toBeNull();
  });
});
