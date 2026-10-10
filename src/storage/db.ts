import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { defaultDaily, defaultProfile } from "../domain/defaults";
import type { ActiveSession, Attempt, CardId, CardState, DailyProgress, Profile, SessionSummary } from "../domain/types";

const DB_NAME = "guitar-assist";
const DB_VERSION = 1;

interface Schema extends DBSchema {
  kv: {
    key: string;
    value: unknown;
  };
  cards: {
    key: CardId;
    value: CardState;
  };
  attempts: {
    key: string;
    value: Attempt;
    indexes: { at: string; cardId: CardId };
  };
}

let dbPromise: Promise<IDBPDatabase<Schema>> | null = null;

function open(): Promise<IDBPDatabase<Schema>> {
  if (!dbPromise) {
    dbPromise = openDB<Schema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore("kv");
        db.createObjectStore("cards", { keyPath: "id" });
        const attempts = db.createObjectStore("attempts", { keyPath: "id" });
        attempts.createIndex("at", "at");
        attempts.createIndex("cardId", "cardId");
      },
    });
  }
  return dbPromise;
}

export async function loadProfile(): Promise<Profile> {
  const db = await open();
  return ((await db.get("kv", "profile")) as Profile | undefined) ?? defaultProfile();
}

export async function saveProfile(profile: Profile): Promise<void> {
  const db = await open();
  await db.put("kv", profile, "profile");
}

export async function loadDaily(): Promise<DailyProgress> {
  const db = await open();
  return ((await db.get("kv", "daily")) as DailyProgress | undefined) ?? defaultDaily();
}

export async function saveDaily(daily: DailyProgress): Promise<void> {
  const db = await open();
  await db.put("kv", daily, "daily");
}

export async function loadSession(): Promise<ActiveSession | null> {
  const db = await open();
  return ((await db.get("kv", "session")) as ActiveSession | undefined) ?? null;
}

export async function saveSession(session: ActiveSession | null): Promise<void> {
  const db = await open();
  if (session) await db.put("kv", session, "session");
  else await db.delete("kv", "session");
}

export async function loadSummaries(): Promise<SessionSummary[]> {
  const db = await open();
  return ((await db.get("kv", "summaries")) as SessionSummary[] | undefined) ?? [];
}

export async function saveSummaries(summaries: SessionSummary[]): Promise<void> {
  const db = await open();
  await db.put("kv", summaries.slice(0, 14), "summaries");
}

export async function loadCards(): Promise<CardState[]> {
  const db = await open();
  return db.getAll("cards");
}

export async function saveCard(card: CardState): Promise<void> {
  const db = await open();
  await db.put("cards", card);
}

export async function replaceCards(cards: CardState[]): Promise<void> {
  const db = await open();
  const tx = db.transaction("cards", "readwrite");
  await tx.store.clear();
  for (const card of cards) await tx.store.put(card);
  await tx.done;
}

export async function loadAttempts(): Promise<Attempt[]> {
  const db = await open();
  return db.getAllFromIndex("attempts", "at");
}

export async function saveAttempt(attempt: Attempt): Promise<void> {
  const db = await open();
  await db.put("attempts", attempt);
}

export async function replaceAttempts(attempts: Attempt[]): Promise<void> {
  const db = await open();
  const tx = db.transaction("attempts", "readwrite");
  await tx.store.clear();
  for (const attempt of attempts) await tx.store.put(attempt);
  await tx.done;
}

export async function clearAll(): Promise<void> {
  const db = await open();
  await Promise.all([db.clear("kv"), db.clear("cards"), db.clear("attempts")]);
}
