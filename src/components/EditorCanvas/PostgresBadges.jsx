import { useTranslation } from "react-i18next";

const RLS_ICONS = {
  forced: "fa-solid fa-shield",
  enabled: "fa-solid fa-shield-halved",
  off: "fa-solid fa-lock-open text-amber-500",
};

export default function PostgresBadges({ meta }) {
  const { t } = useTranslation();
  if (!meta) return null;

  return (
    <div className="group-hover:hidden shrink-0 pe-3 text-xs font-normal flex items-center gap-2 opacity-80">
      <span
        title={`${t(`rls_${meta.rlsState}`)} · ${t("policy_count", {
          count: meta.policies.length,
        })}`}
      >
        <i className={RLS_ICONS[meta.rlsState]} />
      </span>
      {meta.triggers.length > 0 && (
        <span
          className="flex items-center gap-1"
          title={meta.triggers
            .map(
              (trigger) =>
                `${trigger.name}: ${trigger.timing} ${trigger.events.join(" OR ")}`,
            )
            .join("\n")}
        >
          <i className="fa-solid fa-bolt" />
          {meta.triggers.length}
        </span>
      )}
    </div>
  );
}
