import { describe, expect, it } from "vitest";
import { fromDBML } from "../importFrom/dbml";
import { mergeShare } from "../share";
import { getTableHeight, getTableWidth } from "../utils";
import { DB } from "../../data/constants";

const dbml = `
Table digivacc.owners { id uuid [pk] }
Table digivacc.animals {
  id uuid [pk]
  owner_id uuid
}
Table digivacc.vaccinations {
  id uuid [pk]
  animal_id uuid
}
Table digivacc.invoices { id uuid [pk] }
Table digivacc.plans { id uuid [pk] }
Table digivacc.loose { id uuid [pk] }
Ref: digivacc.animals.owner_id > digivacc.owners.id
Ref: digivacc.vaccinations.animal_id > digivacc.animals.id
`;

const groups = [
  {
    name: "Animals",
    color: "#ff0000",
    tables: ["digivacc.owners", "digivacc.animals", "digivacc.vaccinations"],
  },
  { name: "Billing", tables: ["digivacc.invoices", "plans", "digivacc.nope"] },
];

function share(source = dbml, areas = groups) {
  const imported = fromDBML(source, DB.POSTGRES);
  return {
    title: "t",
    database: DB.POSTGRES,
    tables: imported.tables,
    relationships: imported.relationships,
    subjectAreas: [],
    areas,
  };
}

const rect = (t) => ({
  x: t.x,
  y: t.y,
  right: t.x + getTableWidth(t),
  bottom: t.y + getTableHeight(t),
});
const inside = (t, a) => {
  const r = rect(t);
  return (
    r.x >= a.x &&
    r.y >= a.y &&
    r.right <= a.x + a.width &&
    r.bottom <= a.y + a.height
  );
};
const overlaps = (a, b) =>
  a.x < b.x + b.width &&
  b.x < a.x + a.width &&
  a.y < b.y + b.height &&
  b.y < a.y + a.height;

describe("subject areas from the payload", () => {
  const record = mergeShare(share(), null, "X");
  const byName = (name) => record.tables.find((t) => t.name === name);
  const area = (name) => record.areas.find((a) => a.name === name);

  it("creates one source area per group", () => {
    expect(record.areas.map((a) => [a.name, a.color, a.source])).toEqual([
      ["Animals", "#ff0000", true],
      ["Billing", expect.any(String), true],
    ]);
    expect(record.areas.map((a) => a.id)).toEqual([0, 1]);
  });

  it("places every member inside its area and areas do not overlap", () => {
    ["owners", "animals", "vaccinations"].forEach((name) =>
      expect(inside(byName(name), area("Animals"))).toBe(true),
    );
    ["invoices", "plans"].forEach((name) =>
      expect(inside(byName(name), area("Billing"))).toBe(true),
    );
    expect(overlaps(area("Animals"), area("Billing"))).toBe(false);
    expect(inside(byName("loose"), area("Animals"))).toBe(false);
    expect(inside(byName("loose"), area("Billing"))).toBe(false);
  });

  it("keeps positions and user areas on reload, and refits source areas", () => {
    const stored = {
      ...record,
      areas: [
        ...record.areas,
        {
          id: 2,
          name: "mine",
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          color: "#000000",
        },
      ],
      tables: record.tables.map((t) =>
        t.name === "invoices" ? { ...t, x: t.x + 500 } : t,
      ),
    };
    stored.areas[1] = { ...stored.areas[1], color: "#00ff00" };
    const merged = mergeShare(share(), stored, "X");
    const invoices = merged.tables.find((t) => t.name === "invoices");
    expect(invoices.x).toBe(stored.tables.find((t) => t.name === "invoices").x);
    const billing = merged.areas.find((a) => a.name === "Billing");
    expect(inside(invoices, billing)).toBe(true);
    expect(billing.color).toBe("#00ff00");
    expect(merged.areas.find((a) => a.name === "mine")).toMatchObject({
      width: 10,
    });
  });

  it("places a new member below its area's tables", () => {
    const merged = mergeShare(
      share(`${dbml}\nTable digivacc.receipts { id uuid [pk] }`, [
        groups[0],
        { ...groups[1], tables: [...groups[1].tables, "digivacc.receipts"] },
      ]),
      record,
      "X",
    );
    const receipts = merged.tables.find((t) => t.name === "receipts");
    const billing = merged.areas.find((a) => a.name === "Billing");
    expect(inside(receipts, billing)).toBe(true);
    const oldBilling = area("Billing");
    expect(receipts.y).toBeGreaterThanOrEqual(oldBilling.y);
  });

  it("drops source areas that left the payload", () => {
    const merged = mergeShare(share(dbml, [groups[0]]), record, "X");
    expect(merged.areas.map((a) => a.name)).toEqual(["Animals"]);
  });

  it("lays out clusters the first time a stored diagram gets areas", () => {
    const mine = { id: 0, name: "mine", x: 0, y: 0, width: 10, height: 10 };
    const stored = {
      ...mergeShare(share(dbml, null), null, "X"),
      areas: [mine],
    };
    const merged = mergeShare(share(), stored, "X");
    const find = (name) => merged.areas.find((a) => a.name === name);
    ["owners", "animals", "vaccinations"].forEach((name) =>
      expect(
        inside(
          merged.tables.find((t) => t.name === name),
          find("Animals"),
        ),
      ).toBe(true),
    );
    expect(overlaps(find("Animals"), find("Billing"))).toBe(false);
    expect(find("mine")).toMatchObject({ width: 10 });
    expect(find("mine").source).toBeUndefined();
  });

  it("fits the view to the laid-out areas", () => {
    const halfWidth = 1500 / record.zoom / 2;
    const halfHeight = 850 / record.zoom / 2;
    record.areas.forEach((a) => {
      expect(a.x).toBeGreaterThanOrEqual(record.pan.x - halfWidth);
      expect(a.x + a.width).toBeLessThanOrEqual(record.pan.x + halfWidth);
      expect(a.y).toBeGreaterThanOrEqual(record.pan.y - halfHeight);
      expect(a.y + a.height).toBeLessThanOrEqual(record.pan.y + halfHeight);
    });
  });

  it("does nothing without areas", () => {
    const plain = mergeShare(share(dbml, null), null, "X");
    expect(plain.areas).toEqual([]);
  });
});
