import { useEffect, useRef, useState } from "react";
import { primeOutput } from "../../audio/unlock";
import { parseFeedback } from "../../feedback";
import { LanguageToggle } from "../LanguageToggle";
import { useStore } from "../store";
import { useT } from "../useT";

export function SettingsPage() {
  const { profile, updateProfile, exportProgress, importProgress, resetProgress, closeSettings } = useStore();
  const { t } = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [what, setWhat] = useState("");
  const [page, setPage] = useState("");
  const [contact, setContact] = useState("");
  const [sending, setSending] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  function closeFeedback() {
    setFeedbackOpen(false);
    setWhat("");
    setPage("");
    setContact("");
    setSending(false);
    setFeedbackError(null);
  }

  useEffect(() => {
    if (!confirmReset && !feedbackOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setConfirmReset(false);
      closeFeedback();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmReset, feedbackOpen]);

  return (
    <section className="page settings">
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
          onChange={(e) => {
            if (e.target.checked) primeOutput();
            void updateProfile({ speechEnabled: e.target.checked });
          }}
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
          onChange={(e) => {
            if (e.target.checked) primeOutput();
            void updateProfile({ answerSound: e.target.checked });
          }}
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
        <button type="button" className="danger-btn" onClick={() => setConfirmReset(true)}>
          {t("settings.reset")}
        </button>
        <button type="button" className="ghost-btn" onClick={() => setFeedbackOpen(true)}>
          {t("settings.feedback")}
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

      {feedbackOpen ? (
        <div className="reset-overlay" onClick={() => closeFeedback()}>
          <form
            className="reset-sheet feedback-sheet"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              const input = parseFeedback({ what, page, contact });
              if (!input || sending) return;
              setSending(true);
              setFeedbackError(null);
              void fetch("/api/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(input),
              })
                .then((response) => {
                  if (response.status === 429) {
                    setFeedbackError(t("settings.feedbackSlow"));
                    return;
                  }
                  if (!response.ok) {
                    setFeedbackError(t("settings.feedbackFail"));
                    return;
                  }
                  closeFeedback();
                  setMessage(t("settings.feedbackSent"));
                })
                .catch(() => setFeedbackError(t("settings.feedbackFail")))
                .finally(() => setSending(false));
            }}
          >
            <p className="eyebrow">{t("settings.eyebrow")}</p>
            <h2>{t("settings.feedbackTitle")}</h2>
            <p className="lede">{t("settings.feedbackNote")}</p>
            <label className="feedback-field">
              <span>{t("settings.feedbackWhat")}</span>
              <textarea required maxLength={2000} rows={4} value={what} onChange={(event) => setWhat(event.target.value)} />
            </label>
            <label className="feedback-field">
              <span>{t("settings.feedbackPage")}</span>
              <select value={page} onChange={(event) => setPage(event.target.value)}>
                <option value="">{t("settings.feedbackPageUnset")}</option>
                <option value="practice">{t("settings.feedbackPagePractice")}</option>
                <option value="progress">{t("settings.feedbackPageProgress")}</option>
                <option value="explore">{t("settings.feedbackPageExplore")}</option>
                <option value="settings">{t("settings.feedbackPageSettings")}</option>
                <option value="other">{t("settings.feedbackPageOther")}</option>
              </select>
            </label>
            <label className="feedback-field">
              <span>{t("settings.feedbackContact")}</span>
              <input maxLength={200} value={contact} onChange={(event) => setContact(event.target.value)} />
            </label>
            <div className="btn-row">
              <button type="button" className="ghost-btn" onClick={() => closeFeedback()}>
                {t("settings.feedbackCancel")}
              </button>
              <button type="submit" className="primary-btn" disabled={sending}>
                {t("settings.feedbackSend")}
              </button>
            </div>
            {feedbackError ? <p className="hint">{feedbackError}</p> : null}
          </form>
        </div>
      ) : null}

      {confirmReset ? (
        <div className="reset-overlay" onClick={() => setConfirmReset(false)}>
          <div
            className="reset-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-title"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="eyebrow">{t("settings.title")}</p>
            <h2 id="reset-title">{t("settings.resetTitle")}</h2>
            <p className="lede">{t("settings.resetConfirm")}</p>
            <div className="btn-row">
              <button type="button" className="ghost-btn" onClick={() => setConfirmReset(false)}>
                {t("settings.resetCancel")}
              </button>
              <button
                type="button"
                className="danger-btn"
                onClick={() => {
                  setConfirmReset(false);
                  void resetProgress().then(() => setMessage(t("settings.resetDone")));
                }}
              >
                {t("settings.resetAction")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
