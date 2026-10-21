import { describe, expect, it } from "vitest";
import {
  metadataForTable,
  normalizePostgresMeta,
  postgresTableKey,
  rlsState,
  indexPostgresMeta,
  functionKey,
  triggerFunctionKey,
  triggersByFunction,
  grantMatrix,
  grantRoles,
} from "../postgresMeta";

const raw = {
  rls: {
    "digivacc.animals": { enabled: true, forced: true },
    users: { enabled: false },
  },
  policies: [
    {
      table: "digivacc.animals",
      name: "p1",
      command: "SELECT",
      roles: ["authenticated"],
      using: "true",
    },
  ],
  triggers: [
    {
      table: "digivacc.animals",
      name: "t1",
      timing: "BEFORE",
      events: ["INSERT"],
      function: "digivacc.f",
    },
  ],
  grants: [{ table: "users", role: "anon", privileges: ["SELECT"] }],
  extra: { kept: true },
};

describe("normalizePostgresMeta", () => {
  it("returns null without metadata", () => {
    expect(normalizePostgresMeta(undefined)).toBeNull();
    expect(normalizePostgresMeta(null)).toBeNull();
  });

  it("fills missing lists and qualifies table keys with public", () => {
    const meta = normalizePostgresMeta(raw);
    expect(meta.functions).toEqual([]);
    expect(meta.indexes).toEqual([]);
    expect(meta.views).toEqual([]);
    expect(Object.keys(meta.rls)).toEqual(["digivacc.animals", "public.users"]);
    expect(meta.rls["public.users"]).toEqual({ enabled: false, forced: false });
    expect(meta.grants[0].table).toBe("public.users");
    expect(meta.extra).toEqual({ kept: true });
  });

  it("defaults policy and trigger fields", () => {
    const meta = normalizePostgresMeta(raw);
    expect(meta.policies[0]).toMatchObject({
      permissive: true,
      withCheck: null,
    });
    expect(meta.triggers[0]).toMatchObject({
      level: "ROW",
      when: null,
      enabled: true,
    });
  });

  it("is idempotent", () => {
    const once = normalizePostgresMeta(raw);
    expect(normalizePostgresMeta(once)).toEqual(once);
  });
});

describe("metadataForTable", () => {
  const meta = normalizePostgresMeta(raw);

  it("keys tables by schema, with public as the default", () => {
    expect(postgresTableKey({ schema: "digivacc", name: "animals" })).toBe(
      "digivacc.animals",
    );
    expect(postgresTableKey({ schema: "", name: "users" })).toBe(
      "public.users",
    );
  });

  it("collects one table's metadata", () => {
    const animals = metadataForTable(meta, {
      schema: "digivacc",
      name: "animals",
    });
    expect(animals.rls).toEqual({ enabled: true, forced: true });
    expect(animals.policies.map((p) => p.name)).toEqual(["p1"]);
    expect(animals.triggers.map((t) => t.name)).toEqual(["t1"]);
    expect(animals.grants).toEqual([]);

    const users = metadataForTable(meta, { name: "users" });
    expect(users.grants.map((g) => g.role)).toEqual(["anon"]);
  });

  it("returns null without metadata", () => {
    expect(metadataForTable(null, { name: "users" })).toBeNull();
  });
});

describe("rlsState", () => {
  const meta = normalizePostgresMeta({
    rls: {
      "digivacc.a": { enabled: true, forced: true },
      "digivacc.b": { enabled: true },
      "digivacc.c": { enabled: false },
    },
  });

  it("reads forced, enabled and off", () => {
    expect(rlsState(meta, { schema: "digivacc", name: "a" })).toBe("forced");
    expect(rlsState(meta, { schema: "digivacc", name: "b" })).toBe("enabled");
    expect(rlsState(meta, { schema: "digivacc", name: "c" })).toBe("off");
  });

  it("treats a missing table as off, and has no state without metadata or for stubs", () => {
    expect(rlsState(meta, { schema: "digivacc", name: "d" })).toBe("off");
    expect(rlsState(null, { name: "d" })).toBeNull();
    expect(rlsState(meta, { name: "d", stub: true })).toBeNull();
  });
});

describe("indexPostgresMeta", () => {
  const lookup = indexPostgresMeta(normalizePostgresMeta(raw));

  it("returns the same object for a table on every call", () => {
    const table = { schema: "digivacc", name: "animals" };
    expect(lookup(table)).toBe(lookup({ ...table }));
    expect(lookup(table)).toMatchObject({ rlsState: "forced" });
    expect(lookup(table).policies).toHaveLength(1);
  });

  it("returns off for an unknown table and null for a stub", () => {
    expect(lookup({ name: "nope" }).rlsState).toBe("off");
    expect(lookup({ name: "nope", stub: true })).toBeNull();
  });

  it("returns null without metadata", () => {
    expect(indexPostgresMeta(null)).toBeNull();
  });
});

describe("triggersByFunction", () => {
  const meta = normalizePostgresMeta({
    triggers: [
      { table: "digivacc.animals", name: "t1", function: "digivacc.cap" },
      { table: "digivacc.owners", name: "t2", function: "touch" },
      { table: "digivacc.animals", name: "t3", function: "public.touch" },
    ],
    functions: [{ schema: "digivacc", name: "cap" }, { name: "touch" }],
  });

  it("keys functions and trigger targets by schema.name, with public as the default", () => {
    expect(meta.functions.map(functionKey)).toEqual([
      "digivacc.cap",
      "public.touch",
    ]);
    expect(meta.triggers.map(triggerFunctionKey)).toEqual([
      "digivacc.cap",
      "public.touch",
      "public.touch",
    ]);
  });

  it("groups triggers by the function they execute", () => {
    const byFunction = triggersByFunction(meta);
    expect(byFunction.get("digivacc.cap").map((t) => t.name)).toEqual(["t1"]);
    expect(byFunction.get("public.touch").map((t) => t.name)).toEqual([
      "t2",
      "t3",
    ]);
  });
});

describe("grantMatrix", () => {
  const meta = normalizePostgresMeta({
    grants: [
      {
        table: "digivacc.animals",
        role: "app_api",
        privileges: ["UPDATE", "SELECT"],
      },
      { table: "digivacc.animals", role: "app_api", privileges: ["INSERT"] },
      {
        table: "public.profiles",
        role: "authenticated",
        privileges: ["SELECT"],
      },
      { table: "digivacc.owners", role: "app_api", privileges: ["SELECT"] },
    ],
  });

  it("lists roles", () => {
    expect(grantRoles(meta)).toEqual(["app_api", "authenticated"]);
  });

  it("merges rows per table and role, in privilege order", () => {
    expect(grantMatrix(meta)).toEqual([
      {
        table: "digivacc.animals",
        role: "app_api",
        privileges: ["SELECT", "INSERT", "UPDATE"],
      },
      { table: "digivacc.owners", role: "app_api", privileges: ["SELECT"] },
      {
        table: "public.profiles",
        role: "authenticated",
        privileges: ["SELECT"],
      },
    ]);
  });

  it("filters by role", () => {
    expect(grantMatrix(meta, "authenticated").map((row) => row.table)).toEqual([
      "public.profiles",
    ]);
    expect(
      grantMatrix(meta, "authenticated").some((row) =>
        row.table.startsWith("digivacc."),
      ),
    ).toBe(false);
  });
});
