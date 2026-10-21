import { useMemo, useState } from "react";
import { Collapse, Button, Select, Switch } from "@douyinfe/semi-ui";
import { IconEyeOpened, IconEyeClosed } from "@douyinfe/semi-icons";
import { IconPlus } from "@douyinfe/semi-icons";
import {
  useSelect,
  useDiagram,
  useSaveState,
  useLayout,
  useUndoRedo,
  useSettings,
} from "../../../hooks";
import { Action, DB, ObjectType, State } from "../../../data/constants";
import { rlsState } from "../../../utils/postgresMeta";
import { useTranslation } from "react-i18next";
import { DragHandle } from "../../SortableList/DragHandle";
import { SortableList } from "../../SortableList/SortableList";
import SearchBar from "./SearchBar";
import Empty from "../Empty";
import TableInfo from "./TableInfo";
import { DEFAULT_SCHEMA, diagramSchemas } from "../../../utils/schema";

const ALL_SCHEMAS = "\u0000all";

export default function TablesTab() {
  const { tables, addTable, setTables, postgres, database } = useDiagram();
  const { selectedElement, setSelectedElement } = useSelect();
  const { t } = useTranslation();
  const { layout } = useLayout();
  const { setSaveState } = useSaveState();
  const [schemaFilter, setSchemaFilter] = useState(ALL_SCHEMAS);
  const [rlsOffOnly, setRlsOffOnly] = useState(false);
  const hasRls = database === DB.POSTGRES && !!postgres;

  const schemas = useMemo(() => diagramSchemas(tables), [tables]);
  const activeFilter =
    schemas.length > 1 && schemas.includes(schemaFilter)
      ? schemaFilter
      : ALL_SCHEMAS;
  const filterRls = hasRls && rlsOffOnly;
  const isVisible = (table) =>
    (activeFilter === ALL_SCHEMAS || (table.schema ?? "") === activeFilter) &&
    (!filterRls || rlsState(postgres, table) === "off");
  const isFiltered = activeFilter !== ALL_SCHEMAS || filterRls;
  const visibleTables = isFiltered ? tables.filter(isVisible) : tables;

  const reorderVisible = (reordered) => {
    if (!isFiltered) {
      setTables(reordered);
      return;
    }
    const queue = [...reordered];
    setTables(
      tables.map((table) => (isVisible(table) ? queue.shift() : table)),
    );
  };

  return (
    <>
      <div className="flex gap-2">
        <SearchBar tables={visibleTables} />
        <div>
          <Button
            block
            icon={<IconPlus />}
            onClick={() => addTable()}
            disabled={layout.readOnly}
          >
            {t("add_table")}
          </Button>
        </div>
      </div>
      {schemas.length > 1 && (
        <Select
          className="w-full mt-2"
          value={activeFilter}
          onChange={setSchemaFilter}
          optionList={[
            { value: ALL_SCHEMAS, label: t("all_schemas") },
            ...schemas.map((schema) => ({
              value: schema,
              label: schema || DEFAULT_SCHEMA,
            })),
          ]}
          prefix={<span className="px-2 opacity-60">{t("schema")}</span>}
        />
      )}
      {hasRls && (
        <label className="flex items-center gap-2 mt-2 text-sm cursor-pointer">
          <Switch size="small" checked={rlsOffOnly} onChange={setRlsOffOnly} />
          {t("rls_off_only")}
        </label>
      )}
      {tables.length === 0 ? (
        <Empty title={t("no_tables")} text={t("no_tables_text")} />
      ) : (
        <Collapse
          activeKey={
            selectedElement.open && selectedElement.element === ObjectType.TABLE
              ? `${selectedElement.id}`
              : ""
          }
          keepDOM={false}
          lazyRender
          onChange={(k) =>
            setSelectedElement((prev) => ({
              ...prev,
              open: true,
              id: k[0],
              element: ObjectType.TABLE,
            }))
          }
          accordion
        >
          <SortableList
            keyPrefix="tables-tab"
            items={visibleTables}
            onChange={reorderVisible}
            afterChange={() => setSaveState(State.SAVING)}
            renderItem={(item) => (
              <TableListItem
                table={item}
                showSchema={schemas.length > 1 || !!item.stub}
              />
            )}
          />
        </Collapse>
      )}
    </>
  );
}

function TableListItem({ table, showSchema }) {
  const { layout } = useLayout();
  const { updateTable } = useDiagram();
  const { setUndoStack, setRedoStack } = useUndoRedo();
  const { settings } = useSettings();
  const { t } = useTranslation();

  const toggleTableVisibility = (e) => {
    e.stopPropagation();
    setUndoStack((prev) => [
      ...prev,
      {
        action: Action.EDIT,
        element: ObjectType.TABLE,
        component: "self",
        tid: table.id,
        undo: { hidden: table.hidden },
        redo: { hidden: !table.hidden },
        message: t("edit_table", {
          tableName: table.name,
          extra: "[hidden]",
        }),
      },
    ]);
    setRedoStack([]);
    updateTable(table.id, { hidden: !table.hidden });
  };

  return (
    <div id={`scroll_table_${table.id}`}>
      <Collapse.Panel
        className="relative"
        header={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <DragHandle readOnly={layout.readOnly} id={table.id} />
              <div className="overflow-hidden text-ellipsis whitespace-nowrap shrink-0 max-w-[60%]">
                {showSchema && table.schema && (
                  <span className="font-normal opacity-60">
                    {table.schema}.
                  </span>
                )}
                {table.name}
              </div>
              {settings.showComments && table.comment && (
                <div
                  className="overflow-hidden text-ellipsis whitespace-nowrap min-w-0 flex-1 text-xs font-normal opacity-60"
                  title={table.comment}
                >
                  {table.comment}
                </div>
              )}
            </div>
            <Button
              size="small"
              theme="borderless"
              type="tertiary"
              onClick={toggleTableVisibility}
              icon={table.hidden ? <IconEyeClosed /> : <IconEyeOpened />}
              className="me-2"
            />
            <div
              className="w-1 h-full absolute top-0 left-0 bottom-0"
              style={{ backgroundColor: table.color }}
            />
          </div>
        }
        itemKey={`${table.id}`}
      >
        <TableInfo data={table} />
      </Collapse.Panel>
    </div>
  );
}
