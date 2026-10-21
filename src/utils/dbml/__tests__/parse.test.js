import { describe, expect, it } from "vitest";
import { parseDbml } from "../parse";
import { Cardinality } from "../../../data/constants";

const db2dbml = `
TablePartial audit {
  "created_at" timestamptz [not null, default: \`now()\`]
}

Table "owners" {
  "id" uuid [pk, not null]
}

Table "animals" {
  "id" uuid [pk, not null]
  "owner_id" uuid
  "birth_date" date [check: \`birth_date <= now()\`]
  "archived_at" timestamptz
  ~audit

  checks {
    \`(archived_at IS NULL) = (owner_id IS NULL)\` [name: 'animals_archival_all_or_nothing']
  }
}

Ref "animals_owner_id_fkey":"animals"."owner_id" >? "owners"."id" [delete: cascade]
Ref "owners_animal_fkey":"owners"."id" <? "animals"."id"
`;

describe("parseDbml with DBML 10.x", () => {
  const parsed = parseDbml(db2dbml);
  const animals = parsed.tables.find((t) => t.name === "animals");

  it("expands table partials", () => {
    expect(animals.fields.map((f) => f.name)).toEqual([
      "id",
      "owner_id",
      "birth_date",
      "archived_at",
      "created_at",
    ]);
  });

  it("keeps column checks", () => {
    const birthDate = animals.fields.find((f) => f.name === "birth_date");
    expect(birthDate.checks).toEqual([
      { name: "", expression: "birth_date <= now()" },
    ]);
  });

  it("keeps table checks with their names", () => {
    expect(animals.checks).toEqual([
      {
        name: "animals_archival_all_or_nothing",
        expression: "(archived_at IS NULL) = (owner_id IS NULL)",
      },
    ]);
  });

  it("imports optional relations with their cardinality and optionality", () => {
    expect(parsed.relationships).toHaveLength(2);
    const [toOwner, toAnimal] = parsed.relationships;
    expect(toOwner).toMatchObject({
      name: "animals_owner_id_fkey",
      cardinality: Cardinality.MANY_TO_ONE,
      startOptional: false,
      endOptional: true,
    });
    expect(toAnimal).toMatchObject({
      cardinality: Cardinality.ONE_TO_MANY,
      startOptional: false,
      endOptional: true,
    });
  });
});
