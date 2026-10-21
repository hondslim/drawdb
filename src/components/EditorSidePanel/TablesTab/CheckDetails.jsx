import { useState } from "react";
import { Input, TextArea, Button } from "@douyinfe/semi-ui";
import { IconDeleteStroked } from "@douyinfe/semi-icons";
import { useTranslation } from "react-i18next";
import { useDiagram, useLayout, useUndoRedo } from "../../../hooks";
import { Action, ObjectType } from "../../../data/constants";

export default function CheckDetails({ table }) {
  const { t } = useTranslation();
  const { layout } = useLayout();
  const { updateTable } = useDiagram();
  const { setUndoStack, setRedoStack } = useUndoRedo();
  const [before, setBefore] = useState(null);
  const checks = table.checks ?? [];

  const pushUndo = (undo, redo, extra) => {
    setUndoStack((prev) => [
      ...prev,
      {
        action: Action.EDIT,
        element: ObjectType.TABLE,
        component: "self",
        tid: table.id,
        undo: { checks: undo },
        redo: { checks: redo },
        message: t("edit_table", { tableName: table.name, extra }),
      },
    ]);
    setRedoStack([]);
  };

  const edit = (index, values) =>
    updateTable(table.id, {
      checks: checks.map((check, i) =>
        i === index ? { ...check, ...values } : check,
      ),
    });

  const commit = () => {
    if (!before) return;
    const changed = before.some(
      (check, i) =>
        check.name !== checks[i]?.name ||
        check.expression !== checks[i]?.expression,
    );
    if (changed) pushUndo(before, checks, "[check]");
    setBefore(null);
  };

  const remove = (index) => {
    const next = checks.filter((_, i) => i !== index);
    pushUndo(checks, next, "[delete check]");
    updateTable(table.id, { checks: next });
  };

  return checks.map((check, i) => (
    <div key={i} className="flex gap-1 mb-2 items-start">
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <Input
          value={check.name}
          placeholder={t("name")}
          readonly={layout.readOnly}
          onFocus={() => setBefore(checks)}
          onChange={(value) => edit(i, { name: value })}
          onBlur={commit}
        />
        <TextArea
          value={check.expression}
          placeholder={t("check")}
          readonly={layout.readOnly}
          autosize
          rows={1}
          className="font-mono"
          validateStatus={check.expression.trim() === "" ? "error" : "default"}
          onFocus={() => setBefore(checks)}
          onChange={(value) => edit(i, { expression: value })}
          onBlur={commit}
        />
      </div>
      <Button
        type="danger"
        icon={<IconDeleteStroked />}
        disabled={layout.readOnly}
        onClick={() => remove(i)}
      />
    </div>
  ));
}
