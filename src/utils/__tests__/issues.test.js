import { describe, expect, it } from "vitest";
import { getIssues } from "../issues";
import { DB } from "../../data/constants";

function field(overrides) {
  return {
    id: "f1",
    name: "col",
    type: "TEXT",
    default: "",
    size: "",
    notNull: false,
    primary: false,
    ...overrides,
  };
}

function diagram(fields, extra = {}) {
  return {
    database: DB.POSTGRES,
    tables: [
      {
        id: "t1",
        name: "t",
        fields: [
          field({ id: "pk", name: "id", type: "INTEGER", primary: true }),
          ...fields,
        ],
        indices: [],
      },
    ],
    relationships: [],
    types: [],
    enums: [],
    views: [],
    ...extra,
  };
}

describe("postgres string defaults", () => {
  it("accepts a string default on an unsized TEXT column", () => {
    expect(
      getIssues(diagram([field({ type: "TEXT", default: "'ZAR'" })])),
    ).toEqual([]);
  });

  it("accepts a string default on a VARCHAR without a length", () => {
    expect(
      getIssues(diagram([field({ type: "VARCHAR", default: "'ZAR'" })])),
    ).toEqual([]);
  });

  it("accepts an empty string default", () => {
    expect(
      getIssues(diagram([field({ type: "TEXT", default: "''" })])),
    ).toEqual([]);
  });

  it("still reports a default longer than a sized VARCHAR", () => {
    expect(
      getIssues(
        diagram([field({ type: "VARCHAR", size: 2, default: "'ZAR'" })]),
      ),
    ).toHaveLength(1);
  });
});
