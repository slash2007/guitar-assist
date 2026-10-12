import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { accuracyBand, track } from "../analytics";
import { cancelSpeech } from "../audio/speak";
import { armOutputUnlock, primeOutput } from "../audio/unlock";
import {
  defaultDaily,
  defaultProfile,
  ensureDaily,
  normalizeProfile,
  normalizeSession,
  normalizeSummaries,
} from "../domain/defaults";
import { evaluateGate, type GateRound } from "../domain/gate";
import { randomRng } from "../domain/rng";
import { nextStage } from "../domain/stages";
import { localDateKey, median } from "../domain/stats";
import type {
  ActiveSession,
  Attempt,
  CardId,
  CardState,
  DailyProgress,
  Profile,
  SessionSummary,
} from "../domain/types";
import { uid } from "../lib/id";
import { applyRating, emptyFsrs, isUnseen } from "../srs/fsrs";
import { buildReviewQueue, PRACTICE_MINUTES, targetQuestionCount } from "../srs/queue";
import { clipSessionToStage, markDailyIfNeeded, shouldEndSession } from "../srs/session";
import { buildExport, downloadJson, parseImport, pruneAttempts } from "../storage/backup";
import * as db from "../storage/db";

export type MainTab = "today" | "explore" | "progress";
export type Tab = MainTab | "settings";

interface StoreValue {
  ready: boolean;
  profile: Profile;
  cards: CardState[];
  attempts: Attempt[];
  daily: DailyProgress;
  session: ActiveSession | null;
  summaries: SessionSummary[];
  tab: Tab;
  error: string | null;
  advanceTo: number | null;
  setTab: (tab: Tab) => void;
  closeSettings: () => void;
  dismissAdvance: () => void;
  startPractice: () => Promise<void>;
  resumeSession: () => Promise<void>;
  commitAnswer: (input: {
    correct: boolean;
    results: Array<{
      cardId: CardId;
      correct: boolean;
      partial?: boolean;
      rating: Attempt["rating"];
      latencyMs: number;
    }>;
  }) => Promise<{ ended: boolean; summary: SessionSummary | null }>;
  exitSession: () => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
  exportProgress: () => void;
  importProgress: (raw: string) => Promise<void>;
  resetProgress: () => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [cards, setCards] = useState<CardState[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [daily, setDaily] = useState<DailyProgress>(defaultDaily);
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [summaries, setSummaries] = useState<SessionSummary[]>([]);
  const [tab, setTab] = useState<Tab>("today");
  const [settingsFrom, setSettingsFrom] = useState<MainTab>("today");
  const [error, setError] = useState<string | null>(null);
  const [advanceTo, setAdvanceTo] = useState<number | null>(null);

  useEffect(() => {
    void (async () => {
      const [rawProfile, nextCards, nextAttempts, nextDaily, rawSession, rawSummaries] = await Promise.all([
        db.loadProfile(),
        db.loadCards(),
        db.loadAttempts(),
        db.loadDaily(),
        db.loadSession(),
        db.loadSummaries(),
      ]);
      const nextProfile = normalizeProfile(rawProfile);
      const nextSession = clipSessionToStage(normalizeSession(rawSession), nextProfile.stage);
      const nextSummaries = normalizeSummaries(rawSummaries);
      setProfile(nextProfile);
      setCards(nextCards);
      setAttempts(pruneAttempts(nextAttempts));
      setDaily(ensureDaily(nextDaily));
      setSession(nextSession);
      setSummaries(nextSummaries);
      setReady(true);
      if (nextProfile.stage !== rawProfile.stage) await db.saveProfile(nextProfile);
      if (nextSession !== rawSession) await db.saveSession(nextSession);
    })();
  }, []);

  useEffect(() => {
    if (!ready || !session) return;
    const clipped = clipSessionToStage(session, profile.stage);
    if (clipped === session) return;
    setSession(clipped);
    void db.saveSession(clipped);
  }, [ready, session, profile.stage]);

  useEffect(() => {
    if (!ready) return;
    return armOutputUnlock();
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    track("tab", { name: tab === "today" ? "practice" : tab });
  }, [ready, tab]);

  const cardMap = useMemo(() => new Map(cards.map((card) => [card.id, card])), [cards]);

  const value = useMemo<StoreValue>(() => {
    return {
      ready,
      profile,
      cards,
      attempts,
      daily,
      session,
      summaries,
      tab,
      error,
      advanceTo,
      setTab(next) {
        if (next === "settings" && tab !== "settings") setSettingsFrom(tab);
        setTab(next);
      },
      closeSettings() {
        setTab(settingsFrom);
      },
      dismissAdvance() {
        setAdvanceTo(null);
      },
      async startPractice() {
        primeOutput();
        const now = new Date();
        const today = ensureDaily(daily, now);
        const built = buildReviewQueue({
          now,
          stage: profile.stage,
          cards: cardMap,
          attempts,
          targetCount: targetQuestionCount(),
          rng: randomRng,
        });
        if (built.questions.length === 0) {
          setError("session.noQueue");
          return;
        }
        const next: ActiveSession = {
          kind: "practice",
          startedAt: now.toISOString(),
          questionShownAt: now.toISOString(),
          durationMs: PRACTICE_MINUTES * 60_000,
          questions: built.questions,
          index: 0,
          answered: 0,
          correctCount: 0,
          dueCount: built.dueCount,
          newIntroduced: 0,
        };
        setError(null);
        setDaily(today);
        setSession(next);
        await Promise.all([db.saveDaily(today), db.saveSession(next)]);
      },
      async commitAnswer(input) {
        if (!session) return { ended: false, summary: null };
        const now = new Date();
        const results = input.results.length > 0 ? input.results : [];
        const updatedCards: CardState[] = [];
        const newAttempts: Attempt[] = [];
        let unseenCount = 0;
        let nextCards = cards;
        for (const result of results) {
          const existing = cardMap.get(result.cardId) ?? nextCards.find((card) => card.id === result.cardId);
          if (isUnseen(existing)) unseenCount += 1;
          const base = existing ?? { id: result.cardId, fsrs: emptyFsrs(now) };
          const updated: CardState = { id: result.cardId, fsrs: applyRating(base.fsrs, result.rating, now) };
          updatedCards.push(updated);
          nextCards = [...nextCards.filter((card) => card.id !== result.cardId), updated];
          newAttempts.push({
            id: uid(),
            cardId: result.cardId,
            at: now.toISOString(),
            correct: result.correct,
            partial: result.partial,
            latencyMs: result.latencyMs,
            rating: result.rating,
            guitarInHand: profile.guitarInHand,
          });
        }
        const nextAttempts = [...attempts, ...newAttempts];
        let nextDaily = ensureDaily(daily, now);
        if (unseenCount) nextDaily = { ...nextDaily, newIntroduced: nextDaily.newIntroduced + unseenCount };
        let nextProfile = { ...profile, lastSessionDate: localDateKey(now) };
        let nextSession: ActiveSession = {
          ...session,
          index: session.index + 1,
          answered: session.answered + 1,
          correctCount: (session.correctCount ?? 0) + (input.correct ? 1 : 0),
          questionShownAt: now.toISOString(),
          newIntroduced: session.newIntroduced + unseenCount,
        };

        setCards(nextCards);
        setAttempts(nextAttempts);
        await Promise.all([
          ...updatedCards.map((card) => db.saveCard(card)),
          ...newAttempts.map((attempt) => db.saveAttempt(attempt)),
        ]);

        if (nextSession.index >= nextSession.questions.length) {
          const more = buildReviewQueue({
            now,
            stage: nextProfile.stage,
            cards: new Map(nextCards.map((card) => [card.id, card])),
            attempts: nextAttempts,
            targetCount: targetQuestionCount(),
            rng: randomRng,
            skip: new Set([
              ...nextSession.questions.map((item) => item.cardId),
              ...nextAttempts.filter((item) => item.at >= session.startedAt).map((item) => item.cardId),
            ]),
          });
          if (more.questions.length > 0) {
            nextSession = {
              ...nextSession,
              questions: [...nextSession.questions, ...more.questions],
            };
          }
        }

        const ended = shouldEndSession(nextSession);
        if (!ended) {
          setSession(nextSession);
          setDaily(nextDaily);
          setProfile(nextProfile);
          await Promise.all([db.saveSession(nextSession), db.saveDaily(nextDaily), db.saveProfile(nextProfile)]);
          return { ended: false, summary: null };
        }

        let advancedTo: number | undefined;
        const round: GateRound = { startedAt: session.startedAt, endedAt: now.toISOString() };
        const gate = evaluateGate(nextProfile.stage, nextAttempts, nextProfile.guitarInHand, round);
        if (gate.passed && nextProfile.stage < 10) {
          advancedTo = nextStage(nextProfile.stage);
          nextProfile = { ...nextProfile, stage: advancedTo };
        }
        nextDaily = markDailyIfNeeded(nextDaily, nextSession);
        if (nextDaily.completed) nextProfile.lastCompletedDate = localDateKey(now);

        const sessionAttempts = nextAttempts.filter((item) => item.at >= session.startedAt);
        const summary: SessionSummary = {
          at: now.toISOString(),
          startedAt: session.startedAt,
          kind: session.kind,
          answered: nextSession.answered,
          correct: nextSession.correctCount ?? 0,
          medianMs: median(sessionAttempts.map((item) => item.latencyMs)),
          stage: profile.stage,
          advancedTo,
        };
        const nextSummaries = [summary, ...summaries].slice(0, 14);
        cancelSpeech();
        setSession(null);
        setDaily(nextDaily);
        setProfile(nextProfile);
        setSummaries(nextSummaries);
        if (advancedTo) setAdvanceTo(advancedTo);
        await Promise.all([
          db.saveSession(null),
          db.saveDaily(nextDaily),
          db.saveProfile(nextProfile),
          db.saveSummaries(nextSummaries),
        ]);
        track("session_complete", {
          stage: summary.stage,
          questions: summary.answered,
          accuracy: accuracyBand(summary.correct, summary.answered),
        });
        if (advancedTo) track("stage_advance", { stage: advancedTo });
        return { ended: true, summary };
      },
      async resumeSession() {
        if (!session) return;
        const clipped = clipSessionToStage(session, profile.stage);
        if (!clipped) {
          setSession(null);
          await db.saveSession(null);
          return;
        }
        primeOutput();
        const now = new Date();
        const next = { ...clipped, paused: false, questionShownAt: now.toISOString() };
        setSession(next);
        await db.saveSession(next);
      },
      async exitSession() {
        if (!session) return;
        cancelSpeech();
        const next = { ...session, paused: true };
        setSession(next);
        await db.saveSession(next);
      },
      async updateProfile(patch) {
        const next = { ...profile, ...patch };
        setProfile(next);
        await db.saveProfile(next);
      },
      exportProgress() {
        downloadJson(
          `fret-reaction-${localDateKey()}.json`,
          buildExport({ profile, cards, attempts, daily, activeSession: session }),
        );
      },
      async importProgress(raw) {
        const payload = parseImport(raw);
        const nextProfile = normalizeProfile(payload.profile);
        const nextDaily = ensureDaily(payload.daily);
        const nextSession = normalizeSession(payload.activeSession);
        const nextAttempts = pruneAttempts(payload.attempts);
        setProfile(nextProfile);
        setCards(payload.cards);
        setAttempts(nextAttempts);
        setDaily(nextDaily);
        setSession(nextSession);
        setSummaries([]);
        setAdvanceTo(null);
        await Promise.all([
          db.saveProfile(nextProfile),
          db.replaceCards(payload.cards),
          db.replaceAttempts(nextAttempts),
          db.saveDaily(nextDaily),
          db.saveSession(nextSession),
        ]);
      },
      async resetProgress() {
        const nextProfile = { ...defaultProfile(), locale: profile.locale };
        const nextDaily = defaultDaily();
        await db.clearAll();
        await Promise.all([db.saveProfile(nextProfile), db.saveDaily(nextDaily)]);
        setProfile(nextProfile);
        setCards([]);
        setAttempts([]);
        setDaily(nextDaily);
        setSession(null);
        setSummaries([]);
        setAdvanceTo(null);
        setTab("today");
      },
    };
  }, [advanceTo, attempts, cardMap, cards, daily, error, profile, ready, session, settingsFrom, summaries, tab]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore must be used within StoreProvider");
  return value;
}
