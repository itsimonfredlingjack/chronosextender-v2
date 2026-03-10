import { describe, expect, it } from "vitest";

import { buildReviewQueue, buildSessionGroups } from "../lib/grouping";
import type { ActivityEvent } from "../lib/types";

const events: ActivityEvent[] = [
  {
    id: "a",
    startedAt: "2026-03-02T09:00:00.000Z",
    endedAt: "2026-03-02T10:00:00.000Z",
    appName: "Cursor",
    windowTitle: "Implementation",
    summary: "Build API reducer",
    projectHint: "Chronos",
    signals: ["reducer", "api", "typescript"],
    source: "ai",
    confidence: 0.92,
    billable: true,
  },
  {
    id: "b",
    startedAt: "2026-03-02T10:12:00.000Z",
    endedAt: "2026-03-02T11:00:00.000Z",
    appName: "Cursor",
    windowTitle: "Implementation",
    summary: "Tighten reducer tests",
    projectHint: "Chronos",
    signals: ["reducer", "tests", "typescript"],
    source: "ai",
    confidence: 0.9,
    billable: true,
  },
  {
    id: "c",
    startedAt: "2026-03-02T14:00:00.000Z",
    endedAt: "2026-03-02T15:00:00.000Z",
    appName: "Mail",
    windowTitle: "Receipts",
    summary: "Catch up on receipts",
    projectHint: null,
    signals: ["admin", "receipts"],
    source: "ai",
    confidence: 0.41,
    billable: false,
  },
  {
    id: "d",
    startedAt: "2026-03-05T09:00:00.000Z",
    endedAt: "2026-03-05T10:30:00.000Z",
    appName: "Linear",
    windowTitle: "Client sync",
    summary: "Align backlog and handoff",
    projectHint: "Chronos",
    signals: ["client", "handoff"],
    source: "rule",
    confidence: 0.8,
    billable: true,
  },
];

describe("buildSessionGroups", () => {
  it("merges continuity events into one meaningful session", () => {
    const groups = buildSessionGroups(events, { gapMinutes: 20 });
    const chronosGroup = groups.find((group) => group.project === "Chronos");

    expect(chronosGroup).toBeDefined();
    expect(chronosGroup?.sessions[0]?.eventIds).toEqual(["a", "b"]);
  });

  it("keeps a workstream grouping model instead of day columns", () => {
    const groups = buildSessionGroups(events, { gapMinutes: 20 });

    expect(groups.some((group) => group.project === "Chronos")).toBe(true);
    expect(groups.some((group) => group.project === null)).toBe(true);

    const chronosGroup = groups.find((group) => group.project === "Chronos");
    expect(chronosGroup?.sessions).toHaveLength(2);
  });
});

describe("buildReviewQueue", () => {
  it("prioritizes missing project before low-confidence confirmations", () => {
    const groups = buildSessionGroups(events, { gapMinutes: 20 });
    const queue = buildReviewQueue(groups.flatMap((group) => group.sessions));

    expect(queue[0]?.priority).toBe("critical");
    expect(queue[0]?.reason).toBe("missing_project");
  });
});
