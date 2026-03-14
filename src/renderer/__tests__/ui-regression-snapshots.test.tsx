import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import TimeReportingWorkspace from "../components/TimeReportingWorkspace";
import type { ChronosRuntimeBridge } from "../lib/runtime";
import type { ActivityEvent } from "../lib/types";

const runtime: ChronosRuntimeBridge = {
  getRuntimeInfo: async () => ({
    platform: "darwin",
    appVersion: "0.1.0",
    aiMode: "mock",
  }),
  explainSession: async () => ({
    rationale: "Signals align with implementation activity.",
    confidence: 0.85,
    factors: ["App continuity", "Summary overlap"],
  }),
};

const events: ActivityEvent[] = [
  {
    id: "evt-1",
    startedAt: "2026-03-04T09:00:00.000Z",
    endedAt: "2026-03-04T11:00:00.000Z",
    appName: "Browser",
    windowTitle: "Unknown work",
    summary: "Investigate undefined activity",
    projectHint: null,
    signals: ["research", "unknown"],
    source: "ai",
    confidence: 0.44,
    billable: false,
  },
  {
    id: "evt-2",
    startedAt: "2026-03-04T11:40:00.000Z",
    endedAt: "2026-03-04T14:30:00.000Z",
    appName: "Cursor",
    windowTitle: "Feature work",
    summary: "Build production UI",
    projectHint: "Chronos",
    signals: ["build", "feature"],
    source: "ai",
    confidence: 0.94,
    billable: true,
  },
];

describe("ui regression snapshots", () => {
  it("keeps header and timeline visual class contracts stable", async () => {
    render(<TimeReportingWorkspace events={events} runtime={runtime} targetHours={4} />);
    await screen.findByText("darwin · v0.1.0 · AI mock");

    expect(screen.getByTestId("workspace-header").getAttribute("class")).toMatchSnapshot();
    expect(screen.getByTestId("session-timeline-panel").getAttribute("class")).toMatchSnapshot();
  });

  it("keeps drawer visual class contract stable", async () => {
    render(<TimeReportingWorkspace events={events} runtime={runtime} targetHours={4} />);
    await screen.findByText("darwin · v0.1.0 · AI mock");

    await userEvent.click(screen.getByTestId("review-item-issue-session-1"));

    expect(screen.getByTestId("session-drawer").getAttribute("class")).toMatchSnapshot();
    expect(screen.getByRole("button", { name: "Apply edits" }).getAttribute("class")).toMatchSnapshot();
    expect(screen.getByRole("button", { name: "Resolve session" }).getAttribute("class")).toMatchSnapshot();
  });
});
