import { createEmptyCard, fsrs, type Card, type Grade } from "ts-fsrs";
import type { CardState, FsrsFields, Rating } from "../domain/types";

const scheduler = fsrs();

export function emptyFsrs(now = new Date()): FsrsFields {
  return serializeCard(createEmptyCard(now));
}

export function applyRating(fields: FsrsFields, rating: Rating, now = new Date()): FsrsFields {
  const next = scheduler.next(deserializeCard(fields), now, rating as Grade);
  return serializeCard(next.card);
}

export function serializeCard(card: Card): FsrsFields {
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.last_review?.toISOString(),
  };
}

export function deserializeCard(fields: FsrsFields): Card {
  return {
    due: new Date(fields.due),
    stability: fields.stability,
    difficulty: fields.difficulty,
    elapsed_days: fields.elapsed_days,
    scheduled_days: fields.scheduled_days,
    learning_steps: fields.learning_steps,
    reps: fields.reps,
    lapses: fields.lapses,
    state: fields.state,
    last_review: fields.last_review ? new Date(fields.last_review) : undefined,
  };
}

export function isUnseen(state: CardState | undefined): boolean {
  return !state || state.fsrs.reps === 0;
}

export function isDueCard(state: CardState, now: Date): boolean {
  if (isUnseen(state)) return false;
  return new Date(state.fsrs.due).getTime() <= now.getTime();
}
