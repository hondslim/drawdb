import { describe, expect, it } from "vitest";
import { findTableByRef, readTableLink, transformForTable } from "../deepLink";

describe("readTableLink", () => {
  it("reads the hash", () => {
    expect(readTableLink("", "#table=digivacc.animals")).toEqual({
      table: "digivacc.animals",
      focus: 0,
    });
  });

  it("reads the query parameter, and the hash wins", () => {
    expect(readTableLink("?shareId=X&table=owners", "")).toEqual({
      table: "owners",
      focus: 0,
    });
    expect(readTableLink("?table=owners", "#table=animals&focus=1")).toEqual({
      table: "animals",
      focus: 1,
    });
  });

  it("reads focus hops between 1 and 3", () => {
    expect(readTableLink("", "#table=a&focus=3").focus).toBe(3);
    expect(readTableLink("", "#table=a&focus=9").focus).toBe(0);
  });

  it("returns null without a link", () => {
    expect(readTableLink("?shareId=X", "")).toBeNull();
  });
});

describe("findTableByRef", () => {
  const tables = [
    { id: 1, schema: "digivacc", name: "users" },
    { id: 2, schema: "auth", name: "users" },
    { id: 3, schema: "", name: "plain" },
    { id: 4, schema: "digivacc", name: "animals" },
  ];

  it("matches schema.name", () => {
    expect(findTableByRef(tables, "auth.users").id).toBe(2);
  });

  it("matches a bare name in the default schema first, then any schema", () => {
    expect(findTableByRef(tables, "plain").id).toBe(3);
    expect(findTableByRef(tables, "animals").id).toBe(4);
  });

  it("matches public. as the default schema", () => {
    expect(findTableByRef(tables, "public.plain").id).toBe(3);
  });

  it("returns undefined for an unknown table", () => {
    expect(findTableByRef(tables, "nope")).toBeUndefined();
  });
});

describe("transformForTable", () => {
  const canvas = { width: 1000, height: 800 };

  it("centres the table and caps the zoom at 125%", () => {
    expect(
      transformForTable({ x: 100, y: 200, width: 200, height: 100 }, canvas),
    ).toEqual({ zoom: 1.25, pan: { x: 200, y: 250 } });
  });

  it("zooms out to fit a tall table", () => {
    const { zoom } = transformForTable(
      { x: 0, y: 0, width: 200, height: 1500 },
      canvas,
    );
    expect(zoom).toBeLessThan(1);
    expect(zoom).toBeGreaterThanOrEqual(0.25);
  });
});
