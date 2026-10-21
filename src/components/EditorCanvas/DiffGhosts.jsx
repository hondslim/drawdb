import { memo } from "react";
import { getTableHeight, getTableWidth } from "../../utils/utils";
import { qualifiedName } from "../../utils/schema";
import { ghostRects } from "../../utils/diffGhosts";

const REMOVED = "#dc2626";

function centre(table) {
  return {
    x: table.x + getTableWidth(table) / 2,
    y: table.y + getTableHeight(table, false, []) / 2,
  };
}

export default memo(function DiffGhosts({ diff, tables }) {
  const tablesById = new Map(tables.map((t) => [t.id, t]));

  return (
    <g pointerEvents="none">
      {diff.removedRelationships.map((rel) => {
        const start = tablesById.get(rel.startTableId);
        const end = tablesById.get(rel.endTableId);
        if (!start || !end) return null;
        const a = centre(start);
        const b = centre(end);
        return (
          <path
            key={rel.signature}
            d={`M ${a.x} ${a.y} L ${b.x} ${b.y}`}
            stroke={REMOVED}
            strokeWidth={2}
            strokeDasharray="8 6"
            opacity={0.7}
          >
            <title>{rel.signature}</title>
          </path>
        );
      })}
      {ghostRects(diff.removedTables, tables).map(
        ({ table, x, y, width, height }) => (
          <foreignObject
            key={`ghost-${qualifiedName(table)}`}
            x={x}
            y={y}
            width={width}
            height={height}
            opacity={0.55}
          >
            <div
              className="w-full h-full rounded-lg border-2 border-dashed bg-red-50 text-red-700"
              style={{ borderColor: REMOVED }}
            >
              <div className="h-[40px] px-3 flex items-center font-bold line-through overflow-hidden text-ellipsis whitespace-nowrap">
                {qualifiedName(table)}
              </div>
              {table.fields.map((field) => (
                <div
                  key={field.name}
                  className="h-[36px] px-3 flex items-center justify-between border-t border-red-200 text-sm line-through"
                >
                  <span>{field.name}</span>
                  <span className="font-mono text-xs">{field.type}</span>
                </div>
              ))}
            </div>
          </foreignObject>
        ),
      )}
    </g>
  );
});
