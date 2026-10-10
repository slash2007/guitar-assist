import { useEffect, useMemo, useRef, useState } from "react";
import { playPitch, playPitches } from "../../audio/play";
import { spokenPrompt } from "../../audio/prompt";
import { cancelSpeech, speak } from "../../audio/speak";
import { huntPrompt, noteLabel, ratingLabel, stringFullLabel, stringShortLabel } from "../../domain/labels";
import { applyLocateTap, isLocateHunt, locateAllowPartial, locateCardUpdates, locateHits } from "../../domain/questions";
import { locateAverageMs, locateTimeoutMs, rateIdentify, rateLocate, timingFor } from "../../domain/rating";
import { sameSpot } from "../../domain/hunt";
import { CHROMATIC_PITCHES, type BoardSpot, type ChromaticPitch, type Fret, type StringNum } from "../../domain/types";
import { t as translate } from "../../i18n/t";
import { remainingLabel } from "../../srs/session";
import { Fretboard, type Mark } from "../fretboard/Fretboard";
import { formatMs, sleep } from "../format";
import { useStore } from "../store";
import { useMediaQuery } from "../useMediaQuery";
import { useT } from "../useT";

const PHONE_LANDSCAPE = "(orientation: landscape) and (max-height: 560px)";

interface Feedback {
  correct: boolean;
  partial?: boolean;
  marks: Mark[];
  picked?: ChromaticPitch | null;
  latencyMs: number;
  rating: 1 | 2 | 3 | 4;
}

function revealMs(correct: boolean, partial = false): number {
  if (correct) return 1600;
  if (partial) return 2200;
  return 2400;
}

const PIANO_COL: Record<ChromaticPitch, number> = {
  C: 1,
  "C#": 2,
  D: 3,
  "D#": 4,
  E: 5,
  F: 7,
  "F#": 8,
  G: 9,
  "G#": 10,
  A: 11,
  "A#": 12,
  B: 13,
};

export function SessionView() {
  const { profile, session, commitAnswer, exitSession } = useStore();
  const { t, locale } = useT();
  const [picked, setPicked] = useState<BoardSpot[]>([]);
  const [nudge, setNudge] = useState<{ spot: BoardSpot; id: number } | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const busy = useRef(false);
  const pickedRef = useRef<BoardSpot[]>([]);
  const nudgeTimer = useRef<number>(0);
  const nudgeId = useRef(0);
  const timerRef = useRef<HTMLDivElement>(null);
  const secRef = useRef<HTMLElement>(null);

  const [armedAt, setArmedAt] = useState<number | null>(null);
  const armedAtRef = useRef<number | null>(null);
  const phoneLandscape = useMediaQuery(PHONE_LANDSCAPE);
  const [immerseOverride, setImmerseOverride] = useState<boolean | null>(null);
  const wasLandscape = useRef(phoneLandscape);
  const immersive = immerseOverride ?? phoneLandscape;

  useEffect(() => {
    if (wasLandscape.current && !phoneLandscape) setImmerseOverride(null);
    wasLandscape.current = phoneLandscape;
  }, [phoneLandscape]);

  const question = session?.questions[session.index];
  const timing = timingFor(profile.guitarInHand);
  const questionTimeoutMs =
    question?.kind === "locate"
      ? locateTimeoutMs(question.need, profile.guitarInHand)
      : timing.timeoutMs;
  const drainStyle = useMemo(() => {
    if (!armedAt) return { animationName: "none" };
    const elapsed = Math.max(0, Date.now() - armedAt);
    const delay = Math.min(elapsed, questionTimeoutMs);
    return {
      animationDuration: `${questionTimeoutMs}ms`,
      animationDelay: `-${delay}ms`,
    };
  }, [armedAt, questionTimeoutMs]);

  useEffect(() => () => window.clearTimeout(nudgeTimer.current), []);

  useEffect(() => {
    setPicked([]);
    pickedRef.current = [];
    setNudge(null);
    window.clearTimeout(nudgeTimer.current);
    setFeedback(null);
    busy.current = false;
    armedAtRef.current = null;
    setArmedAt(null);
  }, [session?.index, session?.questionShownAt]);

  useEffect(() => {
    if (!session || !question || session.paused || feedback) {
      cancelSpeech();
      return;
    }
    if (!profile.speechEnabled) {
      const now = Date.now();
      armedAtRef.current = now;
      setArmedAt(now);
      return;
    }
    let alive = true;
    void speak(spokenPrompt(question, locale), locale).then((status) => {
      if (!alive || status !== "ended") return;
      const now = Date.now();
      armedAtRef.current = now;
      setArmedAt(now);
    });
    return () => {
      alive = false;
      cancelSpeech();
    };
  }, [session, question, locale, profile.speechEnabled, session?.index, session?.questionShownAt, session?.paused, feedback]);

  useEffect(() => {
    if (!session || feedback || session.paused || !armedAt) {
      timerRef.current?.classList.remove("is-hot");
      return;
    }
    const sync = () => {
      const remain = Math.max(0, questionTimeoutMs - (Date.now() - armedAt));
      timerRef.current?.classList.toggle("is-hot", remain <= 2000);
      if (secRef.current) {
        secRef.current.textContent = translate(locale, "session.timer", {
          n: Math.max(0, Math.ceil(remain / 1000)),
        });
      }
    };
    sync();
    let raf = 0;
    const loop = () => {
      sync();
      raf = window.requestAnimationFrame(loop);
    };
    raf = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(raf);
  }, [session, armedAt, session?.paused, feedback, questionTimeoutMs, locale]);

  useEffect(() => {
    if (!session || feedback || session.paused || !armedAt) return;
    const remain = questionTimeoutMs - (Date.now() - armedAt);
    const id = window.setTimeout(() => {
      if (question?.kind === "locate") void finishLocate(true);
      else void finishIdentify(null);
    }, Math.max(0, remain));
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [armedAt, session?.index, feedback, question?.kind, questionTimeoutMs]);

  if (!session) return null;
  if (!question) {
    return (
      <section className={`session${immersive ? " is-immersive" : ""}`}>
        <p className="lede">{t("session.saving")}</p>
      </section>
    );
  }

  const shownAtMs = new Date(session.questionShownAt).getTime();
  const hunt = question.kind === "locate" && isLocateHunt(question);
  const locateStrings = question.kind === "locate" ? question.strings : [question.string];
  const marks: Mark[] = feedback
    ? feedback.marks
    : question.kind === "identify"
      ? [{ string: question.string, fret: question.fret, tone: "target" }]
      : [
          ...picked.map((spot) => ({ ...spot, tone: "correct" as const })),
          ...(nudge ? [{ ...nudge.spot, tone: "wrong" as const, id: String(nudge.id) }] : []),
        ];

  function measureLatency(timedOut: boolean): number {
    if (timedOut) return questionTimeoutMs;
    const start = armedAtRef.current ?? shownAtMs;
    return Math.min(questionTimeoutMs, Math.max(0, Date.now() - start));
  }

  async function finishIdentify(choice: ChromaticPitch | null) {
    if (!session || question?.kind !== "identify" || busy.current || feedback) return;
    busy.current = true;
    cancelSpeech();
    const latencyMs = measureLatency(false);
    const correct = choice === question.answer && latencyMs < timing.timeoutMs;
    const rating = rateIdentify(correct, latencyMs, profile.guitarInHand);
    setFeedback({
      correct,
      picked: choice,
      marks: [{ string: question.string, fret: question.fret, tone: correct ? "correct" : "missed" }],
      latencyMs,
      rating,
    });
    if (profile.answerSound) void playPitch(question.string, question.fret);
    await sleep(revealMs(correct));
    await commitAnswer({
      correct,
      results: [{ cardId: question.cardId, correct, rating, latencyMs }],
    });
  }

  async function finishLocate(timedOut = false, selected = pickedRef.current) {
    if (!session || question?.kind !== "locate" || busy.current || feedback) return;
    busy.current = true;
    cancelSpeech();
    const elapsedMs = measureLatency(timedOut);
    const grade = rateLocate({
      selected,
      pool: question.pool,
      need: question.need,
      elapsedMs,
      guitarInHand: profile.guitarInHand,
      allowPartial: locateAllowPartial(question),
    });
    const latencyMs = locateAverageMs(elapsedMs, question.need);
    const selectedKeys = new Set(selected.map((spot) => `${spot.string}:${spot.fret}`));
    const marksNext: Mark[] = [
      ...question.pool.map((spot) => ({
        ...spot,
        tone: selectedKeys.has(`${spot.string}:${spot.fret}`) ? ("correct" as const) : ("missed" as const),
      })),
      ...selected
        .filter((spot) => !question.pool.some((item) => sameSpot(item, spot)))
        .map((spot) => ({ ...spot, tone: "wrong" as const })),
    ];
    setFeedback({
      correct: grade.correct,
      partial: grade.partial,
      marks: marksNext,
      latencyMs: grade.correct ? latencyMs : elapsedMs,
      rating: grade.rating,
    });
    if (profile.answerSound) {
      void playPitches(
        question.pool.map((spot) => ({ string: spot.string, fret: spot.fret })),
        1.1,
      );
    }
    await sleep(revealMs(grade.correct, grade.partial));
    await commitAnswer({
      correct: grade.correct,
      results: locateCardUpdates(question, selected, grade.correct, grade.rating, latencyMs).map((item) => ({
        ...item,
        partial: grade.partial,
      })),
    });
  }

  function flashMiss(spot: BoardSpot) {
    nudgeId.current += 1;
    const id = nudgeId.current;
    setNudge({ spot, id });
    window.clearTimeout(nudgeTimer.current);
    nudgeTimer.current = window.setTimeout(() => {
      setNudge((current) => (current?.id === id ? null : current));
    }, 1600);
  }

  function toggleSpot(string: StringNum, fret: Fret) {
    if (feedback || question?.kind !== "locate" || busy.current) return;
    const result = applyLocateTap(question, picked, { string, fret });
    if (result.ignored) {
      flashMiss({ string, fret });
      return;
    }
    setNudge(null);
    window.clearTimeout(nudgeTimer.current);
    pickedRef.current = result.selected;
    setPicked(result.selected);
    if (result.done) void finishLocate(false, result.selected);
  }

  const locateCollect = question.kind === "locate" && question.need > 1;

  return (
    <section className={`session${immersive ? " is-immersive" : ""}`}>
      <header className="session-bar">
        <div>
          <p className="eyebrow">{t("today.eyebrow")}</p>
          <p className="session-meta">
            {question.kind === "identify"
              ? t("session.goalIdentify", { string: stringShortLabel(question.string, locale) })
              : hunt
                ? huntPrompt(question.need, question.pitch, locale)
                : t("session.goalLocate", {
                    string: stringShortLabel(question.string, locale),
                    note: noteLabel(question.pitch),
                  })}
            {" · "}
            {remainingLabel(session, locale)}
          </p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="text-btn"
            onClick={() => setImmerseOverride(immersive ? false : true)}
          >
            {immersive ? t("session.immerseExit") : t("session.immerse")}
          </button>
          <button type="button" className="text-btn" onClick={() => void exitSession()}>
            {t("session.later")}
          </button>
        </div>
      </header>

      <p className="session-prompt">
        {question.kind === "identify"
          ? t("session.identifyPrompt")
          : hunt
            ? huntPrompt(question.need, question.pitch, locale)
            : t(question.need === 1 ? "session.locateOne" : "session.locateAll", {
                string: stringFullLabel(question.string, locale),
                note: noteLabel(question.pitch),
              })}
      </p>
      {profile.guitarInHand ? <p className="hint">{t("session.playFirst")}</p> : null}

      <div ref={timerRef} className={`q-timer${feedback || !armedAt ? " is-frozen" : ""}`}>
        <div className="q-timer-track">
          <span key={armedAt ?? `pending:${session.questionShownAt}`} className="q-timer-bar" style={drainStyle} />
        </div>
        <small ref={secRef}></small>
      </div>

      <div className="fretboard-slot">
        <Fretboard
          lefty={profile.lefty}
          locale={locale}
          showNames={false}
          showFretNumbers={profile.showFretNumbers}
          activeStrings={feedback ? "all" : locateStrings}
          marks={marks}
          clickable={question.kind === "locate" && !feedback ? locateStrings : false}
          cue={
            !feedback && question.kind === "locate"
              ? hunt
                ? { text: huntPrompt(question.need, question.pitch, locale) }
                : {
                    string: question.string,
                    text: t(question.need === 1 ? "cue.locateOne" : "cue.locateAll", {
                      note: noteLabel(question.pitch),
                    }),
                  }
              : null
          }
          guideKey={session.questionShownAt}
          onPress={(string, fret) => toggleSpot(string, fret)}
        />
      </div>

      {question.kind === "identify" ? (
        <div className="choices" role="group" aria-label={t("session.notesAria")}>
          {CHROMATIC_PITCHES.map((option) => {
            const sharp = option.includes("#");
            const state =
              !feedback || feedback.picked === undefined
                ? ""
                : option === question.answer
                  ? "is-correct"
                  : option === feedback.picked
                    ? "is-wrong"
                    : "";
            return (
              <button
                key={option}
                type="button"
                className={`choice ${sharp ? "is-sharp" : "is-natural"} ${state}`}
                style={{ gridColumn: `${PIANO_COL[option]} / span 2` }}
                disabled={Boolean(feedback)}
                onClick={() => void finishIdentify(option)}
              >
                <span className="choice-label">{noteLabel(option)}</span>
              </button>
            );
          })}
        </div>
      ) : locateCollect ? (
        <p className={`hint locate-hint${nudge ? " is-miss" : ""}`}>
          {t("session.locateNeed", { a: locateHits(question, picked).length, b: question.need })}
          {" · "}
          {nudge ? t("session.locateMiss") : t("session.locateHuntHint")}
        </p>
      ) : (
        <p className="hint">{t("session.locateTap")}</p>
      )}

      {feedback ? (
        <p className={`verdict ${feedback.correct ? "is-good" : feedback.partial ? "is-ok" : "is-bad"}`}>
          {feedback.correct ? t("session.verdictOk") : feedback.partial ? t("session.verdictPartial") : t("session.verdictMiss")}
          {" · "}
          {formatMs(feedback.latencyMs, locale)}
          {" · "}
          {ratingLabel(feedback.rating, locale)}
        </p>
      ) : null}
    </section>
  );
}
