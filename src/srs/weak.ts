import { isLocateId, parseLocateId, stringOfCard } from "../domain/cards";
import { accuracy } from "../domain/stats";
import { STRING_NUMS, type Attempt, type PitchClass, type StringNum } from "../domain/types";

export function weakStrings(attempts: readonly Attempt[]): Set<StringNum> {
  const weak = new Set<StringNum>();
  for (const string of STRING_NUMS) {
    const recent = attempts.filter((item) => stringOfCard(item.cardId) === string).slice(-15);
    const acc = accuracy(recent.map((item) => item.correct));
    if (recent.length >= 8 && acc !== null && acc < 0.8) weak.add(string);
  }
  return weak;
}

export function weakestPitch(
  attempts: readonly Attempt[],
  strings: readonly StringNum[],
): PitchClass | null {
  const allowed = new Set(strings);
  const grouped = new Map<PitchClass, { n: number; wrong: number }>();
  for (const item of attempts) {
    if (!isLocateId(item.cardId)) continue;
    const parsed = parseLocateId(item.cardId);
    if (!allowed.has(parsed.string)) continue;
    const cur = grouped.get(parsed.pitch) ?? { n: 0, wrong: 0 };
    cur.n += 1;
    if (!item.correct) cur.wrong += 1;
    grouped.set(parsed.pitch, cur);
  }

  let worst: PitchClass | null = null;
  let worstRate = -1;
  for (const [pitch, stat] of grouped) {
    if (stat.n < 4) continue;
    const rate = stat.wrong / stat.n;
    if (rate > worstRate) {
      worst = pitch;
      worstRate = rate;
    }
  }
  return worstRate > 0 ? worst : null;
}
