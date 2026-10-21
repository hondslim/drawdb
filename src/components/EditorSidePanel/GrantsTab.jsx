import { useMemo, useState } from "react";
import { Select } from "@douyinfe/semi-ui";
import { useTranslation } from "react-i18next";
import { useDiagram, useSelect } from "../../hooks";
import { ObjectType, Tab } from "../../data/constants";
import {
  grantMatrix,
  grantRoles,
  postgresTableKey,
} from "../../utils/postgresMeta";
import GrantTable from "./GrantTable";

const ALL_ROLES = "\u0000all";

export default function GrantsTab() {
  const { t } = useTranslation();
  const { postgres, tables } = useDiagram();
  const { setSelectedElement } = useSelect();
  const [role, setRole] = useState(ALL_ROLES);

  const roles = useMemo(() => grantRoles(postgres), [postgres]);
  const rows = useMemo(
    () => grantMatrix(postgres, role === ALL_ROLES ? null : role),
    [postgres, role],
  );

  const openTable = (key) => {
    const table = tables.find((tb) => postgresTableKey(tb) === key);
    if (!table) return;
    setSelectedElement((prev) => ({
      ...prev,
      currentTab: Tab.TABLES,
      element: ObjectType.TABLE,
      id: table.id,
      open: true,
    }));
    setTimeout(() => {
      document
        .getElementById(`scroll_table_${table.id}`)
        ?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  return (
    <>
      <Select
        className="w-full mb-2"
        value={role}
        onChange={setRole}
        prefix={<span className="px-2 opacity-60">{t("role")}</span>}
        optionList={[
          { value: ALL_ROLES, label: t("all_roles") },
          ...roles.map((value) => ({ value, label: value })),
        ]}
      />
      {rows.length === 0 ? (
        <div className="text-sm opacity-70 py-2">
          {t("role_holds_no_grants", { role })}
        </div>
      ) : (
        <GrantTable
          rows={rows}
          renderLabel={(row) => (
            <>
              <button
                type="button"
                className="font-mono text-sky-600 hover:underline text-left"
                onClick={() => openTable(row.table)}
              >
                {row.table}
              </button>
              {role === ALL_ROLES && (
                <div className="opacity-70">{row.role}</div>
              )}
            </>
          )}
        />
      )}
    </>
  );
}
