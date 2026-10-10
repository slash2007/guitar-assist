import { detectLocale } from "../i18n/locale";
import { localDateKey } from "./stats";
import type { ActiveSession, DailyMinutes, DailyProgress, Profile, SessionKind, SessionSummary } from "./types";

const MINUTES: DailyMinutes[] = [4, 6, 8, 10];

export function defaultProfile(now = new Date()): Profile {
  return {
    createdAt: now.toISOString(),
    stage: 1,
    dailyMinutes: 6,
    guitarInHand: true,
    speechEnabled: true,
    answerSound: true,
    locale: detectLocale(),
    lefty: false,
    showFretNumbers: true,
  };
}

export function defaultDaily(now = new Date()): DailyProgress {
  return {
    date: localDateKey(now),
    newIntroduced: 0,
    completed: false,
  };
}

export function ensureDaily(daily: DailyProgress, now = new Date()): DailyProgress {
  const today = localDateKey(now);
  if (daily.date === today) return daily;
  return { date: today, newIntroduced: 0, completed: false };
}

export function normalizeProfile(raw: Partial<Profile> | null | undefined, now = new Date()): Profile {
  const base = defaultProfile(now);
  if (!raw) return base;
  const stageRaw = Number(raw.stage);
  const minutes = Number(raw.dailyMinutes) as DailyMinutes;
  return {
    createdAt: raw.createdAt || base.createdAt,
    stage: Number.isFinite(stageRaw) ? Math.min(10, Math.max(1, Math.floor(stageRaw))) : 1,
    dailyMinutes: MINUTES.includes(minutes) ? minutes : 6,
    guitarInHand: raw.guitarInHand !== false,
    speechEnabled: raw.speechEnabled !== false,
    answerSound: raw.answerSound !== false,
    locale: raw.locale === "en" ? "en" : "zh",
    lefty: Boolean(raw.lefty),
    showFretNumbers: raw.showFretNumbers !== false,
    lastSessionDate: raw.lastSessionDate,
    lastCompletedDate: raw.lastCompletedDate,
  };
}

export function normalizeSession(raw: ActiveSession | null | undefined, now = new Date()): ActiveSession | null {
  if (!raw || !Array.isArray(raw.questions) || raw.questions.length === 0) return null;
  const kind = (raw.kind as string) === "extra" ? "extra" : (raw.kind as string) === "placement" ? null : "practice";
  if (!kind) return null;
  if (localDateKey(new Date(raw.startedAt)) !== localDateKey(now)) return null;
  if (raw.index >= raw.questions.length) return null;
  return {
    kind,
    startedAt: raw.startedAt,
    questionShownAt: raw.questionShownAt || now.toISOString(),
    durationMs: raw.durationMs || 6 * 60_000,
    questions: raw.questions,
    index: Math.max(0, raw.index),
    answered: Math.max(0, raw.answered),
    dueCount: raw.dueCount ?? 0,
    newIntroduced: raw.newIntroduced ?? 0,
    paused: raw.paused,
  };
}

export function normalizeSummaries(raw: SessionSummary[] | null | undefined): SessionSummary[] {
  if (!raw) return [];
  return raw
    .filter((item) => (item.kind as string) !== "placement")
    .map((item) => ({
      ...item,
      kind: ((item.kind as string) === "extra" ? "extra" : "practice") as SessionKind,
    }));
}
