import { useEffect, useMemo, useRef, useState } from "react";
import { playPitch, playPitches } from "../../audio/play";
import { spokenPrompt } from "../../audio/prompt";
import { cancelSpeech, speak } from "../../audio/speak";
import { noteLabel, ratingLabel, stringFullLabel, stringShortLabel } from "../../domain/labels";
import { rateIdentify, rateLocate, timingFor } from "../../domain/rating";
import { CHROMATIC_PITCHES, type ChromaticPitch, type Fret } from "../../domain/types";
import { t as translate } from "../../i18n/t";
import { remainingLabel } from "../../srs/session";
import { Fretboard, type Mark } from "../fretboard/Fretboard";
import { formatMs, sleep } from "../format";
import { useStore } from "../store";
import { useT } from "../useT";

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
  const [pickedFrets, setPickedFrets] = useState<Fret[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const busy = useRef(false);
  const timerRef = useRef<HTMLDivElement>(null);
  const secRef = useRef<HTMLElement>(null);

  const [armedAt, setArmedAt] = useState<number | null>(null);
  const armedAtRef = useRef<number | null>(null);

  const question = session?.questions[session.index];
  const timing = timingFor(profile.guitarInHand);
  const drainStyle = useMemo(() => {
    if (!armedAt) return { animationName: "none" };
    const elapsed = Math.max(0, Date.now() - armedAt);
    const delay = Math.min(elapsed, timing.timeoutMs);
    return {
      animationDuration: `${timing.timeoutMs}ms`,
      animationDelay: `-${delay}ms`,
    };
  }, [armedAt, timing.timeoutMs]);

  useEffect(() => {
    setPickedFrets([]);
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
      const remain = Math.max(0, timing.timeoutMs - (Date.now() - armedAt));
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
  }, [session, armedAt, session?.paused, feedback, timing.timeoutMs, locale]);

  useEffect(() => {
    if (!session || feedback || session.paused || !armedAt) return;
    const remain = timing.timeoutMs - (Date.now() - armedAt);
    const id = window.setTimeout(() => {
      if (question?.kind === "locate") void finishLocate(true);
      else void finishIdentify(null);
    }, Math.max(0, remain));
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [armedAt, session?.index, feedback, question?.kind, timing.timeoutMs]);

  if (!session) return null;
  if (!question) {
    return (
      <section className="session">
        <p className="lede">{t("session.saving")}</p>
      </section>
    );
  }

  const shownAtMs = new Date(session.questionShownAt).getTime();
  const marks: Mark[] = feedback
    ? feedback.marks
    : question.kind === "identify"
      ? [{ string: question.string, fret: question.fret, tone: "target" }]
      : pickedFrets.map((fret) => ({ string: question.string, fret, tone: "selected" }));

  function measureLatency(timedOut: boolean): number {
    if (timedOut) return timing.timeoutMs;
    const start = armedAtRef.current ?? shownAtMs;
    return Math.min(timing.timeoutMs, Math.max(0, Date.now() - start));
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
    await commitAnswer({ cardId: question.cardId, correct, rating, latencyMs });
  }

  async function finishLocate(timedOut = false, selectedFrets = pickedFrets) {
    if (!session || question?.kind !== "locate" || busy.current || feedback) return;
    busy.current = true;
    cancelSpeech();
    const latencyMs = measureLatency(timedOut);
    const grade = rateLocate({
      selected: selectedFrets,
      answers: question.answers,
      findOne: question.findOne,
      latencyMs,
      guitarInHand: profile.guitarInHand,
    });
    const selected = new Set(selectedFrets);
    const marksNext: Mark[] = [
      ...question.answers.map((fret) => ({
        string: question.string,
        fret,
        tone: selected.has(fret) ? ("correct" as const) : ("missed" as const),
      })),
      ...selectedFrets
        .filter((fret) => !question.answers.includes(fret))
        .map((fret) => ({ string: question.string, fret, tone: "wrong" as const })),
    ];
    setFeedback({
      correct: grade.correct,
      partial: grade.partial,
      marks: marksNext,
      latencyMs,
      rating: grade.rating,
    });
    if (profile.answerSound) {
      void playPitches(
        question.answers.map((fret) => ({ string: question.string, fret })),
        1.1,
      );
    }
    await sleep(revealMs(grade.correct, grade.partial));
    await commitAnswer({
      cardId: question.cardId,
      correct: grade.correct,
      partial: grade.partial,
      rating: grade.rating,
      latencyMs,
    });
  }

  function toggleFret(fret: Fret) {
    if (feedback || question?.kind !== "locate" || busy.current) return;
    const instant = question.findOne || question.answers.length === 1;
    if (instant) {
      setPickedFrets([fret]);
      void finishLocate(false, [fret]);
      return;
    }
    const next = pickedFrets.includes(fret)
      ? pickedFrets.filter((item) => item !== fret)
      : [...pickedFrets, fret];
    setPickedFrets(next);
    if (next.length >= question.answers.length) void finishLocate(false, next);
  }

  const locateNeedAll = question.kind === "locate" && !question.findOne && question.answers.length > 1;

  return (
    <section className="session">
      <header className="session-bar">
        <div>
          <p className="eyebrow">{t("today.eyebrow")}</p>
          <p className="session-meta">
            {question.kind === "identify"
              ? t("session.goalIdentify", { string: stringShortLabel(question.string, locale) })
              : t("session.goalLocate", {
                  string: stringShortLabel(question.string, locale),
                  note: noteLabel(question.pitch),
                })}
            {" · "}
            {remainingLabel(session, locale)}
          </p>
        </div>
        <button type="button" className="text-btn" onClick={() => void exitSession()}>
          {t("session.later")}
        </button>
      </header>

      <p className="session-prompt">
        {question.kind === "identify"
          ? t("session.identifyPrompt")
          : t(question.findOne ? "session.locateOne" : "session.locateAll", {
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

      <Fretboard
        lefty={profile.lefty}
        locale={locale}
        showNames={false}
        showFretNumbers={profile.showFretNumbers}
        activeStrings={feedback ? "all" : [question.string]}
        marks={marks}
        clickable={question.kind === "locate" && !feedback ? [question.string] : false}
        cue={
          !feedback && question.kind === "locate"
            ? {
                string: question.string,
                text: t(question.findOne ? "cue.locateOne" : "cue.locateAll", {
                  note: noteLabel(question.pitch),
                }),
              }
            : null
        }
        guideKey={session.questionShownAt}
        onPress={(_string, fret) => toggleFret(fret)}
      />

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
      ) : locateNeedAll ? (
        <p className="hint locate-hint">
          {t("session.locateNeed", { a: pickedFrets.length, b: question.answers.length })}
          {pickedFrets.length > 0 && !feedback ? (
            <button type="button" className="text-btn" onClick={() => void finishLocate(false, pickedFrets)}>
              {t("session.locateSubmit")}
            </button>
          ) : null}
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
