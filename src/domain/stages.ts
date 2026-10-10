import { cardsOnStrings } from "./cards";
import { STRING_NUMS, type CardId, type StringNum } from "./types";

export interface StageDef {
  stage: number;
  strings: StringNum[];
  intro: StringNum | null;
  mix: boolean;
  label: string;
}

export const STAGE_DEFS: StageDef[] = [
  { stage: 1, strings: [6], intro: 6, mix: false, label: "6 弦（低 E）" },
  { stage: 2, strings: [5], intro: 5, mix: false, label: "5 弦（A）" },
  { stage: 3, strings: [6, 5], intro: null, mix: true, label: "6 + 5 弦混合" },
  { stage: 4, strings: [4], intro: 4, mix: false, label: "4 弦（D）" },
  { stage: 5, strings: [6, 5, 4], intro: null, mix: true, label: "6 + 5 + 4 弦混合" },
  { stage: 6, strings: [1], intro: 1, mix: false, label: "1 弦（高 E）" },
  { stage: 7, strings: [2], intro: 2, mix: false, label: "2 弦（B）" },
  { stage: 8, strings: [3], intro: 3, mix: false, label: "3 弦（G）" },
  { stage: 9, strings: [1, 2, 3, 4, 5, 6], intro: null, mix: true, label: "全指板混合" },
  { stage: 10, strings: [1, 2, 3, 4, 5, 6], intro: null, mix: true, label: "指板已开" },
];

export function stageDef(stage: number): StageDef | null {
  return STAGE_DEFS.find((def) => def.stage === stage) ?? null;
}

export function unlockedStrings(stage: number): StringNum[] {
  if (stage <= 0) return [];
  const seen = new Set<StringNum>();
  for (const def of STAGE_DEFS) {
    if (def.stage > stage) break;
    for (const string of def.strings) seen.add(string);
  }
  return STRING_NUMS.filter((string) => seen.has(string));
}

export function cardsForStage(stage: number): CardId[] {
  const def = stageDef(stage);
  return def ? cardsOnStrings(def.strings) : [];
}

export function unlockedCards(stage: number): CardId[] {
  return cardsOnStrings(unlockedStrings(stage));
}

export function nextStage(current: number): number {
  if (current >= 10) return 10;
  return current + 1;
}

export function locateFindOne(stage: number): boolean {
  return stage > 0 && stage <= 2;
}

export function daysSince(iso: string, now = new Date()): number {
  const created = new Date(iso).getTime();
  return Math.floor((now.getTime() - created) / 86_400_000);
}

export function showStringHint(createdAt: string, now = new Date()): boolean {
  return daysSince(createdAt, now) < 2;
}
