import { en, zh, type MessageKey } from "./messages";
import type { Locale } from "./locale";

export type { MessageKey };
export type Vars = Record<string, string | number>;

export function t(locale: Locale, key: MessageKey, vars?: Vars): string {
  let text = (locale === "en" ? en : zh)[key] ?? zh[key];
  if (!vars) return text;
  for (const [name, value] of Object.entries(vars)) {
    text = text.replaceAll(`{${name}}`, String(value));
  }
  return text;
}
