import { useTranslation } from "react-i18next";
import { useDiagram, useSelect } from "../../../hooks";
import { ObjectType } from "../../../data/constants";
import { postgresTableKey } from "../../../utils/postgresMeta";
import CodeEditor from "../../CodeEditor";

const LINE_HEIGHT = 19;
const MAX_EDITOR_HEIGHT = 420;

export default function SqlViewDetails({ table }) {
  const { t } = useTranslation();
  const { tables } = useDiagram();
  const { setSelectedElement } = useSelect();
  const { definition, dependsOn } = table.sqlView;

  const openTable = (key) => {
    const target = tables.find((tb) => postgresTableKey(tb) === key);
    if (!target) return;
    setSelectedElement((prev) => ({
      ...prev,
      element: ObjectType.TABLE,
      id: target.id,
      open: true,
    }));
    document
      .getElementById(`scroll_table_${target.id}`)
      ?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div>
      <ul className="mb-3 font-mono text-sm">
        {table.fields.map((field) => (
          <li key={field.id}>
            {field.name} <span className="opacity-60">{field.type}</span>
          </li>
        ))}
      </ul>
      {dependsOn.length > 0 && (
        <div className="mb-3 text-sm">
          <div className="font-semibold mb-1">{t("depends_on")}:</div>
          {dependsOn.map((key) => (
            <div key={key}>
              <button
                type="button"
                className="font-mono text-sky-600 hover:underline break-all text-left"
                onClick={() => openTable(key)}
              >
                {key}
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="font-semibold mb-1 text-sm">{t("definition")}:</div>
      <CodeEditor
        language="pgsql"
        value={definition}
        formatOnMount={false}
        height={`${Math.min(
          MAX_EDITOR_HEIGHT,
          (definition.split("\n").length + 1) * LINE_HEIGHT,
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
    </div>
  );
}
