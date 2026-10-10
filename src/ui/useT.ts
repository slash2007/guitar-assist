import { t, type MessageKey, type Vars } from "../i18n/t";
import { useStore } from "./store";

export function useT() {
  const locale = useStore().profile.locale;
  return {
    locale,
    t: (key: MessageKey, vars?: Vars) => t(locale, key, vars),
  };
}
