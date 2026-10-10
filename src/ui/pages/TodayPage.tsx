import { evaluateGate, primaryBlocker } from "../../domain/gate";
import { stageFocus, stageLabel } from "../../domain/labels";
import { stageDef, unlockedStrings } from "../../domain/stages";
import { localDateKey } from "../../domain/stats";
import { remainingLabel } from "../../srs/session";
import { formatMs, formatPct } from "../format";
import { Fretboard } from "../fretboard/Fretboard";
import { blockerText } from "../gateCopy";
import { PageHeader } from "../PageHeader";
import { PathBar } from "../PathBar";
import { useStore } from "../store";
import { useT } from "../useT";

export function TodayPage() {
  const { profile, session, daily, attempts, summaries, startPractice, resumeSession } = useStore();
  const { t, locale } = useT();
  const latest = summaries[0];
  const gate = evaluateGate(profile.stage, attempts, profile.guitarInHand);
  const blocker = primaryBlocker(profile.stage, gate);
  const practicedToday = daily.completed && daily.date === localDateKey();
  const paused = Boolean(session?.paused);
  const focus = stageDef(profile.stage)?.strings ?? [6];
  const unlocked = unlockedStrings(profile.stage);
  const currentName = stageLabel(profile.stage, locale);
  const ms = (value: number | null) => formatMs(value, locale);

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
            ms: ms(latest.medianMs),
          })}
        </p>
      ) : null}
      {practicedToday && !paused ? <p className="hint">{t("today.canContinue")}</p> : null}
    </section>
  );
}
