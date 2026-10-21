import { describe, expect, it } from "vitest";
import {
  metadataForTable,
  normalizePostgresMeta,
  postgresTableKey,
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
