import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import TimeReportingWorkspace from "../components/TimeReportingWorkspace";
import type { ChronosRuntimeBridge } from "../lib/runtime";
import type { ActivityEvent } from "../lib/types";
// @ts-expect-error Electron runtime module is JavaScript-only by design.
import { AssistantModeError, explainSessionWithMode } from "../../../electron/assistant-service.mjs";

const seamEvent: ActivityEvent = {
  id: "evt-a",
  startedAt: "2026-03-03T09:00:00.000Z",
  endedAt: "2026-03-03T11:00:00.000Z",
  appName: "Browser",
  windowTitle: "Exploration",
  summary: "Explore uncertain work context",
  projectHint: null,
  signals: ["research", "context"],
  source: "ai",
  confidence: 0.45,
  billable: false,
};

describe("assistant seam", () => {
  it("returns deterministic mock explanations", async () => {
    const input = {
      sessionId: "session-1",
      summary: "Investigating unresolved context",
      signals: ["research", "mail", "billing"],
    };

    const first = await explainSessionWithMode({ mode: "mock", input });
    const second = await explainSessionWithMode({ mode: "mock", input });

    expect(first).toEqual(second);
    expect(first.factors.length).toBeGreaterThan(0);
  });

  it("throws typed mode error for unsupported providers", async () => {
    await expect(
      explainSessionWithMode({
        mode: "unsupported",
        input: { sessionId: "x", summary: "summary", signals: [] },
      }),
    ).rejects.toBeInstanceOf(AssistantModeError);

    await expect(
      explainSessionWithMode({
        mode: "unsupported",
        input: { sessionId: "x", summary: "summary", signals: [] },
      }),
    ).rejects.toMatchObject({ code: "UNAVAILABLE_MODE" });
  });

  it("keeps renderer stable when AI explanation fails", async () => {
    const runtime: ChronosRuntimeBridge = {
      getRuntimeInfo: async () => ({
        platform: "darwin",
        appVersion: "0.1.0",
        aiMode: "mock",
      }),
      explainSession: async () => {
        throw new Error("network down");
      },
    };

    render(<TimeReportingWorkspace events={[seamEvent]} runtime={runtime} targetHours={2} />);

    const issueButton = screen.getByTestId("review-item-issue-session-1");
    await userEvent.click(issueButton);

    await userEvent.click(screen.getByRole("button", { name: "Explain with AI" }));

    expect(screen.getByText(/AI explanation is unavailable/i)).toBeInTheDocument();
    expect(screen.getByText("Session Matrix")).toBeInTheDocument();
  });
});
