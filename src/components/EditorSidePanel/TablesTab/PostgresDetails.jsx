import { Card, Collapse, Tag } from "@douyinfe/semi-ui";
import { useTranslation } from "react-i18next";
import { useDiagram } from "../../../hooks";
import { DB } from "../../../data/constants";
import { metadataForTable, rlsState } from "../../../utils/postgresMeta";

function Expression({ label, value }) {
  if (!value) return null;
  return (
    <div className="mt-1">
      <div className="text-xs opacity-70">{label}</div>
      <pre className="font-mono text-xs whitespace-pre-wrap break-words m-0">
        {value}
      </pre>
    </div>
  );
}

function Policy({ policy }) {
  const { t } = useTranslation();
  return (
    <div className="py-2 border-b last:border-b-0 border-zinc-300">
      <div className="font-semibold break-all">{policy.name}</div>
      <div className="flex flex-wrap gap-1 my-1">
        <Tag size="small">{policy.command}</Tag>
        <Tag size="small" color={policy.permissive ? "green" : "orange"}>
          {policy.permissive ? "PERMISSIVE" : "RESTRICTIVE"}
        </Tag>
        {(policy.roles.length ? policy.roles : ["PUBLIC"]).map((role) => (
          <Tag key={role} size="small" color="blue">
            {role}
          </Tag>
        ))}
      </div>
      <Expression label="USING" value={policy.using} />
      <Expression label="WITH CHECK" value={policy.withCheck} />
      {!policy.using && !policy.withCheck && (
        <div className="text-xs opacity-70">{t("no_expression")}</div>
      )}
    </div>
  );
}

export function TriggerSummary({ trigger, onFunctionClick }) {
  const { t } = useTranslation();
  return (
    <>
      <div className="flex flex-wrap gap-1 my-1">
        <Tag size="small">{trigger.timing}</Tag>
        {trigger.events.map((event) => (
          <Tag key={event} size="small" color="blue">
            {event}
          </Tag>
        ))}
        <Tag size="small">FOR EACH {trigger.level}</Tag>
        {trigger.enabled === false && (
          <Tag size="small" color="red">
            {t("disabled")}
          </Tag>
        )}
      </div>
      <Expression label="WHEN" value={trigger.when} />
      {trigger.function && (
        <div className="mt-1 text-sm">
          <span className="opacity-70">{t("executes")} </span>
          {onFunctionClick ? (
            <button
              type="button"
              className="font-mono text-sky-600 hover:underline"
              onClick={() => onFunctionClick(trigger.function)}
            >
              {trigger.function}()
            </button>
          ) : (
            <span className="font-mono">{trigger.function}()</span>
          )}
        </div>
      )}
    </>
  );
}

function Section({ title, children }) {
  return (
    <Card
      bodyStyle={{ padding: "4px" }}
      style={{ marginTop: "12px", marginBottom: "12px" }}
      headerLine={false}
    >
      <Collapse keepDOM={false} lazyRender>
        <Collapse.Panel header={title} itemKey="1">
          {children}
        </Collapse.Panel>
      </Collapse>
    </Card>
  );
}

export default function PostgresDetails({ table }) {
  const { t } = useTranslation();
  const { postgres, database } = useDiagram();
  if (database !== DB.POSTGRES || !postgres || table.stub) return null;

  const meta = metadataForTable(postgres, table);
  const state = rlsState(postgres, table);

  return (
    <>
      <Section
        title={`${t("row_level_security")}: ${t(`rls_${state}`)} (${meta.policies.length})`}
      >
        {meta.policies.length === 0 ? (
          <div className="text-sm opacity-70 py-1">{t("no_policies")}</div>
        ) : (
          meta.policies.map((policy) => (
            <Policy key={policy.name} policy={policy} />
          ))
        )}
      </Section>
      {meta.triggers.length > 0 && (
        <Section title={`${t("triggers")} (${meta.triggers.length})`}>
          {meta.triggers.map((trigger) => (
            <div
              key={trigger.name}
              className="py-2 border-b last:border-b-0 border-zinc-300"
            >
              <div className="font-semibold break-all">{trigger.name}</div>
              <TriggerSummary trigger={trigger} />
            </div>
          ))}
        </Section>
      )}
    </>
  );
}
