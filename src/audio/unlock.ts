import { unlockAudio } from "./play";
import { unlockSpeech } from "./speak";

export function primeOutput(): void {
  unlockSpeech();
  void unlockAudio();
}

export function armOutputUnlock(): () => void {
  if (typeof window === "undefined") return () => {};
  const onPrime = () => primeOutput();
  window.addEventListener("pointerdown", onPrime, { capture: true });
  window.addEventListener("keydown", onPrime, { capture: true });
  return () => {
    window.removeEventListener("pointerdown", onPrime, true);
    window.removeEventListener("keydown", onPrime, true);
  };
}
