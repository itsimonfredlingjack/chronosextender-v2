import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import TimeReportingWorkspace from "../components/TimeReportingWorkspace";
import type { ChronosRuntimeBridge } from "../lib/runtime";
import type { ActivityEvent } from "../lib/types";

const integrationRuntime: ChronosRuntimeBridge = {
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

const integrationEvents: ActivityEvent[] = [
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

const overflowEvents: ActivityEvent[] = Array.from({ length: 7 }, (_, index) => {
  const day = String(index + 1).padStart(2, "0");
  return {
    id: `evt-over-${index + 1}`,
    startedAt: `2026-03-${day}T09:00:00.000Z`,
    endedAt: `2026-03-${day}T10:00:00.000Z`,
    appName: "Cursor",
    windowTitle: `Session ${index + 1}`,
    summary: `Session ${index + 1}`,
    projectHint: `Project-${index + 1}`,
    signals: [`sig-${index + 1}`],
    source: "ai",
    confidence: 0.85,
    billable: true,
  } satisfies ActivityEvent;
});

const syncReadyEvents: ActivityEvent[] = [
  {
    id: "evt-sync-1",
    startedAt: "2026-03-05T09:00:00.000Z",
    endedAt: "2026-03-05T11:30:00.000Z",
    appName: "Cursor",
    windowTitle: "Delivery work",
    summary: "Finalize deliverables",
    projectHint: "Chronos",
    signals: ["delivery", "planning"],
    source: "ai",
    confidence: 0.93,
    billable: true,
  },
];

describe("renderer integration", () => {
  it("exposes accessible labels for search and drawer close controls", async () => {
    render(<TimeReportingWorkspace events={integrationEvents} runtime={integrationRuntime} targetHours={4} />);

    expect(screen.getByRole("textbox", { name: /ask chronos/i })).toBeInTheDocument();

    await userEvent.click(screen.getByTestId("review-item-issue-session-1"));

    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("opens matching session context from review selection", async () => {
    render(<TimeReportingWorkspace events={integrationEvents} runtime={integrationRuntime} targetHours={4} />);

    await userEvent.click(screen.getByTestId("review-item-issue-session-1"));

    expect(screen.getByTestId("drawer-session-title")).toHaveTextContent("Investigate undefined activity");
  });

  it("updates matrix slot state and status strip after edit + resolve", async () => {
    render(<TimeReportingWorkspace events={integrationEvents} runtime={integrationRuntime} targetHours={4} />);

    await userEvent.click(screen.getByTestId("review-item-issue-session-1"));

    const projectInput = screen.getByPlaceholderText("Assign project");
    const summaryInput = screen.getByDisplayValue("Investigate undefined activity");

    await userEvent.clear(projectInput);
    await userEvent.type(projectInput, "Chronos");

    await userEvent.clear(summaryInput);
    await userEvent.type(summaryInput, "Classify and align investigation with release prep");

    await userEvent.click(screen.getByRole("button", { name: "Apply edits" }));

    expect(screen.getByTestId("matrix-slot-session-1")).toHaveTextContent("Edited");
    expect(screen.getByTestId("status-unresolved")).toHaveTextContent("1");

    await userEvent.click(screen.getByRole("button", { name: "Resolve session" }));

    expect(screen.getByTestId("matrix-slot-session-1")).toHaveTextContent("Resolved");
    expect(screen.getByTestId("status-unresolved")).toHaveTextContent("0");
  });

  it("navigates overflow through explicit matrix pagination", async () => {
    render(<TimeReportingWorkspace events={overflowEvents} runtime={integrationRuntime} targetHours={3} />);

    expect(screen.queryByTestId("matrix-slot-session-7")).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId("matrix-page-1"));

    expect(screen.getByTestId("matrix-slot-session-7")).toBeInTheDocument();
  });

  it("shows injected session confidence as a percentage from the 0..1 model", async () => {
    render(<TimeReportingWorkspace events={integrationEvents} runtime={integrationRuntime} targetHours={4} />);

    await userEvent.click(screen.getByTestId("matrix-slot-session-2"));
    await userEvent.click(screen.getByRole("button", { name: "Open details" }));

    expect(screen.getAllByText("45% confidence").length).toBeGreaterThan(0);
  });

  it("uses copy-to-clipboard wording in the daily sync modal", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(<TimeReportingWorkspace events={syncReadyEvents} runtime={integrationRuntime} targetHours={1} />);

    await userEvent.click(screen.getByRole("button", { name: "Sync Ready" }));

    const copyButton = screen.getByRole("button", { name: /copy to clipboard/i });
    expect(copyButton).toBeInTheDocument();

    await userEvent.click(copyButton);
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /copied!/i })).toBeInTheDocument();
  });
});
