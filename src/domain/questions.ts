import { identifyId, locateId, parseLocateId } from "./cards";
import {
  dueLikeLocateCount,
  huntNeed,
  huntPool,
  isMixStage,
  locateCardAt,
  pickHuntTargets,
  sameSpot,
  singleLocateNeed,
} from "./hunt";
import type { Rng } from "./rng";
import { pitchClassAt } from "./tuning";
import { stageDef } from "./stages";
import {
  CHROMATIC_PITCHES,
  type BoardSpot,
  type CardId,
  type CardState,
  type Fret,
  type IdentifyQuestion,
  type LocateId,
  type LocateQuestion,
  type PitchClass,
  type Question,
  type StringNum,
} from "./types";

export function buildIdentifyQuestion(string: StringNum, fret: Fret): IdentifyQuestion {
  const answer = pitchClassAt(string, fret);
  if (!answer) {
    throw new Error(`Cannot identify accidental at string ${string} fret ${fret}`);
  }
  return {
    kind: "identify",
    cardId: identifyId(string, fret),
    string,
    fret,
    answer,
    options: [...CHROMATIC_PITCHES],
  };
}

export function buildLocateQuestion(
  string: StringNum,
  pitch: PitchClass,
  stage: number,
): LocateQuestion {
  const pool = huntPool(pitch, [string]);
  if (pool.length === 0) {
    throw new Error(`Pitch ${pitch} does not appear on string ${string} within 12 frets`);
  }
  const need = singleLocateNeed(string, pitch, stage);
  const cardId = locateId(string, pitch);
  return {
    kind: "locate",
    cardId,
    string,
    pitch,
    need,
    pool,
    targets: [cardId],
    strings: [string],
  };
}

export function buildMixLocateQuestion(
  seed: LocateId,
  stage: number,
  cards: Map<CardId, CardState>,
  dueLike: (id: CardId) => boolean,
  rng: Rng,
): LocateQuestion {
  const parsed = parseLocateId(seed);
  const strings = stageDef(stage)?.strings ?? [parsed.string];
  const pool = huntPool(parsed.pitch, strings);
  if (pool.length === 0) return buildLocateQuestion(parsed.string, parsed.pitch, stage);
  const dueCount = dueLikeLocateCount(parsed.pitch, strings, dueLike);
  const need = huntNeed(pool.length, dueCount, rng);
  const targets = pickHuntTargets(parsed.pitch, strings, need, (id) => {
    const state = cards.get(id);
    const hot = dueLike(id) ? 0 : 1;
    return hot * 1000 + (state?.fsrs.stability ?? 0);
  });
  return {
    kind: "locate",
    cardId: seed,
    string: parsed.string,
    pitch: parsed.pitch,
    need,
    pool,
    targets: targets.length > 0 ? targets : [seed],
    strings: [...strings],
  };
}

export function questionFromCard(
  cardId: CardId,
  stage: number,
  ctx?: {
    cards: Map<CardId, CardState>;
    dueLike: (id: CardId) => boolean;
    rng: Rng;
  },
): Question {
  const [kind, stringRaw, rest] = cardId.split(":");
  const string = Number(stringRaw) as StringNum;
  if (kind === "id") {
    return buildIdentifyQuestion(string, Number(rest) as Fret);
  }
  const pitch = rest as PitchClass;
  if (isMixStage(stage) && ctx) {
    return buildMixLocateQuestion(cardId as LocateId, stage, ctx.cards, ctx.dueLike, ctx.rng);
  }
  return buildLocateQuestion(string, pitch, stage);
}

export function isLocateHunt(question: LocateQuestion): boolean {
  return question.strings.length > 1;
}

export function locateAllowPartial(question: LocateQuestion): boolean {
  return !isLocateHunt(question) && question.need > 1 && question.need === question.pool.length;
}

export function locateHits(question: LocateQuestion, selected: readonly BoardSpot[]): BoardSpot[] {
  return selected.filter((spot) => inPool(spot, question.pool));
}

export function applyLocateTap(
  question: LocateQuestion,
  selected: readonly BoardSpot[],
  tap: BoardSpot,
): { selected: BoardSpot[]; done: boolean } {
  if (question.need <= 1) {
    return { selected: [tap], done: true };
  }
  if (!inPool(tap, question.pool)) {
    return { selected: [...selected, tap], done: true };
  }
  const next = selected.some((item) => sameSpot(item, tap))
    ? selected.filter((item) => !sameSpot(item, tap))
    : [...selected, tap];
  return {
    selected: next,
    done: locateHits(question, next).length >= question.need,
  };
}

function inPool(spot: BoardSpot, pool: readonly BoardSpot[]): boolean {
  return pool.some((item) => item.string === spot.string && item.fret === spot.fret);
}

export function locateCardUpdates(
  question: LocateQuestion,
  selected: readonly BoardSpot[],
  correct: boolean,
  rating: 1 | 2 | 3 | 4,
  latencyMs: number,
): Array<{ cardId: CardId; correct: boolean; partial?: boolean; rating: 1 | 2 | 3 | 4; latencyMs: number }> {
  if (correct) {
    const ids = [...new Set(locateHits(question, selected).map((spot) => locateCardAt(spot, question.pitch)))];
    return ids.map((cardId) => ({ cardId, correct: true, rating, latencyMs }));
  }
  const ids = question.targets.length > 0 ? question.targets : [question.cardId];
  return ids.map((cardId) => ({ cardId, correct: false, rating, latencyMs }));
}
