import { describe, expect, it } from "vitest";
import { feedbackText, parseFeedback } from "./feedback";

describe("parseFeedback", () => {
  it("keeps a short note and drops an unknown page", () => {
    expect(parseFeedback({ what: "  The timer froze. ", page: "practice", contact: " a@b.c " })).toEqual({
      what: "The timer froze.",
      page: "practice",
      contact: "a@b.c",
    });
    expect(parseFeedback({ what: "Hi", page: "nope" })).toBeNull();
    expect(parseFeedback({ what: "   " })).toBeNull();
  });

  it("formats the group message without empty fields", () => {
    expect(feedbackText({ what: "The timer froze.", page: "practice", contact: "" })).toBe(
      "Fret Reaction feedback\n\nWhat happened:\nThe timer froze.\n\nPage: Practice",
    );
  });
});