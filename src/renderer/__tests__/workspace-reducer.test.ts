import { describe, expect, it } from "vitest";

import type { ActivityEvent } from "../lib/types";
import { applyResolution, createWorkspaceState } from "../lib/workspace";

const reducerEvents: ActivityEvent[] = [
  {
    id: "evt-1",
    startedAt: "2026-03-06T09:00:00.000Z",
    endedAt: "2026-03-06T11:00:00.000Z",
    appName: "Arc",
    windowTitle: "Research",
    summary: "Research unknown work",
    projectHint: null,
    signals: ["research", "unknown"],
    source: "ai",
    confidence: 0.4,
    billable: false,
  },
  {
    id: "evt-2",
    startedAt: "2026-03-06T11:30:00.000Z",
    endedAt: "2026-03-06T16:00:00.000Z",
    appName: "Cursor",
    windowTitle: "Build",
    summary: "Build reviewer features",
    projectHint: "Chronos",
    signals: ["build", "review"],
    source: "ai",
    confidence: 0.95,
    billable: true,
  },
];

describe("applyResolution", () => {
  it("moves sessions through pending -> edited -> resolved", () => {
    const initial = createWorkspaceState(reducerEvents, { targetHours: 5 });
    const pendingSession = initial.sessions.find((session) => session.project === null);

    expect(pendingSession?.reviewState).toBe("pending");

    const edited = applyResolution(initial, {
      type: "update_session",
      sessionId: pendingSession!.id,
      patch: {
        project: "Operations",
        summary: "Assigned ops cleanup",
      },
    });

    const editedSession = edited.sessions.find((session) => session.id === pendingSession!.id);
    expect(editedSession?.reviewState).toBe("edited");

    const resolved = applyResolution(edited, {
      type: "resolve_session",
      sessionId: pendingSession!.id,
    });

    const resolvedSession = resolved.sessions.find((session) => session.id === pendingSession!.id);
    expect(resolvedSession?.reviewState).toBe("resolved");
  });

  it("supports confidence override and submit gate readiness", () => {
    const initial = createWorkspaceState(reducerEvents, { targetHours: 5 });
    const pendingSession = initial.sessions.find((session) => session.project === null)!;

    const withOverride = applyResolution(initial, {
      type: "set_confidence",
      sessionId: pendingSession.id,
      confidence: 0.91,
    });

    const overridden = withOverride.sessions.find((session) => session.id === pendingSession.id);
    expect(overridden?.confidence).toBe(0.91);
    expect(withOverride.metrics.submitReady).toBe(false);

    const resolved = applyResolution(withOverride, {
      type: "resolve_session",
      sessionId: pendingSession.id,
    });

    expect(resolved.metrics.unresolvedCount).toBe(0);
    expect(resolved.metrics.submitReady).toBe(true);
  });
});
