import { useEffect } from "react";
import { Button, RadioGroup, Radio } from "@douyinfe/semi-ui";
import { useTranslation } from "react-i18next";
import { useLayout } from "../../hooks";
import { qualifiedName } from "../../utils/schema";

export default function FocusBar({ table, count }) {
  const { layout, setLayout } = useLayout();
  const { t } = useTranslation();

  const exit = () => setLayout((prev) => ({ ...prev, focus: null }));

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") setLayout((prev) => ({ ...prev, focus: null }));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setLayout]);

  if (!table) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-40 flex justify-center">
      <div className="pointer-events-auto popover-theme flex items-center gap-3 rounded-full border border-zinc-300 px-4 py-1.5 shadow-md">
        <span className="text-sm">
          {t("focus_on")} <strong>{qualifiedName(table)}</strong> ({count})
        </span>
        <RadioGroup
          type="button"
          buttonSize="small"
          value={layout.focus.hops}
          onChange={(e) =>
            setLayout((prev) => ({
              ...prev,
              focus: { ...prev.focus, hops: e.target.value },
            }))
          }
          aria-label={t("hops")}
        >
          {[1, 2, 3].map((hops) => (
            <Radio key={hops} value={hops}>
              {t("hops", { count: hops })}
            </Radio>
          ))}
        </RadioGroup>
        <Button size="small" onClick={exit}>
          {t("exit_focus")}
        </Button>
      </div>
    </div>
  );
}
