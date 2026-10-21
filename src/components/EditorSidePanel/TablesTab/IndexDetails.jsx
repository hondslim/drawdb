import { Action, DB, ObjectType } from "../../../data/constants";
import {
  Input,
  Button,
  Popover,
  Checkbox,
  Select,
  Tag,
} from "@douyinfe/semi-ui";
import { IconMore, IconDeleteStroked } from "@douyinfe/semi-icons";
import { useDiagram, useLayout, useUndoRedo } from "../../../hooks";
import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";

const INDEX_METHODS = ["btree", "hash", "gist", "spgist", "gin", "brin"];

export default function IndexDetails({ data, fields, iid, tid }) {
  const { t } = useTranslation();
  const { layout } = useLayout();
  const { tables, updateTable, database } = useDiagram();
  const { setUndoStack, setRedoStack } = useUndoRedo();
  const [editField, setEditField] = useState({});
  const table = useMemo(() => tables.find((t) => t.id === tid), [tables, tid]);

  const editDetail = (key, value, previous) => {
    if (layout.readOnly) return;
    const next = Array.isArray(value)
      ? value.length
        ? value
        : undefined
      : value || undefined;
    setUndoStack((prev) => [
      ...prev,
      {
        action: Action.EDIT,
        element: ObjectType.TABLE,
        component: "index",
        tid: tid,
        iid: iid,
        undo: { [key]: previous },
        redo: { [key]: next },
        message: t("edit_table", {
          tableName: table.name,
          extra: `[index ${key}]`,
        }),
      },
    ]);
    setRedoStack([]);
    updateTable(tid, {
      indices: table.indices.map((index) =>
        index.id === iid ? { ...index, [key]: next } : index,
      ),
    });
  };

  const hasDetails =
    data.method ||
    data.where ||
    data.include?.length ||
    data.expressions?.length;

  return (
    <div className="mb-2">
      <div className="flex justify-between items-center">
        <Select
          placeholder={t("select_fields")}
          multiple
          validateStatus={data.fields.length === 0 ? "error" : "default"}
          optionList={fields}
          className="w-full"
          value={data.fields}
          onChange={(value) => {
            if (layout.readOnly) return;

            setUndoStack((prev) => [
              ...prev,
              {
                action: Action.EDIT,
                element: ObjectType.TABLE,
                component: "index",
                tid: tid,
                iid: iid,
                undo: {
                  fields: [...data.fields],
                },
                redo: {
                  fields: [...value],
                },
                message: t("edit_table", {
                  tableName: table.name,
                  extra: "[index field]",
                }),
              },
            ]);
            setRedoStack([]);
            updateTable(tid, {
              indices: table.indices.map((index) =>
                index.id === iid
                  ? {
                      ...index,
                      fields: [...value],
                    }
                  : index,
              ),
            });
          }}
        />
        <Popover
          content={
            <div className="px-1 popover-theme">
              <div className="font-semibold mb-1">{t("name")}: </div>
              <Input
                value={data.name}
                placeholder={t("name")}
                readonly={layout.readOnly}
                validateStatus={data.name.trim() === "" ? "error" : "default"}
                onFocus={() =>
                  setEditField({
                    name: data.name,
                  })
                }
                onChange={(value) =>
                  updateTable(tid, {
                    indices: table.indices.map((index) =>
                      index.id === iid
                        ? {
                            ...index,
                            name: value,
                          }
                        : index,
                    ),
                  })
                }
                onBlur={(e) => {
                  if (e.target.value === editField.name) return;
                  setUndoStack((prev) => [
                    ...prev,
                    {
                      action: Action.EDIT,
                      element: ObjectType.TABLE,
                      component: "index",
                      tid: tid,
                      iid: iid,
                      undo: editField,
                      redo: { name: e.target.value },
                      message: t("edit_table", {
                        tableName: table.name,
                        extra: "[index]",
                      }),
                    },
                  ]);
                  setRedoStack([]);
                }}
              />
              {database === DB.POSTGRES && (
                <>
                  <div className="font-semibold mt-3 mb-1">
                    {t("index_method")}:
                  </div>
                  <Select
                    className="w-full"
                    value={data.method ?? "btree"}
                    disabled={layout.readOnly}
                    optionList={INDEX_METHODS.map((method) => ({
                      label: method,
                      value: method,
                    }))}
                    onChange={(value) =>
                      editDetail(
                        "method",
                        value === "btree" ? undefined : value,
                        data.method,
                      )
                    }
                  />
                  <div className="font-semibold mt-3 mb-1">INCLUDE:</div>
                  <Select
                    className="w-full"
                    multiple
                    value={data.include ?? []}
                    disabled={layout.readOnly}
                    optionList={fields}
                    onChange={(value) =>
                      editDetail("include", value, data.include)
                    }
                  />
                  <div className="font-semibold mt-3 mb-1">WHERE:</div>
                  <Input
                    value={data.where ?? ""}
                    placeholder={t("index_where")}
                    readonly={layout.readOnly}
                    className="font-mono"
                    onFocus={() => setEditField({ where: data.where })}
                    onChange={(value) =>
                      updateTable(tid, {
                        indices: table.indices.map((index) =>
                          index.id === iid
                            ? { ...index, where: value || undefined }
                            : index,
                        ),
                      })
                    }
                    onBlur={(e) => {
                      if ((e.target.value || undefined) === editField.where)
                        return;
                      setUndoStack((prev) => [
                        ...prev,
                        {
                          action: Action.EDIT,
                          element: ObjectType.TABLE,
                          component: "index",
                          tid: tid,
                          iid: iid,
                          undo: { where: editField.where },
                          redo: { where: e.target.value || undefined },
                          message: t("edit_table", {
                            tableName: table.name,
                            extra: "[index where]",
                          }),
                        },
                      ]);
                      setRedoStack([]);
                    }}
                  />
                </>
              )}
              <div className="flex justify-between items-center my-3">
                <div className="font-medium">{t("unique")}</div>
                <Checkbox
                  value="unique"
                  checked={data.unique}
                  disabled={layout.readOnly}
                  onChange={(checkedValues) => {
                    setUndoStack((prev) => [
                      ...prev,
                      {
                        action: Action.EDIT,
                        element: ObjectType.TABLE,
                        component: "index",
                        tid: tid,
                        iid: iid,
                        undo: {
                          [checkedValues.target.value]:
                            !checkedValues.target.checked,
                        },
                        redo: {
                          [checkedValues.target.value]:
                            checkedValues.target.checked,
                        },
                        message: t("edit_table", {
                          tableName: table.name,
                          extra: "[index field]",
                        }),
                      },
                    ]);
                    setRedoStack([]);
                    updateTable(tid, {
                      indices: table.indices.map((index) =>
                        index.id === iid
                          ? {
                              ...index,
                              [checkedValues.target.value]:
                                checkedValues.target.checked,
                            }
                          : index,
                      ),
                    });
                  }}
                ></Checkbox>
              </div>
              <Button
                block
                type="danger"
                disabled={layout.readOnly}
                icon={<IconDeleteStroked />}
                onClick={() => {
                  setUndoStack((prev) => [
                    ...prev,
                    {
                      action: Action.EDIT,
                      element: ObjectType.TABLE,
                      component: "index_delete",
                      tid: tid,
                      data: data,
                      message: t("edit_table", {
                        tableName: table.name,
                        extra: "[delete index]",
                      }),
                    },
                  ]);
                  setRedoStack([]);
                  updateTable(tid, {
                    indices: table.indices
                      .filter((e) => e.id !== iid)
                      .map((e, j) => ({
                        ...e,
                        id: j,
                      })),
                  });
                }}
              >
                {t("delete")}
              </Button>
            </div>
          }
          trigger="click"
          position="rightTop"
          showArrow
        >
          <Button
            icon={<IconMore />}
            type="tertiary"
            style={{ marginLeft: "12px" }}
          />
        </Popover>
      </div>
      {hasDetails && (
        <div className="flex flex-wrap gap-1 mt-1 text-xs">
          {data.method && <Tag size="small">USING {data.method}</Tag>}
          {(data.expressions ?? []).map((expression) => (
            <Tag key={expression} size="small" color="violet">
              <span className="font-mono">{expression}</span>
            </Tag>
          ))}
          {data.include?.length > 0 && (
            <Tag size="small" color="blue">
              INCLUDE ({data.include.join(", ")})
            </Tag>
          )}
          {data.where && (
            <div className="w-full font-mono break-words opacity-80">
              WHERE {data.where}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
