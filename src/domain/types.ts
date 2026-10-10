export const PITCH_CLASSES = ["C", "D", "E", "F", "G", "A", "B"] as const;
export type PitchClass = (typeof PITCH_CLASSES)[number];

export const CHROMATIC_PITCHES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;
export type ChromaticPitch = (typeof CHROMATIC_PITCHES)[number];

export const STRING_NUMS = [1, 2, 3, 4, 5, 6] as const;
export type StringNum = (typeof STRING_NUMS)[number];

export const FRETS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
export type Fret = (typeof FRETS)[number];

export type IdentifyId = `id:${StringNum}:${Fret}`;
export type LocateId = `loc:${StringNum}:${PitchClass}`;
export type CardId = IdentifyId | LocateId;

export type Rating = 1 | 2 | 3 | 4;

export interface Attempt {
  id: string;
  cardId: CardId;
  at: string;
  correct: boolean;
  partial?: boolean;
  latencyMs: number;
  rating: Rating;
  guitarInHand: boolean;
}

export type DailyMinutes = 4 | 6 | 8 | 10;
export type Locale = "zh" | "en";

export interface Profile {
  createdAt: string;
  stage: number;
  dailyMinutes: DailyMinutes;
  guitarInHand: boolean;
  speechEnabled: boolean;
  answerSound: boolean;
  locale: Locale;
  lefty: boolean;
  showFretNumbers: boolean;
  lastSessionDate?: string;
  lastCompletedDate?: string;
}

export interface DailyProgress {
  date: string;
  newIntroduced: number;
  completed: boolean;
}

export interface FsrsFields {
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: number;
  last_review?: string;
}

export interface CardState {
  id: CardId;
  fsrs: FsrsFields;
}

export interface IdentifyQuestion {
  kind: "identify";
  cardId: IdentifyId;
  string: StringNum;
  fret: Fret;
  answer: PitchClass;
  options: ChromaticPitch[];
}

export interface LocateQuestion {
  kind: "locate";
  cardId: LocateId;
  string: StringNum;
  pitch: PitchClass;
  answers: Fret[];
  findOne: boolean;
}

export type Question = IdentifyQuestion | LocateQuestion;

export type SessionKind = "practice" | "extra";

export interface ActiveSession {
  kind: SessionKind;
  startedAt: string;
  questionShownAt: string;
  durationMs: number;
  questions: Question[];
  index: number;
  answered: number;
  dueCount: number;
  newIntroduced: number;
  paused?: boolean;
}

export interface SessionSummary {
  at: string;
  kind: SessionKind;
  answered: number;
  correct: number;
  medianMs: number | null;
  stage: number;
  advancedTo?: number;
}

export interface ExportPayload {
  version: 1;
  exportedAt: string;
  profile: Profile;
  cards: CardState[];
  attempts: Attempt[];
  daily: DailyProgress;
  activeSession: ActiveSession | null;
}
