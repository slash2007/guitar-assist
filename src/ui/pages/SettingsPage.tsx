import { useRef, useState } from "react";
import { LanguageToggle } from "../LanguageToggle";
import { useStore } from "../store";
import { useT } from "../useT";

export function SettingsPage() {
  const { profile, updateProfile, exportProgress, importProgress, resetProgress, closeSettings } = useStore();
  const { t } = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <section className="page">
      <header className="session-bar">
        <div>
          <p className="eyebrow">{t("settings.eyebrow")}</p>
          <h1>{t("settings.title")}</h1>
        </div>
        <div className="header-actions">
          <LanguageToggle />
          <button type="button" className="text-btn" onClick={() => closeSettings()}>
            {t("nav.back")}
          </button>
        </div>
      </header>

      <label className="setting">
        <span className="setting-copy">
          <span>{t("settings.guitar")}</span>
          <span className="hint">{profile.guitarInHand ? t("settings.guitarOn") : t("settings.guitarOff")}</span>
        </span>
        <input
          type="checkbox"
          checked={profile.guitarInHand}
          onChange={(e) => void updateProfile({ guitarInHand: e.target.checked })}
        />
      </label>
      <label className="setting">
        <span className="setting-copy">
          <span>{t("settings.speech")}</span>
          <span className="hint">{profile.speechEnabled ? t("settings.speechOn") : t("settings.speechOff")}</span>
        </span>
        <input
          type="checkbox"
          checked={profile.speechEnabled}
          onChange={(e) => void updateProfile({ speechEnabled: e.target.checked })}
        />
      </label>
      <label className="setting">
        <span className="setting-copy">
          <span>{t("settings.sound")}</span>
          <span className="hint">{profile.answerSound ? t("settings.soundOn") : t("settings.soundOff")}</span>
        </span>
        <input
          type="checkbox"
          checked={profile.answerSound}
          onChange={(e) => void updateProfile({ answerSound: e.target.checked })}
        />
      </label>
      <label className="setting">
        <span className="setting-copy">
          <span>{t("settings.lefty")}</span>
          <span className="hint">{profile.lefty ? t("settings.leftyOn") : t("settings.leftyOff")}</span>
        </span>
        <input
          type="checkbox"
          checked={profile.lefty}
          onChange={(e) => void updateProfile({ lefty: e.target.checked })}
        />
      </label>
      <label className="setting">
        <span className="setting-copy">
          <span>{t("settings.fretNums")}</span>
          <span className="hint">{profile.showFretNumbers ? t("settings.fretNumsOn") : t("settings.fretNumsOff")}</span>
        </span>
        <input
          type="checkbox"
          checked={profile.showFretNumbers}
          onChange={(e) => void updateProfile({ showFretNumbers: e.target.checked })}
        />
      </label>

      <p className="lede">{t("settings.localNote")}</p>
      <div className="btn-row">
        <button type="button" className="ghost-btn" onClick={() => exportProgress()}>
          {t("settings.export")}
        </button>
        <button type="button" className="ghost-btn" onClick={() => fileRef.current?.click()}>
          {t("settings.import")}
        </button>
        <button
          type="button"
          className="danger-btn"
          onClick={() => {
            if (window.confirm(t("settings.resetConfirm"))) {
              void resetProgress().then(() => setMessage(t("settings.resetDone")));
            }
          }}
        >
          {t("settings.reset")}
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          void file.text().then(async (raw) => {
            try {
              await importProgress(raw);
              setMessage(t("settings.importOk"));
            } catch (err) {
              const code = err instanceof Error ? err.message : "";
              setMessage(code === "IMPORT_BAD" ? t("settings.importBad") : t("settings.importFail"));
            }
          });
        }}
      />
      {message ? <p className="hint">{message}</p> : null}
    </section>
  );
}
