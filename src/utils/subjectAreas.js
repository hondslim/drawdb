import { defaultBlue } from "../data/constants";
import { autoArrange } from "./autoArrange";
import { findTableByRef } from "./deepLink";
import { getTableHeight, getTableWidth } from "./utils";

const PADDING = 40;
const LABEL_HEIGHT = 40;
const CLUSTER_GAP = 120;
const NEW_MEMBER_GAP = 60;
const FIT_WIDTH = 1500;
const FIT_HEIGHT = 850;
const LAYOUT_SETTINGS = { showComments: true };

function membership(tables, groups) {
  const used = new Set();
  const clusters = groups.map((group) => {
    const members = [];
    (group.tables ?? []).forEach((ref) => {
      const table = findTableByRef(tables, ref);
      if (!table || used.has(table.id)) return;
      used.add(table.id);
      members.push(table);
    });
    return { group, members };
  });
  const rest = tables.filter((table) => !used.has(table.id));
  return { clusters: clusters.filter((c) => c.members.length), rest };
}

function bounds(tables) {
  const minX = Math.min(...tables.map((t) => t.x));
  const minY = Math.min(...tables.map((t) => t.y));
  const maxX = Math.max(...tables.map((t) => t.x + getTableWidth(t)));
  const maxY = Math.max(
    ...tables.map((t) => t.y + getTableHeight(t, true, [])),
  );
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

function frame(box) {
  return {
    x: box.minX - PADDING,
    y: box.minY - PADDING - LABEL_HEIGHT,
    width: box.width + 2 * PADDING,
    height: box.height + 2 * PADDING + LABEL_HEIGHT,
  };
}

function arrangeCluster(members, relationships) {
  const ids = new Set(members.map((t) => t.id));
  const inside = relationships.filter(
    (r) => ids.has(r.startTableId) && ids.has(r.endTableId),
  );
  const unlocked = members.map((t) => ({ ...t, locked: false }));
  const positions = new Map(
    autoArrange(unlocked, inside, LAYOUT_SETTINGS).map((p) => [p.id, p]),
  );
  const arranged = members.map((t) => ({
    ...t,
    x: positions.get(t.id)?.x ?? 0,
    y: positions.get(t.id)?.y ?? 0,
  }));
  const box = bounds(arranged);
  return arranged.map((t) => ({
    ...t,
    x: t.x - box.minX + PADDING,
    y: t.y - box.minY + PADDING + LABEL_HEIGHT,
  }));
}

function areaFor(group, members, color) {
  return {
    name: group.name,
    color: color ?? group.color ?? defaultBlue,
    ...frame(bounds(members)),
    source: true,
  };
}

function fitView(tables, areas) {
  const box = bounds(tables);
  const minX = Math.min(box.minX, ...areas.map((a) => a.x));
  const minY = Math.min(box.minY, ...areas.map((a) => a.y));
  const maxX = Math.max(box.maxX, ...areas.map((a) => a.x + a.width));
  const maxY = Math.max(box.maxY, ...areas.map((a) => a.y + a.height));
  const scale = Math.min(FIT_WIDTH / (maxX - minX), FIT_HEIGHT / (maxY - minY));
  return {
    zoom: Math.max(0.05, Math.min(1, Math.floor(scale * 20) / 20)),
    pan: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
  };
}

function withIds(areas) {
  return areas.map((area, id) => ({ ...area, id }));
}

export function layoutAreaClusters(tables, relationships, groups, extraAreas) {
  const { clusters, rest } = membership(tables, groups);
  const laidOut = [
    ...clusters.map(({ group, members }) => ({
      group,
      members: arrangeCluster(members, relationships),
    })),
    ...(rest.length
      ? [{ group: null, members: arrangeCluster(rest, relationships) }]
      : []),
  ].map((cluster) => {
    const box = bounds(cluster.members);
    return {
      ...cluster,
      width: box.maxX + PADDING,
      height: box.maxY + PADDING,
    };
  });

  const totalArea = laidOut.reduce((sum, c) => sum + c.width * c.height, 0);
  const rowWidth = Math.max(
    ...laidOut.map((c) => c.width),
    Math.sqrt(totalArea) * 1.3,
  );

  const positions = new Map();
  const areas = [];
  let x = 0;
  let y = 0;
  let rowHeight = 0;
  laidOut.forEach((cluster) => {
    if (x > 0 && x + cluster.width > rowWidth) {
      x = 0;
      y += rowHeight + CLUSTER_GAP;
      rowHeight = 0;
    }
    const placed = cluster.members.map((t) => ({
      ...t,
      x: t.x + x,
      y: t.y + y,
    }));
    placed.forEach((t) => positions.set(t.id, t));
    if (cluster.group) areas.push(areaFor(cluster.group, placed));
    x += cluster.width + CLUSTER_GAP;
    rowHeight = Math.max(rowHeight, cluster.height);
  });

  const placedTables = tables.map((t) => {
    const placed = positions.get(t.id);
    return placed ? { ...t, x: placed.x, y: placed.y } : t;
  });
  return {
    tables: placedTables,
    areas: withIds([...areas, ...(extraAreas ?? [])]),
    ...fitView(placedTables, areas),
  };
}

export function placeNewAreaMembers(tables, groups, storedIds) {
  const moved = new Map();
  membership(tables, groups).clusters.forEach(({ members }) => {
    const existing = members.filter((t) => storedIds.has(t.id));
    const added = members.filter((t) => !storedIds.has(t.id));
    if (!existing.length || !added.length) return;
    const box = bounds(existing);
    let y = box.maxY + NEW_MEMBER_GAP;
    added.forEach((t) => {
      moved.set(t.id, { x: box.minX, y });
      y += getTableHeight(t, true, []) + NEW_MEMBER_GAP;
    });
  });
  return tables.map((t) =>
    moved.has(t.id) ? { ...t, ...moved.get(t.id) } : t,
  );
}

export function fitSourceAreas(tables, groups, storedAreas) {
  const colours = new Map(
    (storedAreas ?? [])
      .filter((area) => area.source)
      .map((area) => [area.name, area.color]),
  );
  const sourceAreas = membership(tables, groups).clusters.map(
    ({ group, members }) => areaFor(group, members, colours.get(group.name)),
  );
  return withIds([
    ...sourceAreas,
    ...(storedAreas ?? []).filter((area) => !area.source),
  ]);
}
