import type { Locale } from "../domain/types";

export type { Locale };

export function detectLocale(): Locale {
  if (typeof navigator === "undefined") return "zh";
  return navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
}

export function htmlLang(locale: Locale): string {
  return locale === "en" ? "en" : "zh-CN";
}
