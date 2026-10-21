import { describe, expect, it } from "vitest";
import { viewDependencyPairs } from "../sqlViews";

const tables = [
  { id: "animals", schema: "digivacc", name: "animals" },
  { id: "owners", schema: "digivacc", name: "owners" },
  {
    id: "v",
    schema: "digivacc",
    name: "animal_owners",
    sqlView: { dependsOn: ["digivacc.animals", "digivacc.owners"] },
  },
  {
    id: "w",
    schema: "digivacc",
    name: "owner_names",
    sqlView: { dependsOn: ["digivacc.owners"] },
  },
];

const ids = (pairs) => pairs.map(([view, target]) => `${view.id}>${target.id}`);

describe("viewDependencyPairs", () => {
  it("draws nothing for views that are not active", () => {
    expect(viewDependencyPairs(tables, { activeIds: new Set() })).toEqual([]);
  });

  it("draws the edges of an active view only", () => {
    expect(
      ids(viewDependencyPairs(tables, { activeIds: new Set(["v"]) })),
    ).toEqual(["v>animals", "v>owners"]);
  });

  it("draws every edge when told to show all", () => {
    expect(
      ids(viewDependencyPairs(tables, { activeIds: new Set(), showAll: true })),
    ).toEqual(["v>animals", "v>owners", "w>owners"]);
  });
});
