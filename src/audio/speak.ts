import type { Locale } from "../domain/types";

let token = 0;

export function cancelSpeech(): void {
  token += 1;
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
}

export function unlockSpeech(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.resume();
  } catch {
    /* ignore */
  }
}

export async function speak(text: string, locale: Locale): Promise<"ended" | "canceled"> {
  if (typeof window === "undefined" || !window.speechSynthesis || !text) return "ended";
  cancelSpeech();
  const id = token;
  await waitForVoices();
  if (id !== token) return "canceled";
  await new Promise((resolve) => window.setTimeout(resolve, 40));
  if (id !== token) return "canceled";

  const lang = locale === "zh" ? "zh-CN" : "en-US";
  return new Promise((resolve) => {
    if (id !== token) {
      resolve("canceled");
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 1.05;
    const voice = pickVoice(lang);
    if (voice) utterance.voice = voice;
    const finish = (status: "ended" | "canceled") => {
      utterance.onend = null;
      utterance.onerror = null;
      resolve(id === token ? status : "canceled");
    };
    utterance.onend = () => finish("ended");
    utterance.onerror = () => finish(id === token ? "ended" : "canceled");
    try {
      window.speechSynthesis.speak(utterance);
      window.speechSynthesis.resume();
    } catch {
      finish("ended");
    }
  });
}

function pickVoice(lang: string): SpeechSynthesisVoice | undefined {
  const prefix = lang.slice(0, 2).toLowerCase();
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((voice) => voice.lang.replace("_", "-").toLowerCase().startsWith(lang.toLowerCase())) ??
    voices.find((voice) => voice.lang.replace("_", "-").toLowerCase().startsWith(prefix))
  );
}

function waitForVoices(): Promise<void> {
  if (window.speechSynthesis.getVoices().length > 0) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", done);
      window.clearTimeout(timer);
      resolve();
    };
    const timer = window.setTimeout(done, 400);
    window.speechSynthesis.addEventListener("voiceschanged", done);
  });
}
