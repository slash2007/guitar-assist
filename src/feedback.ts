export const FEEDBACK_WHAT_MAX = 2000;
export const FEEDBACK_CONTACT_MAX = 200;

const PAGES = ["practice", "progress", "explore", "settings", "other"] as const;

export type FeedbackPage = (typeof PAGES)[number];

export interface FeedbackInput {
  what: string;
  page: FeedbackPage | "";
  contact: string;
}

export function parseFeedback(raw: unknown): FeedbackInput | null {
  if (!raw || typeof raw !== "object") return null;
  const body = raw as Record<string, unknown>;
  if (typeof body.what !== "string") return null;
  const what = body.what.trim();
  if (!what || what.length > FEEDBACK_WHAT_MAX) return null;
  const page = body.page === undefined || body.page === "" ? "" : body.page;
  if (page !== "" && (typeof page !== "string" || !PAGES.includes(page as FeedbackPage))) return null;
  const contact = typeof body.contact === "string" ? body.contact.trim() : "";
  if (contact.length > FEEDBACK_CONTACT_MAX) return null;
  return { what, page: page as FeedbackPage | "", contact };
}

const PAGE_LABEL: Record<FeedbackPage, string> = {
  practice: "Practice",
  progress: "Progress",
  explore: "Explore",
  settings: "Settings",
  other: "Other",
};

export function feedbackText(input: FeedbackInput): string {
  const lines = ["Fret Reaction feedback", "", "What happened:", input.what];
  if (input.page) lines.push("", `Page: ${PAGE_LABEL[input.page]}`);
  if (input.contact) lines.push("", `Contact: ${input.contact}`);
  return lines.join("\n");
}
