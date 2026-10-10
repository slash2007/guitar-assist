import type { Locale } from "../i18n/locale";
import { t } from "../i18n/t";
import { nextStage, stageDef } from "./stages";
import type { ChromaticPitch, PitchClass, Rating, StringNum } from "./types";

const LETTER: Record<ChromaticPitch, string> = {
  C: "C",
  "C#": "C♯",
  D: "D",
  "D#": "D♯",
  E: "E",
  F: "F",
  "F#": "F♯",
  G: "G",
  "G#": "G♯",
  A: "A",
  "A#": "A♯",
  B: "B",
};

const OPEN_KEY = {
  1: "string.open1",
  2: "string.open2",
  3: "string.open3",
  4: "string.open4",
  5: "string.open5",
  6: "string.open6",
} as const;

const STAGE_KEY = {
  1: "stage.1",
  2: "stage.2",
  3: "stage.3",
  4: "stage.4",
  5: "stage.5",
  6: "stage.6",
  7: "stage.7",
  8: "stage.8",
  9: "stage.9",
  10: "stage.10",
} as const;

const PATH_KEY = {
  1: "path.1",
  2: "path.2",
  3: "path.3",
  4: "path.4",
  5: "path.5",
  6: "path.6",
  7: "path.7",
  8: "path.8",
  9: "path.9",
  10: "path.10",
} as const;

export function noteLabel(pitch: PitchClass | ChromaticPitch): string {
  return LETTER[pitch];
}

export function stringFullLabel(string: StringNum, locale: Locale = "zh"): string {
  return t(locale, "string.full", { n: string, open: t(locale, OPEN_KEY[string]) });
}

export function stringShortLabel(string: StringNum, locale: Locale = "zh"): string {
  return t(locale, "string.short", { n: string });
}

export function pathShort(stage: number, locale: Locale = "zh"): string {
  const key = PATH_KEY[stage as keyof typeof PATH_KEY];
  if (key) return t(locale, key);
  return String(stage);
}

export function stageLabel(stage: number, locale: Locale = "zh"): string {
  const key = STAGE_KEY[stage as keyof typeof STAGE_KEY];
  if (key) return t(locale, key);
  return t(locale, "stage.fallback", { n: stage });
}

const RATING_KEY = {
  1: "rating.1",
  2: "rating.2",
  3: "rating.3",
  4: "rating.4",
} as const;

export function ratingLabel(rating: Rating, locale: Locale = "zh"): string {
  return t(locale, RATING_KEY[rating]);
}

export function stageFocus(stage: number, locale: Locale = "zh"): string {
  const def = stageDef(stage);
  if (!def) return t(locale, "stage.focusDefault");
  if (stage >= 10) return t(locale, "stage.focusOpen");
  const next = stageLabel(nextStage(stage), locale);
  if (def.mix) return t(locale, "stage.nowMix", { next });
  if (stage > 1) {
    return t(locale, "stage.nowNext", {
      prev: stageLabel(stage - 1, locale),
      name: stageLabel(stage, locale),
      next,
    });
  }
  return t(locale, "stage.nowSingle", { name: stageLabel(stage, locale), next });
}
