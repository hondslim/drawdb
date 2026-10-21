import { describe, expect, it } from "vitest";
import { fromDBML } from "../importFrom/dbml";
import { mergeShare } from "../share";
import { exportSQL } from "../exportSQL";
import { toDBML } from "../exportAs/dbml";
import { getIssues } from "../issues";
import { parseDbml } from "../dbml/parse";
import { reconcileDbml } from "../dbml/reconcile";
import { DB } from "../../data/constants";

const dbml = `
Table digivacc.animals {
  id uuid [pk]
  name text
}
`;

const view = {
  schema: "digivacc",
  name: "animal_names",
  columns: [
    { name: "id", type: "uuid" },
    { name: "name", type: "text" },
  ],
  definition: "SELECT id, name FROM digivacc.animals",
  dependsOn: ["digivacc.animals"],
};

function share(views) {
  const imported = fromDBML(dbml, DB.POSTGRES);
  return {
    title: "t",
    database: DB.POSTGRES,
    tables: imported.tables,
    relationships: imported.relationships,
    enums: [],
    notes: [],
    subjectAreas: [],
    views: [],
    transform: { zoom: 1, pan: { x: 0, y: 0 } },
    postgres: { views },
  };
}

function diagramFrom(record) {
  return { ...record, relationships: record.references, types: [], views: [] };
}

describe("SQL views", () => {
  const record = mergeShare(share([view]), null, "X");
  const viewTable = record.tables.find((t) => t.name === "animal_names");

  it("adds a read-only table per view, placed to the right", () => {
    expect(viewTable).toMatchObject({
      schema: "digivacc",
      sqlView: {
        definition: view.definition,
        dependsOn: ["digivacc.animals"],
        materialized: false,
      },
    });
    expect(viewTable.fields.map((f) => [f.name, f.type])).toEqual([
      ["id", "UUID"],
      ["name", "TEXT"],
    ]);
    const animals = record.tables.find((t) => t.name === "animals");
    expect(viewTable.x).toBeGreaterThan(animals.x);
  });

  it("keeps a moved view and updates its definition on reload", () => {
    viewTable.x = 4321;
    const changed = { ...view, definition: "SELECT id FROM digivacc.animals" };
    const merged = mergeShare(share([changed]), record, "X");
    const again = merged.tables.find((t) => t.name === "animal_names");
    expect(again.id).toBe(viewTable.id);
    expect(again.color).toBe(viewTable.color);
    expect(again.x).toBe(4321);
    expect(again.sqlView.definition).toBe(changed.definition);
  });

  it("colours a view added on reload like a view", () => {
    const stored = mergeShare(share([]), null, "X");
    const merged = mergeShare(share([view]), stored, "X");
    expect(merged.tables.find((t) => t.sqlView).color).toBe(viewTable.color);
  });

  it("drops a view that left the share", () => {
    const merged = mergeShare(share([]), record, "X");
    expect(merged.tables.some((t) => t.sqlView)).toBe(false);
  });

  it("keeps views when the DBML editor reconciles", () => {
    const diagram = diagramFrom(record);
    const next = reconcileDbml(
      parseDbml(toDBML(diagram)),
      { tables: diagram.tables, relationships: [], enums: [] },
      DB.POSTGRES,
    );
    expect(next.tables.some((t) => t.sqlView)).toBe(true);
  });

  it("is left out of SQL and DBML export, and raises no issues", () => {
    const diagram = diagramFrom(record);
    expect(exportSQL(diagram)).not.toContain("animal_names");
    expect(toDBML(diagram)).not.toContain("animal_names");
    expect(getIssues(diagram).join("\n")).not.toContain("animal_names");
  });
});
