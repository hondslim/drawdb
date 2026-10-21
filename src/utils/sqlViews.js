import { nanoid } from "nanoid";
import { normalizeSchema } from "./schema";
import { postgresTableKey, qualifyTableName } from "./postgresMeta";
import { getTableWidth } from "./utils";

const VIEW_COLOR = "#7e57c2";
const GAP_X = 80;
const GAP_Y = 60;
const ROW_HEIGHT = 36;
const HEADER_HEIGHT = 50;

export function isReadOnlyTable(table) {
  return !!(table.stub || table.sqlView);
}

export function sqlViewTables(views) {
  return (views ?? []).map((view) => ({
    id: nanoid(),
    name: view.name,
    schema: normalizeSchema(view.schema),
    comment: view.comment ?? "",
    color: VIEW_COLOR,
    fields: (view.columns ?? []).map((column) => ({
      id: nanoid(),
      name: column.name,
      type: String(column.type ?? "").toUpperCase(),
      default: "",
      check: "",
      primary: false,
      unique: false,
      notNull: false,
      increment: false,
      comment: "",
    })),
    indices: [],
    uniqueConstraints: [],
    checks: [],
    sqlView: {
      definition: view.definition ?? "",
      dependsOn: view.dependsOn ?? [],
      materialized: !!view.materialized,
    },
    locked: false,
    collapsed: false,
  }));
}

export function placeSqlViews(tables, viewTables) {
  const placed = tables.filter((t) => t.x !== undefined);
  const x = placed.length
    ? Math.max(...placed.map((t) => t.x + getTableWidth(t))) + GAP_X
    : 0;
  let y = placed.length ? Math.min(...placed.map((t) => t.y)) : 0;
  viewTables.forEach((view) => {
    view.x = x;
    view.y = y;
    y += HEADER_HEIGHT + view.fields.length * ROW_HEIGHT + GAP_Y;
  });
  return [...tables, ...viewTables];
}

export function viewDependencyPairs(tables, { activeIds, showAll = false }) {
  const visible = tables.filter((t) => !t.hidden);
  const byKey = new Map(visible.map((t) => [postgresTableKey(t), t]));
  return visible
    .filter((t) => t.sqlView && (showAll || activeIds.has(t.id)))
    .flatMap((view) =>
      view.sqlView.dependsOn
        .map((key) => byKey.get(qualifyTableName(key)))
        .filter((target) => target && target.id !== view.id)
        .map((target) => [view, target]),
    );
}
