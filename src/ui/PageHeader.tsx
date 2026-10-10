import { LanguageToggle } from "./LanguageToggle";
import { useStore } from "./store";
import { useT } from "./useT";

export function PageHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  const { setTab } = useStore();
  const { t } = useT();
  return (
    <header className="session-bar">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      <div className="header-actions">
        <LanguageToggle />
        <button type="button" className="text-btn" onClick={() => setTab("settings")}>
          {t("nav.settings")}
        </button>
      </div>
    </header>
  );
}
