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

function cycleDiagram(edges) {
  const names = [...new Set(edges.flatMap(([from, to]) => [from, to]))];
  const tables = names.map((name) => ({
    id: name,
    name,
    fields: [
      {
        id: `${name}.id`,
        name: "id",
        type: "INTEGER",
        default: "",
        primary: true,
        notNull: true,
      },
      ...edges
        .filter(([from]) => from === name)
        .map(([, to, opts = {}]) => ({
          id: `${name}.${to}_id`,
          name: `${to}_id`,
          type: "INTEGER",
          default: "",
          primary: false,
          notNull: !opts.nullable,
        })),
    ],
    indices: [],
  }));
  const relationships = edges.map(([from, to, opts = {}]) => ({
    id: `${from}->${to}`,
    name: `fk_${from}_${to}`,
    startTableId: from,
    endTableId: to,
    startFieldId: `${from}.${to}_id`,
    endFieldId: `${to}.id`,
    fields: [{ startFieldId: `${from}.${to}_id`, endFieldId: `${to}.id` }],
    deferrable: !!opts.deferrable,
  }));
  return {
    database: DB.POSTGRES,
    tables,
    relationships,
    types: [],
    enums: [],
    views: [],
  };
}

describe("circular relationships", () => {
  it("reports a cycle of NOT NULL FKs once, naming its tables", () => {
    const issues = getIssues(
      cycleDiagram([
        ["a", "b"],
        ["b", "a"],
      ]),
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("a");
    expect(issues[0]).toContain("b");
  });

  it("reports a group with several paths through it once", () => {
    const issues = getIssues(
      cycleDiagram([
        ["a", "b"],
        ["b", "a"],
        ["b", "c"],
        ["c", "b"],
        ["c", "a"],
        ["a", "c"],
      ]),
    );
    expect(issues).toHaveLength(1);
  });

  it("does not report a cycle that passes through a nullable FK", () => {
    expect(
      getIssues(
        cycleDiagram([
          ["a", "b"],
          ["b", "a", { nullable: true }],
        ]),
      ),
    ).toEqual([]);
  });

  it("does not report a cycle that passes through a deferrable FK", () => {
    expect(
      getIssues(
        cycleDiagram([
          ["a", "b"],
          ["b", "a", { deferrable: true }],
        ]),
      ),
    ).toEqual([]);
  });

  it("ignores a self-reference", () => {
    expect(getIssues(cycleDiagram([["a", "a"]]))).toEqual([]);
  });
});

describe("indexes", () => {
  it("accepts an index made only of expressions", () => {
    const d = diagram([field({ name: "email" })]);
    d.tables[0].indices = [
      { id: 0, name: "lower_email", fields: [], expressions: ["lower(email)"] },
    ];
    expect(getIssues(d)).toEqual([]);
  });
});
