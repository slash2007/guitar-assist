import { identifyId, isIdentifyId, parseLocateId } from "./cards";
import { speedBand } from "./rating";
import { fretsForPitch, isNatural } from "./tuning";
import { FRETS, STRING_NUMS, type Attempt, type Fret, type StringNum } from "./types";

export type Heat = "locked" | "accidental" | "empty" | "fast" | "ok" | "slow" | "fail";

export interface HeatCell {
  string: StringNum;
  fret: Fret;
  heat: Heat;
}

export function buildHeatmap(
  unlocked: readonly StringNum[],
  attempts: readonly Attempt[],
): HeatCell[] {
  const unlockedSet = new Set(unlocked);
  const cells: HeatCell[] = [];
  for (const string of STRING_NUMS) {
    for (const fret of FRETS) {
      cells.push({
        string,
        fret,
        heat: cellHeat(string, fret, unlockedSet.has(string), attempts),
      });
    }
  }
  return cells;
}

export function cellHeat(
  string: StringNum,
  fret: Fret,
  unlocked: boolean,
  attempts: readonly Attempt[],
): Heat {
  if (!unlocked) return "locked";
  if (!isNatural(string, fret)) return "accidental";

  const related = attempts.filter((item) => touchesCell(item, string, fret)).slice(-5);
  if (related.length === 0) return "empty";

  const failRate = related.filter((item) => !item.correct).length / related.length;
  if (failRate >= 0.5) return "fail";

  const bands = related
    .filter((item) => item.correct)
    .map((item) =>
      speedBand(item.latencyMs, item.guitarInHand, isIdentifyId(item.cardId) ? "identify" : "locate"),
    );
  if (bands.length === 0) return "fail";
  if (bands.filter((band) => band === "fast").length >= Math.ceil(bands.length / 2)) return "fast";
  if (bands.some((band) => band === "slow")) return "slow";
  return "ok";
}

function touchesCell(attempt: Attempt, string: StringNum, fret: Fret): boolean {
  if (isIdentifyId(attempt.cardId)) {
    return attempt.cardId === identifyId(string, fret);
  }
  const loc = parseLocateId(attempt.cardId);
  return loc.string === string && fretsForPitch(string, loc.pitch).includes(fret);
}
