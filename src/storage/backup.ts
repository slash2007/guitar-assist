import type { Attempt, ExportPayload } from "../domain/types";

const MAX_ATTEMPT_DAYS = 90;

export function buildExport(payload: Omit<ExportPayload, "version" | "exportedAt">): ExportPayload {
  const cutoff = Date.now() - MAX_ATTEMPT_DAYS * 86_400_000;
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    ...payload,
    attempts: payload.attempts.filter((item) => new Date(item.at).getTime() >= cutoff),
  };
}

export function parseImport(raw: string): ExportPayload {
  const data = JSON.parse(raw) as Partial<ExportPayload>;
  if (data.version !== 1 || !data.profile || !Array.isArray(data.cards) || !Array.isArray(data.attempts)) {
    throw new Error("IMPORT_BAD");
  }
  return data as ExportPayload;
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function pruneAttempts(attempts: Attempt[]): Attempt[] {
  const cutoff = Date.now() - MAX_ATTEMPT_DAYS * 86_400_000;
  return attempts.filter((item) => new Date(item.at).getTime() >= cutoff);
}
