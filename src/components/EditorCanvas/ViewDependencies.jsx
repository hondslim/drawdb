import { memo, useMemo } from "react";
import { getTableHeight, getTableWidth } from "../../utils/utils";
import { postgresTableKey } from "../../utils/postgresMeta";

function box(table, showComments, relationships) {
  const width = getTableWidth(table);
  const height = getTableHeight(table, showComments, relationships);
  return { x: table.x, y: table.y, width, height, cy: table.y + height / 2 };
}

function edgePath(from, to) {
  const leftToRight = from.x + from.width / 2 <= to.x + to.width / 2;
  const x1 = leftToRight ? from.x + from.width : from.x;
  const x2 = leftToRight ? to.x : to.x + to.width;
  const bend = Math.max(40, Math.abs(x2 - x1) / 2) * (leftToRight ? 1 : -1);
  return `M ${x1} ${from.cy} C ${x1 + bend} ${from.cy}, ${x2 - bend} ${to.cy}, ${x2} ${to.cy}`;
}

export default memo(function ViewDependencies({
  tables,
  relationships,
  showComments,
}) {
  const edges = useMemo(() => {
    const byKey = new Map(
      tables
        .filter((t) => !t.hidden)
        .map((table) => [postgresTableKey(table), table]),
    );
    return tables
      .filter((table) => table.sqlView && !table.hidden)
      .flatMap((view) =>
        view.sqlView.dependsOn
          .map((key) => byKey.get(key.includes(".") ? key : `public.${key}`))
          .filter((target) => target && target.id !== view.id)
          .map((target) => ({
            id: `${view.id}->${target.id}`,
            d: edgePath(
              box(view, showComments, relationships),
              box(target, showComments, relationships),
            ),
          })),
      );
  }, [tables, relationships, showComments]);

  return edges.map((edge) => (
    <path
      key={edge.id}
      d={edge.d}
      fill="none"
      stroke="#7e57c2"
      strokeWidth={2}
      strokeDasharray="6 5"
      opacity={0.7}
      pointerEvents="none"
    />
  ));
});
