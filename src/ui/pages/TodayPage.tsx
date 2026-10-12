import { useEffect, useState } from "react";
import { evaluateGate, latestStageRound, primaryBlocker } from "../../domain/gate";
import { stageFocus, stageLabel } from "../../domain/labels";
import { stageDef, unlockedStrings } from "../../domain/stages";
import { remainingLabel } from "../../srs/session";
import { formatPct } from "../format";
import { Fretboard } from "../fretboard/Fretboard";
import { blockerText } from "../gateCopy";
import { PageHeader } from "../PageHeader";
import { PathBar } from "../PathBar";
import { useStore } from "../store";
import { useT } from "../useT";

export function TodayPage() {
  const { profile, session, attempts, summaries, startPractice, resumeSession, updateProfile } = useStore();
  const { t, locale } = useT();
  const [hideIntro, setHideIntro] = useState(false);
  const latest = summaries[0];
  const gate = evaluateGate(profile.stage, attempts, profile.guitarInHand, latestStageRound(profile.stage, summaries));
  const blocker = primaryBlocker(profile.stage, gate);
  const paused = Boolean(session?.paused);
  const focus = stageDef(profile.stage)?.strings ?? [6];
  const unlocked = unlockedStrings(profile.stage);
  const currentName = stageLabel(profile.stage, locale);
  const showIntro = !profile.introSeen && !profile.lastSessionDate && attempts.length === 0 && !paused && !hideIntro;

  useEffect(() => {
    if (!showIntro) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") void dismissIntro();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showIntro]);

  async function dismissIntro() {
    setHideIntro(true);
    await updateProfile({ introSeen: true });
  }

  return (
    <section className="page today">
      <PageHeader eyebrow={t("today.eyebrow")} title={currentName} />
      <PathBar stage={profile.stage} />
      <p className="lede">{stageFocus(profile.stage, locale)}</p>
      <div aria-label={t("today.boardAria")}>
        <Fretboard
          lefty={profile.lefty}
          locale={locale}
          showFretNumbers={profile.showFretNumbers}
          unlockedStrings={unlocked}
          activeStrings={focus}
        />
      </div>
      <p className="blocker">{blockerText(blocker, gate, locale, currentName)}</p>
      {paused && session ? (
        <>
          <p className="hint">{t("today.pausedBody", { stage: currentName, n: session.answered })}</p>
          <button type="button" className="primary-btn" onClick={() => void resumeSession()}>
            {t("today.resume")}
          </button>
          <p className="hint">{remainingLabel(session, locale)}</p>
        </>
      ) : (
        <button type="button" className="primary-btn" onClick={() => void startPractice()}>
          {t("today.start")}
        </button>
      )}
      {latest && !paused ? (
        <p className="hint">
          {t(latest.advancedTo ? "today.lastAdvance" : "today.doneStats", {
            stage: stageLabel(
              latest.advancedTo && latest.stage === latest.advancedTo ? latest.advancedTo - 1 : latest.stage,
              locale,
            ),
            n: latest.answered,
            pct: formatPct(latest.answered ? latest.correct / latest.answered : null),
          })}
        </p>
      ) : null}

      {showIntro ? (
        <div className="reset-overlay" onClick={() => void dismissIntro()}>
          <div
            className="reset-sheet intro-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="intro-title"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="eyebrow">{t("today.eyebrow")}</p>
            <h2 id="intro-title">{t("intro.title")}</h2>
            <p className="lede">{t("intro.lede")}</p>
            <ul className="intro-points">
              <li>{t("intro.identify")}</li>
              <li>{t("intro.locate")}</li>
              <li>{t("intro.srs")}</li>
              <li>{t("intro.local")}</li>
              <li>{t("intro.guitar")}</li>
            </ul>
            <div className="btn-row">
              <button type="button" className="ghost-btn" onClick={() => void dismissIntro()}>
                {t("intro.later")}
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={() => {
                  void dismissIntro();
                  void startPractice();
                }}
              >
                {t("intro.start")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
