import { useEffect, useMemo, useState } from "react";
import { Collapse, Input, Tag } from "@douyinfe/semi-ui";
import { IconSearch } from "@douyinfe/semi-icons";
import { useTranslation } from "react-i18next";
import { useDiagram, useSelect } from "../../hooks";
import { ObjectType, Tab } from "../../data/constants";
import CodeEditor from "../CodeEditor";
import Empty from "./Empty";
import {
  functionKey,
  postgresTableKey,
  triggersByFunction,
} from "../../utils/postgresMeta";

const LINE_HEIGHT = 19;
const MAX_EDITOR_HEIGHT = 420;

function functionId(fn, index) {
  return `${functionKey(fn)}(${fn.arguments ?? ""})#${index}`;
}

function FunctionHeader({ fn }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="font-mono text-sm break-all">
        <span className="opacity-60">{fn.schema}.</span>
        <span className="font-semibold">{fn.name}</span>
        <span className="opacity-60">({fn.arguments})</span>
        {fn.returns && <span className="opacity-60"> → {fn.returns}</span>}
      </div>
      <div className="flex flex-wrap gap-1 mt-1">
        {fn.kind === "procedure" && <Tag size="small">PROCEDURE</Tag>}
        {fn.language && <Tag size="small">{fn.language}</Tag>}
        {fn.volatility && <Tag size="small">{fn.volatility}</Tag>}
        {fn.securityDefiner && (
          <Tag size="small" color="orange">
            SECURITY DEFINER
          </Tag>
        )}
      </div>
    </div>
  );
}

export default function FunctionsTab() {
  const { t } = useTranslation();
  const { postgres, tables } = useDiagram();
  const { selectedElement, setSelectedElement } = useSelect();
  const [query, setQuery] = useState("");
  const [activeKey, setActiveKey] = useState([]);

  const functions = useMemo(
    () =>
      (postgres?.functions ?? []).map((fn, index) => ({
        fn,
        id: functionId(fn, index),
        key: functionKey(fn),
      })),
    [postgres],
  );
  const callers = useMemo(() => triggersByFunction(postgres), [postgres]);

  useEffect(() => {
    if (selectedElement.element !== ObjectType.FUNCTION) return;
    const ids = functions
      .filter((item) => item.key === selectedElement.id)
      .map((item) => item.id);
    if (!ids.length) return;
    setActiveKey(ids);
    setTimeout(() => {
      document
        .getElementById(`function_${ids[0]}`)
        ?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }, [selectedElement.element, selectedElement.id, functions]);

  const needle = query.trim().toLowerCase();
  const shown = needle
    ? functions.filter(({ fn }) =>
        [fn.schema, fn.name, fn.returns]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(needle)),
      )
    : functions;

  const openTable = (tableKey) => {
    const table = tables.find((tb) => postgresTableKey(tb) === tableKey);
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
      <Input
        prefix={<IconSearch />}
        placeholder={t("search")}
        value={query}
        onChange={setQuery}
        showClear
      />
      {shown.length === 0 ? (
        <Empty title={t("no_functions")} text="" />
      ) : (
        <Collapse
          activeKey={activeKey}
          onChange={(keys) => setActiveKey(keys)}
          keepDOM={false}
          lazyRender
        >
          {shown.map(({ fn, id, key }) => {
            const triggers = callers.get(key) ?? [];
            const lines = String(fn.body ?? "").split("\n").length;
            return (
              <div id={`function_${id}`} key={id}>
                <Collapse.Panel
                  header={<FunctionHeader fn={fn} />}
                  itemKey={id}
                >
                  {triggers.length > 0 && (
                    <div className="mb-2 text-sm">
                      <div className="opacity-70 mb-1">
                        {t("called_by_triggers")}
                      </div>
                      {triggers.map((trigger) => (
                        <div key={`${trigger.table}.${trigger.name}`}>
                          <button
                            type="button"
                            className="font-mono text-sky-600 hover:underline text-left break-all"
                            onClick={() => openTable(trigger.table)}
                          >
                            {trigger.table}
                          </button>
                          <span className="opacity-70"> · {trigger.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {fn.body ? (
                    <CodeEditor
                      language="pgsql"
                      value={fn.body}
                      formatOnMount={false}
                      height={`${Math.min(
                        MAX_EDITOR_HEIGHT,
                        (lines + 1) * LINE_HEIGHT,
                      )}px`}
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        lineNumbers: "off",
                        scrollBeyondLastLine: false,
                        wordWrap: "on",
                        folding: false,
                      }}
                    />
                  ) : (
                    <div className="text-sm opacity-70">{t("no_body")}</div>
                  )}
                </Collapse.Panel>
              </div>
            );
          })}
        </Collapse>
      )}
    </>
  );
}
