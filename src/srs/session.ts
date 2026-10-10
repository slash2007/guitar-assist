import { cardsForStage } from "../domain/stages";
import type { ActiveSession, DailyProgress, Locale } from "../domain/types";
import { t } from "../i18n/t";

export function sessionElapsedMs(session: ActiveSession, now = new Date()): number {
  return Math.max(0, now.getTime() - new Date(session.startedAt).getTime());
}

export function sessionTimeUp(session: ActiveSession, now = new Date()): boolean {
  return sessionElapsedMs(session, now) >= session.durationMs;
}

export function sessionQueueDone(session: ActiveSession): boolean {
  return session.index >= session.questions.length;
}

export function shouldEndSession(session: ActiveSession): boolean {
  return sessionQueueDone(session) && session.answered > 0;
}

export function shouldCompleteDaily(session: ActiveSession): boolean {
  return session.answered > 0;
}

export function sessionProgress(session: ActiveSession, now = new Date()): number {
  if (session.durationMs === 0) return 0;
  return Math.min(1, sessionElapsedMs(session, now) / session.durationMs);
}

export function clipSessionToStage(
  session: ActiveSession | null,
  stage: number,
  now = new Date(),
): ActiveSession | null {
  if (!session) return null;
  const allowed = new Set(cardsForStage(stage));
  const head = session.questions.slice(0, session.index);
  const tail = session.questions.slice(session.index).filter((item) => allowed.has(item.cardId));
  if (tail.length === 0) return null;
  if (head.length + tail.length === session.questions.length) return session;
  const currentChanged = session.questions[session.index]?.cardId !== tail[0]?.cardId;
  return {
    ...session,
    questions: [...head, ...tail],
    questionShownAt: currentChanged ? now.toISOString() : session.questionShownAt,
  };
}

export function remainingLabel(session: ActiveSession, locale: Locale = "zh"): string {
  return t(locale, "remain.done", { n: session.answered });
}

export function markDailyIfNeeded(daily: DailyProgress, session: ActiveSession): DailyProgress {
  if (!shouldCompleteDaily(session)) return daily;
  return { ...daily, completed: true };
}
