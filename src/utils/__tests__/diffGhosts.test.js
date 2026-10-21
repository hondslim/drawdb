import { describe, expect, it } from "vitest";
import { ghostRects } from "../diffGhosts";

const table = (name, x, y) => ({
  name,
  x,
  y,
  fields: [{ id: 1, name: "id", type: "INT" }],
});

describe("ghostRects", () => {
  const current = [table("a", 0, 0), table("b", 400, 0)];

  it("keeps a ghost's base position when it is free", () => {
    const [ghost] = ghostRects([table("gone", 0, 600)], current);
    expect(ghost).toMatchObject({ x: 0, y: 600 });
  });

  it("moves overlapping or unplaced ghosts into a column on the right", () => {
    const [first, second] = ghostRects(
      [table("over", 10, 10), { ...table("none"), x: undefined }],
      current,
    );
    expect(first.x).toBeGreaterThan(400);
    expect(second.x).toBe(first.x);
    expect(second.y).toBeGreaterThan(first.y);
  });
});
