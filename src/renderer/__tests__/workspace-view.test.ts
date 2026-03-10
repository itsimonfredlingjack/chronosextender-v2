import { describe, expect, it } from "vitest";

import type { ReviewIssue, WorkSession } from "../lib/types";
import { buildMatrixSlots, buildReviewSummary, paginateSessionsIntoWorkspacePages } from "../lib/workspace-view";

const createSession = (index: number): WorkSession => ({
  id: `session-${index}`,
  title: `Session ${index}`,
  summary: `Summary ${index}`,
  project: index % 2 === 0 ? "Chronos" : "Northstar",
  startedAt: `2026-03-0${Math.min(index, 9)}T09:00:00.000Z`,
  endedAt: `2026-03-0${Math.min(index, 9)}T10:00:00.000Z`,
  durationMinutes: 60,
  signals: ["signal"],
  source: "ai",
  confidence: 0.8,
  billable: true,
  reviewState: "pending",
  eventIds: [`evt-${index}`],
});

const reviewIssues: ReviewIssue[] = [
  {
    id: "a",
    sessionId: "session-1",
    title: "Issue A",
    hint: "A",
    priority: "medium",
    reason: "needs_confirmation",
    confidence: 0.6,
  },
  {
    id: "b",
    sessionId: "session-2",
    title: "Issue B",
    hint: "B",
    priority: "critical",
    reason: "missing_project",
    confidence: 0.4,
  },
  {
    id: "c",
    sessionId: "session-3",
    title: "Issue C",
    hint: "C",
    priority: "high",
    reason: "low_confidence",
    confidence: 0.45,
  },
  {
    id: "d",
    sessionId: "session-4",
    title: "Issue D",
    hint: "D",
    priority: "high",
    reason: "low_confidence",
    confidence: 0.53,
  },
  {
    id: "e",
    sessionId: "session-5",
    title: "Issue E",
    hint: "E",
    priority: "medium",
    reason: "needs_confirmation",
    confidence: 0.62,
  },
];

describe("paginateSessionsIntoWorkspacePages", () => {
  it("creates deterministic fixed-size pages", () => {
    const sessions = Array.from({ length: 7 }, (_, index) => createSession(index + 1));
    const pages = paginateSessionsIntoWorkspacePages(sessions, 6);

    expect(pages).toHaveLength(2);
    expect(pages[0]?.sessions.map((session) => session.id)).toEqual([
      "session-1",
      "session-2",
      "session-3",
      "session-4",
      "session-5",
      "session-6",
    ]);
    expect(pages[1]?.sessions.map((session) => session.id)).toEqual(["session-7"]);
    expect(pages[1]?.totalPages).toBe(2);
  });
});

describe("buildMatrixSlots", () => {
  it("maps a page to a fixed matrix with empty slot placeholders", () => {
    const sessions = Array.from({ length: 4 }, (_, index) => createSession(index + 1));
    const page = paginateSessionsIntoWorkspacePages(sessions, 6)[0]!;
    const slots = buildMatrixSlots(page, 2, 3, "session-2");

    expect(slots).toHaveLength(6);
    expect(slots.filter((slot) => slot.session !== null)).toHaveLength(4);
    expect(slots[1]?.isFocused).toBe(true);
    expect(slots[5]?.session).toBeNull();
  });
});

describe("buildReviewSummary", () => {
  it("keeps only top 4 items and reports overflow count", () => {
    const summary = buildReviewSummary(reviewIssues, 4);

    expect(summary.items).toHaveLength(4);
    expect(summary.items[0]?.id).toBe("b");
    expect(summary.overflowCount).toBe(1);
    expect(summary.total).toBe(5);
  });
});
