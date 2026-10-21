import { useMemo } from "react";
import { Switch } from "@douyinfe/semi-ui";
import { useTranslation } from "react-i18next";
import { useDiagram, useLayout, useSelect } from "../../hooks";
import { ObjectType, Tab } from "../../data/constants";
import { computeDiff } from "../../utils/schemaDiff";

const MARKS = { added: "+", removed: "−", changed: "~" };
const COLORS = {
  added: "text-green-600",
  removed: "text-red-600",
  changed: "text-amber-600",
};
const GROUPS = [
  ["table", "tables"],
  ["column", "columns"],
  ["relationship", "foreign_keys"],
];

function label(change) {
  return change.kind === "column"
    ? `${change.table}.${change.name}`
    : change.name;
}

export default function ChangesTab() {
  const { t } = useTranslation();
  const { tables, relationships, diffBase } = useDiagram();
  const { layout, setLayout } = useLayout();
  const { setSelectedElement } = useSelect();

  const changes = useMemo(
    () =>
      diffBase ? computeDiff(diffBase, { tables, relationships }).changes : [],
    [diffBase, tables, relationships],
  );

  const select = (tableId) => {
    if (!tableId) return;
    setSelectedElement((prev) => ({
      ...prev,
      currentTab: Tab.TABLES,
      element: ObjectType.TABLE,
      id: tableId,
      open: true,
    }));
    setTimeout(() => {
      document
        .getElementById(`scroll_table_${tableId}`)
        ?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  return (
    <>
      <label className="flex items-center gap-2 mb-3 text-sm cursor-pointer">
        <Switch
          size="small"
          checked={layout.showDiff}
          onChange={(value) =>
            setLayout((prev) => ({ ...prev, showDiff: value }))
          }
        />
        {t("highlight_changes")}
      </label>
      {changes.length === 0 ? (
        <div className="text-sm opacity-70">{t("no_changes")}</div>
      ) : (
        GROUPS.map(([kind, title]) => {
          const items = changes.filter((change) => change.kind === kind);
          if (!items.length) return null;
          return (
            <div key={kind} className="mb-3">
              <div className="font-semibold mb-1">
                {t(title)} ({items.length})
              </div>
              {items.map((change) => (
                <button
                  key={`${change.status}:${label(change)}`}
                  type="button"
                  disabled={!change.tableId}
                  onClick={() => select(change.tableId)}
                  className="block w-full text-left text-sm py-0.5 hover:underline disabled:hover:no-underline"
                >
                  <span
                    className={`font-mono font-bold ${COLORS[change.status]}`}
                  >
                    {MARKS[change.status]}
                  </span>{" "}
                  <span className="font-mono break-all">{label(change)}</span>
                  {change.details?.length > 0 && (
                    <div className="text-xs opacity-70 ps-4">
                      {change.details.join(", ")}
                    </div>
                  )}
                </button>
              ))}
            </div>
          );
        })
      )}
    </>
  );
}
