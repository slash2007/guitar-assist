import { useEffect } from "react";
import { htmlLang } from "../i18n/locale";
import { t, type MessageKey } from "../i18n/t";
import { AdvancePage } from "./pages/AdvancePage";
import { ExplorePage } from "./pages/ExplorePage";
import { ProgressPage } from "./pages/ProgressPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TodayPage } from "./pages/TodayPage";
import { SessionView } from "./session/SessionView";
import { useStore } from "./store";

export function AppShell() {
  const { ready, session, tab, setTab, error, profile, advanceTo } = useStore();
  const locale = profile.locale;

  useEffect(() => {
    document.documentElement.lang = htmlLang(locale);
    document.title = t(locale, "app.title");
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", t(locale, "app.description"));
  }, [locale]);

  if (!ready) {
    return (
      <main className="boot">
        <p>{t(locale, "app.boot")}</p>
      </main>
    );
  }

  const inSession = Boolean(session && !session.paused);
  const showAdvance = advanceTo !== null && !inSession;

  return (
    <div className="app">
      <main className="app-main">
        {error ? <p className="banner">{t(locale, error as MessageKey)}</p> : null}
        {inSession ? (
          <SessionView />
        ) : showAdvance ? (
          <AdvancePage />
        ) : tab === "explore" ? (
          <ExplorePage />
        ) : tab === "progress" ? (
          <ProgressPage />
        ) : tab === "settings" ? (
          <SettingsPage />
        ) : (
          <TodayPage />
        )}
      </main>
      {!inSession && !showAdvance && tab !== "settings" ? (
        <nav className="tabbar">
          <button type="button" className={tab === "today" ? "is-on" : ""} onClick={() => setTab("today")}>
            {t(locale, "tab.today")}
          </button>
          <button type="button" className={tab === "progress" ? "is-on" : ""} onClick={() => setTab("progress")}>
            {t(locale, "tab.progress")}
          </button>
          <button type="button" className={tab === "explore" ? "is-on" : ""} onClick={() => setTab("explore")}>
            {t(locale, "tab.explore")}
          </button>
        </nav>
      ) : null}
    </div>
  );
}
