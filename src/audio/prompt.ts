import { noteLabel } from "../domain/labels";
import type { Fret, Locale, Question, StringNum } from "../domain/types";
import { t } from "../i18n/t";

const ZH_COUNT = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二"] as const;

export function spokenString(string: StringNum, locale: Locale): string {
  if (locale === "zh") return `${ZH_COUNT[string]}弦`;
  return `string ${string}`;
}

export function spokenFret(fret: Fret, locale: Locale): string {
  if (locale === "zh") return fret === 0 ? "空弦" : `${ZH_COUNT[fret]}品`;
  return fret === 0 ? "open" : `fret ${fret}`;
}

export function spokenPrompt(question: Question, locale: Locale): string {
  const string = spokenString(question.string, locale);
  if (question.kind === "identify") {
    return t(locale, "speech.identify", { string, fret: spokenFret(question.fret, locale) });
  }
  return t(locale, question.findOne ? "speech.locateOne" : "speech.locateAll", {
    string,
    note: noteLabel(question.pitch),
  });
}
