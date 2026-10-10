import type { Locale } from "../domain/types";
import { useStore } from "./store";

export function LanguageToggle() {
  const { profile, updateProfile } = useStore();

  function setLocale(locale: Locale) {
    if (profile.locale === locale) return;
    void updateProfile({ locale });
  }

  return (
    <div className="lang-toggle" role="group" aria-label="Language">
      <button
        type="button"
        className={profile.locale === "zh" ? "is-on" : ""}
        aria-pressed={profile.locale === "zh"}
        onClick={() => setLocale("zh")}
      >
        中
      </button>
      <button
        type="button"
        className={profile.locale === "en" ? "is-on" : ""}
        aria-pressed={profile.locale === "en"}
        onClick={() => setLocale("en")}
      >
        EN
      </button>
    </div>
  );
}
