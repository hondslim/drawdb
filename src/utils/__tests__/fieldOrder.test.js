import { describe, expect, it } from "vitest";
import { getVisibleFieldEntries, getVisibleFieldIndex } from "../utils";
import { Cardinality } from "../../data/constants";

const field = (id, type = "TEXT", extra = {}) => ({
  id,
  name: id,
  type,
  ...extra,
});

const animals = {
  id: "animals",
  fields: [
    field("created_at", "TIMESTAMPTZ"),
    field("name"),
    field("archived_at", "TIMESTAMPTZ"),
    field("owner_id", "UUID"),
    field("updated_at", "TIMESTAMPTZ"),
    field("id", "UUID", { primary: true }),
    field("born_on", "DATE"),
    field("species_id", "UUID"),
    field("last_seen", "TIMESTAMP"),
  ],
};

const relationships = [
  {
    id: "r1",
    startTableId: "animals",
    endTableId: "owners",
    startFieldId: "owner_id",
    endFieldId: "id",
    cardinality: Cardinality.MANY_TO_ONE,
  },
  {
    id: "r2",
    startTableId: "species",
    endTableId: "animals",
    fields: [{ startFieldId: "id", endFieldId: "species_id" }],
    cardinality: Cardinality.ONE_TO_MANY,
  },
];

const names = (entries) => entries.map(({ field }) => field.name);

describe("canvas field order", () => {
  it("puts keys first, timestamps last, updated_at second last and created_at last", () => {
    expect(names(getVisibleFieldEntries(animals, relationships))).toEqual([
      "id",
      "owner_id",
      "species_id",
      "name",
      "born_on",
      "archived_at",
      "last_seen",
      "updated_at",
      "created_at",
    ]);
  });

  it("keeps the original index of each field", () => {
    const entries = getVisibleFieldEntries(animals, relationships);
    expect(entries[0]).toMatchObject({ originalIndex: 5 });
  });

  it("finds a field's row in the displayed order", () => {
    expect(getVisibleFieldIndex(animals, "created_at", relationships)).toBe(8);
    expect(getVisibleFieldIndex(animals, "owner_id", relationships)).toBe(1);
  });

  it("does not treat the referenced end of an FK as a foreign key", () => {
    const owners = {
      id: "owners",
      fields: [field("name"), field("id", "UUID")],
    };
    expect(names(getVisibleFieldEntries(owners, relationships))).toEqual([
      "name",
      "id",
    ]);
  });
});
