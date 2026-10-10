import { isIdentifyId, isLocateId, parseLocateId, positionsOf, stringOfCard } from "../domain/cards";
import { isMixStage } from "../domain/hunt";
import { questionFromCard } from "../domain/questions";
import { shuffle, type Rng } from "../domain/rng";
import { cardsForStage } from "../domain/stages";
import type { Attempt, CardId, CardState, Question, StringNum } from "../domain/types";
import { isDueCard, isUnseen } from "./fsrs";
import { weakestPitch, weakStrings } from "./weak";

export interface QueueInput {
  now: Date;
  stage: number;
  cards: Map<CardId, CardState>;
  attempts: readonly Attempt[];
  targetCount: number;
  rng: Rng;
  skip?: ReadonlySet<CardId>;
}

export interface BuiltQueue {
  questions: Question[];
  dueCount: number;
  newCount: number;
}

/** Internal sitting size. Not user-facing after suggested-length was removed. */
export const PRACTICE_MINUTES = 6;

export function targetQuestionCount(minutes: number = PRACTICE_MINUTES): number {
  return Math.min(40, Math.max(16, minutes * 4));
}

export function buildReviewQueue(input: QueueInput): BuiltQueue {
  const stageCards = cardsForStage(input.stage);
  const weak = weakStrings(input.attempts);
  const weakPitch = weakestPitch(input.attempts, stageStringsFromCards(stageCards));

  const due: CardId[] = [];
  const fresh: CardId[] = [];
  const rest: CardId[] = [];

  const skip = input.skip ?? new Set<CardId>();
  for (const id of stageCards) {
    if (skip.has(id)) continue;
    const state = input.cards.get(id);
    if (isUnseen(state)) fresh.push(id);
    else if (state && isDueCard(state, input.now)) due.push(id);
    else if (state) rest.push(id);
  }

  due.sort((a, b) => compareDue(a, b, input.cards, weak));
  const pickedNew = sortFresh(fresh, input.rng, weak, weakPitch);
  rest.sort((a, b) => compareFill(a, b, input.cards, weak));

  const ordered = assemble(due, pickedNew, rest, input.targetCount, input.rng, input.stage, stageCards);
  const dueLike = (id: CardId) => {
    const state = input.cards.get(id);
    return isUnseen(state) || Boolean(state && isDueCard(state, input.now));
  };
  return {
    questions: ordered.map((id) =>
      questionFromCard(id, input.stage, { cards: input.cards, dueLike, rng: input.rng }),
    ),
    dueCount: due.length,
    newCount: pickedNew.length,
  };
}

function stageStringsFromCards(cards: CardId[]): StringNum[] {
  return [...new Set(cards.map(stringOfCard))];
}

function compareDue(
  a: CardId,
  b: CardId,
  cards: Map<CardId, CardState>,
  weak: Set<StringNum>,
): number {
  const sa = cards.get(a)!;
  const sb = cards.get(b)!;
  const relearn = Number(sb.fsrs.state === 3) - Number(sa.fsrs.state === 3);
  if (relearn !== 0) return relearn;
  if (weak.has(stringOfCard(a)) !== weak.has(stringOfCard(b))) {
    return weak.has(stringOfCard(a)) ? -1 : 1;
  }
  return sa.fsrs.due.localeCompare(sb.fsrs.due);
}

function sortFresh(
  ids: CardId[],
  rng: Rng,
  weak: Set<StringNum>,
  weakPitch: string | null,
): CardId[] {
  const shuffled = shuffle(rng, ids);
  return shuffled.sort((a, b) => {
    const wa = Number(weak.has(stringOfCard(a)));
    const wb = Number(weak.has(stringOfCard(b)));
    if (wa !== wb) return wb - wa;
    if (weakPitch) {
      const pa = Number(a.endsWith(`:${weakPitch}`));
      const pb = Number(b.endsWith(`:${weakPitch}`));
      if (pa !== pb) return pb - pa;
    }
    return 0;
  });
}

function compareFill(
  a: CardId,
  b: CardId,
  cards: Map<CardId, CardState>,
  weak: Set<StringNum>,
): number {
  if (weak.has(stringOfCard(a)) !== weak.has(stringOfCard(b))) {
    return weak.has(stringOfCard(a)) ? -1 : 1;
  }
  return (cards.get(a)?.fsrs.stability ?? 0) - (cards.get(b)?.fsrs.stability ?? 0);
}

function assemble(
  due: CardId[],
  fresh: CardId[],
  rest: CardId[],
  target: number,
  rng: Rng,
  stage: number,
  stageCards: CardId[],
): CardId[] {
  const pools = [due, fresh, shuffle(rng, rest)];
  const result: CardId[] = [];
  const used = new Set<CardId>();

  const takeNext = (): CardId | null => {
    const preferLocate = result.filter(isIdentifyId).length > result.filter((id) => !isIdentifyId(id)).length;
    for (const pool of pools) {
      const candidates = pool.filter((id) => !used.has(id));
      const balanced = candidates.filter((id) => (preferLocate ? !isIdentifyId(id) : isIdentifyId(id)));
      const ordered = [...balanced, ...candidates];
      for (const id of ordered) {
        if (canPlace(id, result)) return id;
      }
      if (ordered[0]) return ordered[0];
    }
    return null;
  };

  const want = Math.max(target, due.length + fresh.length);
  while (result.length < want) {
    const next = takeNext();
    if (!next) break;
    used.add(next);
    result.push(next);
    if (isMixStage(stage) && isLocateId(next)) {
      const pitch = parseLocateId(next).pitch;
      for (const id of stageCards) {
        if (isLocateId(id) && parseLocateId(id).pitch === pitch) used.add(id);
      }
    }
  }
  return result;
}

export function canPlace(id: CardId, previous: readonly CardId[]): boolean {
  const lastTwo = previous.slice(-2);
  const pos = positionsOf(id);
  const blocked = lastTwo.flatMap(positionsOf);
  if (pos.some((p) => blocked.some((b) => b.string === p.string && b.fret === p.fret))) {
    return false;
  }
  const last = previous.at(-1);
  if (!last) return true;
  const lastPos = positionsOf(last);
  return !pos.some((p) =>
    lastPos.some((b) => b.string === p.string && Math.abs(b.fret - p.fret) === 1),
  );
}
