import { useEffect, useMemo, useReducer, useState } from "react";

import { seedActivityEvents } from "../lib/fixtures";
import { getChronosRuntimeBridge, type ChronosRuntimeBridge } from "../lib/runtime";
import { interactiveStateClasses } from "../lib/theme-tokens";
import type { ActivityEvent, AiExplanation, ReviewIssue, WorkSession, WorkspacePage } from "../lib/types";
import { buildMatrixSlots, buildReviewSummary, paginateSessionsIntoWorkspacePages } from "../lib/workspace-view";
import { applyResolution, createWorkspaceState } from "../lib/workspace";

interface TimeReportingWorkspaceProps {
  events?: ActivityEvent[];
  runtime?: ChronosRuntimeBridge;
  targetHours?: number;
}

const detectRuntimePlatform = () => {
  if (typeof navigator === "undefined") {
    return "unknown";
  }

  const platform = navigator.platform.toLowerCase();

  if (platform.includes("mac")) {
    return "darwin";
  }

  if (platform.includes("win")) {
    return "win32";
  }

  if (platform.includes("linux")) {
    return "linux";
  }

  return "unknown";
};

const MATRIX_ROWS = 2;
const MATRIX_COLS = 3;
const MATRIX_PAGE_SIZE = MATRIX_ROWS * MATRIX_COLS;

const formatHours = (value: number) => `${value.toFixed(1)}h`;

const formatWindow = (start: string, end: string) => {
  const formatter = new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
  });

  return `${formatter.format(new Date(start))} - ${formatter.format(new Date(end))}`;
};

const reviewStateLabel: Record<WorkSession["reviewState"], string> = {
  pending: "Needs review",
  edited: "Edited",
  resolved: "Resolved",
};

const reviewMarkerClass: Record<ReviewIssue["priority"], string> = {
  critical: "bg-[#A06E63]",
  high: "bg-[var(--accent-slate-600)]",
  medium: "bg-[var(--accent-slate-500)]",
};

const cycleIssue = (issues: ReviewIssue[], currentIssueId: string | null, direction: 1 | -1) => {
  if (issues.length === 0) {
    return null;
  }

  const currentIndex = issues.findIndex((issue) => issue.id === currentIssueId);

  if (currentIndex === -1) {
    return issues[0]?.id ?? null;
  }

  const nextIndex = (currentIndex + direction + issues.length) % issues.length;
  return issues[nextIndex]?.id ?? null;
};

const isInputTarget = (eventTarget: EventTarget | null) => {
  const element = eventTarget as HTMLElement | null;

  if (!element) {
    return false;
  }

  const tagName = element.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || element.isContentEditable;
};

export default function TimeReportingWorkspace({
  events = seedActivityEvents,
  runtime,
  targetHours = 38,
}: TimeReportingWorkspaceProps) {
  const bridge = useMemo(() => runtime ?? getChronosRuntimeBridge(), [runtime]);
  const [state, dispatch] = useReducer(
    applyResolution,
    createWorkspaceState(events, { targetHours, gapMinutes: 32 }),
  );

  const [runtimeLabel, setRuntimeLabel] = useState("Loading runtime");
  const [runtimePlatform, setRuntimePlatform] = useState(detectRuntimePlatform);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [focusedSessionId, setFocusedSessionId] = useState<string | null>(null);
  const [aiLoadingSessionId, setAiLoadingSessionId] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string>("");
  const [aiBySession, setAiBySession] = useState<Record<string, AiExplanation>>({});

  const pages = useMemo(() => paginateSessionsIntoWorkspacePages(state.sessions, MATRIX_PAGE_SIZE), [state.sessions]);

  const currentPage: WorkspacePage =
    pages[Math.min(activePageIndex, pages.length - 1)] ?? {
      index: 0,
      totalPages: 1,
      sessions: [],
    };

  const reviewSummary = useMemo(() => buildReviewSummary(state.reviewQueue, 4), [state.reviewQueue]);
  const matrixSlots = useMemo(
    () => buildMatrixSlots(currentPage, MATRIX_ROWS, MATRIX_COLS, focusedSessionId),
    [currentPage, focusedSessionId],
  );

  const selectedIssue = state.reviewQueue.find((issue) => issue.id === state.selectedIssueId) ?? null;
  const focusedSession = state.sessions.find((session) => session.id === focusedSessionId) ?? null;
  const drawerSessionId = state.drawerSessionId ?? selectedIssue?.sessionId ?? focusedSessionId ?? null;
  const drawerSession = state.sessions.find((session) => session.id === drawerSessionId) ?? null;
  const drawerExplanation = drawerSession ? aiBySession[drawerSession.id] : undefined;

  const [draftProject, setDraftProject] = useState("");
  const [draftSummary, setDraftSummary] = useState("");
  const [draftConfidence, setDraftConfidence] = useState(0.5);
  const [draftBillable, setDraftBillable] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadRuntimeInfo = async () => {
      try {
        const info = await bridge.getRuntimeInfo();

        if (!mounted) {
          return;
        }

        setRuntimePlatform(info.platform);
        setRuntimeLabel(`${info.platform} · v${info.appVersion} · AI ${info.aiMode}`);
      } catch {
        if (!mounted) {
          return;
        }

        setRuntimeLabel("runtime unavailable");
      }
    };

    void loadRuntimeInfo();

    return () => {
      mounted = false;
    };
  }, [bridge]);

  useEffect(() => {
    if (activePageIndex > pages.length - 1) {
      setActivePageIndex(Math.max(0, pages.length - 1));
    }
  }, [activePageIndex, pages.length]);

  useEffect(() => {
    if (selectedIssue) {
      setFocusedSessionId(selectedIssue.sessionId);

      const pageIndex = pages.findIndex((page) =>
        page.sessions.some((session) => session.id === selectedIssue.sessionId),
      );

      if (pageIndex >= 0) {
        setActivePageIndex(pageIndex);
      }
    }
  }, [pages, selectedIssue?.id]);

  useEffect(() => {
    if (focusedSessionId && !state.sessions.some((session) => session.id === focusedSessionId)) {
      setFocusedSessionId(state.sessions[0]?.id ?? null);
      return;
    }

    if (!focusedSessionId) {
      setFocusedSessionId(state.sessions[0]?.id ?? null);
    }
  }, [focusedSessionId, state.sessions]);

  useEffect(() => {
    if (!drawerSession) {
      return;
    }

    setDraftProject(drawerSession.project ?? "");
    setDraftSummary(drawerSession.summary);
    setDraftConfidence(drawerSession.confidence);
    setDraftBillable(drawerSession.billable);
    setAiError("");
  }, [drawerSession?.id]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isInputTarget(event.target)) {
        return;
      }

      if (event.key === "ArrowDown" || event.key.toLowerCase() === "j") {
        event.preventDefault();
        const nextIssueId = cycleIssue(state.reviewQueue, state.selectedIssueId, 1);
        dispatch({ type: "select_issue", issueId: nextIssueId });
        return;
      }

      if (event.key === "ArrowUp" || event.key.toLowerCase() === "k") {
        event.preventDefault();
        const nextIssueId = cycleIssue(state.reviewQueue, state.selectedIssueId, -1);
        dispatch({ type: "select_issue", issueId: nextIssueId });
        return;
      }

      if (event.key === "Enter") {
        const targetSessionId = selectedIssue?.sessionId ?? focusedSessionId;

        if (targetSessionId) {
          event.preventDefault();
          dispatch({ type: "open_drawer", sessionId: targetSessionId });
        }

        return;
      }

      if (event.key.toLowerCase() === "r") {
        const targetSessionId = selectedIssue?.sessionId ?? focusedSessionId;

        if (targetSessionId) {
          event.preventDefault();
          dispatch({ type: "resolve_session", sessionId: targetSessionId });
        }

        return;
      }

      if (event.key === "Escape") {
        dispatch({ type: "close_drawer" });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [focusedSessionId, selectedIssue?.sessionId, state.reviewQueue, state.selectedIssueId]);

  const activateSession = (sessionId: string) => {
    setFocusedSessionId(sessionId);
    const linkedIssue = state.reviewQueue.find((issue) => issue.sessionId === sessionId);
    dispatch({ type: "select_issue", issueId: linkedIssue?.id ?? null });
  };

  const requestExplanation = async () => {
    if (!drawerSession) {
      return;
    }

    setAiError("");
    setAiLoadingSessionId(drawerSession.id);

    try {
      const explanation = await bridge.explainSession({
        sessionId: drawerSession.id,
        summary: drawerSession.summary,
        signals: drawerSession.signals,
      });

      setAiBySession((previous) => ({
        ...previous,
        [drawerSession.id]: explanation,
      }));
    } catch {
      setAiError("AI explanation is unavailable right now. You can still complete the review manually.");
    } finally {
      setAiLoadingSessionId(null);
    }
  };

  const applyDraftChanges = () => {
    if (!drawerSession) {
      return;
    }

    dispatch({
      type: "update_session",
      sessionId: drawerSession.id,
      patch: {
        project: draftProject.trim().length > 0 ? draftProject.trim() : null,
        summary: draftSummary.trim(),
        billable: draftBillable,
        confidence: draftConfidence,
      },
    });

    setFocusedSessionId(drawerSession.id);
  };

  const neutralControl = `${interactiveStateClasses.default} ${interactiveStateClasses.hover} ${interactiveStateClasses.focus}`;
  const shellPaddingClass =
    runtimePlatform === "darwin" ? "px-4 pb-4 pt-[52px]" : "p-4";

  return (
    <div className="relative h-screen overflow-hidden bg-[var(--bg-canvas)] text-[var(--text-primary)] antialiased">
      {runtimePlatform === "darwin" ? (
        <div className="titlebar-drag-region absolute inset-x-0 top-0 h-11" aria-hidden="true" />
      ) : null}
      <div className={`mx-auto flex h-full max-w-[1680px] flex-col gap-3 ${shellPaddingClass}`}>
        <header className="h-[76px] rounded-2xl border border-[var(--border-default)] bg-[var(--bg-shell)] px-4 shadow-[0_1px_2px_rgba(82,75,64,0.05)]">
          <div className="flex h-full items-center justify-between gap-4">
            <div className="min-w-0 pr-4">
              <p className="font-display text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">Chronos Review Surface</p>
              <p className="mt-1 truncate text-[13px] text-[var(--text-secondary)]">{runtimeLabel}</p>
            </div>

            <div className="grid w-[min(900px,100%)] grid-cols-4 gap-2">
              <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-raised)] px-3 py-2 text-center">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Coverage</p>
                <p className="mt-1 text-[20px] font-semibold leading-none text-[var(--text-primary)]" data-testid="status-coverage">
                  {Math.round(state.metrics.coverage * 100)}%
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-raised)] px-3 py-2 text-center">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Needs Attention</p>
                <p className="mt-1 text-[20px] font-semibold leading-none text-[var(--text-primary)]" data-testid="status-unresolved">
                  {state.metrics.unresolvedCount}
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-raised)] px-3 py-2 text-center">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Tracked</p>
                <p className="mt-1 text-[18px] font-semibold leading-none text-[var(--text-primary)]">
                  {formatHours(state.metrics.trackedHours)}
                  <span className="mx-1 text-[var(--text-muted)]">/</span>
                  {formatHours(state.metrics.targetHours)}
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-raised)] px-3 py-2 text-center">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Submission</p>
                <p
                  className={`mt-1 text-[18px] font-semibold leading-none ${state.metrics.submitReady ? "text-[var(--accent-slate-600)]" : "text-[var(--text-secondary)]"}`}
                >
                  {state.metrics.submitReady ? "Ready" : "In Review"}
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_280px] gap-3">
          <section className="min-h-0 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-panel)] p-3 shadow-[0_1px_2px_rgba(82,75,64,0.04)]">
            <div className="grid h-full grid-cols-[minmax(0,1.75fr)_300px] gap-3">
              <div className="flex min-h-0 flex-col rounded-xl border border-[var(--border-soft)] bg-[var(--bg-raised)] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h1 className="font-display text-[1.34rem] tracking-tight text-[var(--text-primary)]">Session Matrix</h1>
                    <p className="text-xs text-[var(--text-secondary)]">Captured work sessions, composed for one-glance review.</p>
                  </div>
                  <div className="flex items-center gap-2" data-testid="matrix-pagination">
                    <button
                      type="button"
                      onClick={() => setActivePageIndex((previous) => Math.max(0, previous - 1))}
                      className={`rounded-md border px-2 py-1 text-xs disabled:opacity-50 ${neutralControl}`}
                      disabled={currentPage.index <= 0}
                    >
                      Prev
                    </button>
                    <div className="flex items-center gap-1.5">
                      {pages.map((page) => (
                        <button
                          key={`page-${page.index}`}
                          type="button"
                          data-testid={`matrix-page-${page.index}`}
                          onClick={() => setActivePageIndex(page.index)}
                          className={`h-5 min-w-5 rounded-full border px-1.5 text-[11px] ${
                            page.index === currentPage.index
                              ? `${interactiveStateClasses.active} ${interactiveStateClasses.focus}`
                              : neutralControl
                          }`}
                        >
                          {page.index + 1}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setActivePageIndex((previous) => Math.min(pages.length - 1, previous + 1))}
                      className={`rounded-md border px-2 py-1 text-xs disabled:opacity-50 ${neutralControl}`}
                      disabled={currentPage.index >= pages.length - 1}
                    >
                      Next
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid min-h-0 flex-1 grid-cols-3 grid-rows-2 gap-2" data-testid="matrix-grid">
                  {matrixSlots.map((slot) => {
                    if (!slot.session) {
                      return (
                        <div
                          key={slot.id}
                          className="rounded-lg border border-dashed border-[var(--border-soft)] bg-[var(--bg-shell)]"
                          aria-hidden="true"
                        />
                      );
                    }

                    return (
                      <button
                        key={slot.id}
                        type="button"
                        data-testid={`matrix-slot-${slot.session.id}`}
                        onClick={() => activateSession(slot.session!.id)}
                        className={`flex h-full flex-col items-start justify-between rounded-lg border px-3 py-2 text-left transition ${interactiveStateClasses.focus} ${
                          slot.isFocused
                            ? interactiveStateClasses.active
                            : `${interactiveStateClasses.default} ${interactiveStateClasses.hover}`
                        }`}
                      >
                        <div>
                          <p className="text-sm font-medium leading-5 text-[var(--text-primary)]">{slot.session.summary}</p>
                          <p className="mt-1 text-xs text-[var(--text-secondary)]">{slot.session.project ?? "Unassigned"}</p>
                        </div>
                        <div className="mt-2 w-full text-xs text-[var(--text-muted)]">
                          <p>{reviewStateLabel[slot.session.reviewState]}</p>
                          <p className="mt-1">{formatWindow(slot.session.startedAt, slot.session.endedAt)}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <aside className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-raised)] p-4" data-testid="matrix-focus-panel">
                {focusedSession ? (
                  <div className="flex h-full flex-col">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]">Focused Session</p>
                    <h2 className="mt-2 font-display text-lg leading-6 text-[var(--text-primary)]">{focusedSession.summary}</h2>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">{focusedSession.project ?? "Project assignment needed"}</p>
                    <p className="mt-2 text-xs text-[var(--text-muted)]">
                      {formatWindow(focusedSession.startedAt, focusedSession.endedAt)} · {formatHours(focusedSession.durationMinutes / 60)}
                    </p>
                    <p className="mt-4 text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Signals</p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      {focusedSession.signals.slice(0, 3).join(" · ") || "No high-signal hints"}
                    </p>

                    <div className="mt-auto flex flex-wrap gap-2 pt-4">
                      <button
                        type="button"
                        onClick={() => dispatch({ type: "open_drawer", sessionId: focusedSession.id })}
                        className={`rounded-md border px-3 py-1.5 text-sm ${neutralControl}`}
                      >
                        Open details
                      </button>
                      <button
                        type="button"
                        onClick={() => dispatch({ type: "resolve_session", sessionId: focusedSession.id })}
                        className={`rounded-md border px-3 py-1.5 text-sm ${interactiveStateClasses.active} ${interactiveStateClasses.focus}`}
                      >
                        Mark resolved
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-[var(--text-muted)]">Select a session slot to inspect context.</div>
                )}
              </aside>
            </div>
          </section>

          <aside className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-panel)] p-3 shadow-[0_1px_2px_rgba(82,75,64,0.04)]">
            <div className="border-b border-[var(--border-soft)] pb-2">
              <h3 className="font-display text-lg tracking-tight text-[var(--text-primary)]">Review</h3>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">Up/Down to navigate, Enter for detail, R to resolve.</p>
            </div>

            <ul className="mt-2 space-y-2" data-testid="review-list">
              {reviewSummary.items.map((item) => {
                const isSelected = item.id === state.selectedIssueId;

                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      data-testid={`review-item-${item.id}`}
                      onClick={() => {
                        dispatch({ type: "select_issue", issueId: item.id });
                        setFocusedSessionId(item.sessionId);
                        dispatch({ type: "open_drawer", sessionId: item.sessionId });
                      }}
                      className={`w-full rounded-lg border px-2.5 py-2 text-left ${interactiveStateClasses.focus} ${
                        isSelected
                          ? interactiveStateClasses.active
                          : `${interactiveStateClasses.default} ${interactiveStateClasses.hover}`
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className={`mt-1 h-2 w-2 rounded-full ${reviewMarkerClass[item.priority]}`} aria-hidden="true" />
                        <div>
                          <p className="text-sm font-medium leading-5 text-[var(--text-primary)]">{item.title}</p>
                          <p className="mt-0.5 text-xs leading-4 text-[var(--text-secondary)]">{item.hint}</p>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>

            {reviewSummary.overflowCount > 0 ? (
              <p className="mt-3 text-xs text-[var(--text-muted)]">+{reviewSummary.overflowCount} additional review items</p>
            ) : null}

            {reviewSummary.total === 0 ? (
              <p className={`mt-3 rounded-md border px-3 py-2 text-xs ${interactiveStateClasses.info}`}>
                All sessions are now ready for submission.
              </p>
            ) : null}
          </aside>
        </div>
      </div>

      <div
        className={`fixed inset-y-0 right-0 z-20 w-[420px] border-l border-[var(--border-default)] bg-[var(--bg-raised)] p-4 shadow-[-8px_0_20px_rgba(82,75,64,0.08)] transition-transform duration-200 ease-out ${
          state.drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {drawerSession ? (
          <div className="flex h-full flex-col">
            <div className="mb-4 flex items-start justify-between border-b border-[var(--border-soft)] pb-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]">Session details</p>
                <h3 className="mt-1 font-display text-xl tracking-tight text-[var(--text-primary)]" data-testid="drawer-session-title">
                  {drawerSession.summary}
                </h3>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">{formatWindow(drawerSession.startedAt, drawerSession.endedAt)}</p>
              </div>
              <button
                type="button"
                onClick={() => dispatch({ type: "close_drawer" })}
                className={`rounded-md border px-2 py-1 text-xs ${neutralControl}`}
              >
                Esc
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto pr-1">
              <label className="block">
                <span className="mb-1 block text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Project</span>
                <input
                  value={draftProject}
                  onChange={(event) => setDraftProject(event.target.value)}
                  placeholder="Assign project"
                  className={`w-full rounded-md border px-3 py-2 text-sm ${neutralControl} ${interactiveStateClasses.focus}`}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Session summary</span>
                <textarea
                  value={draftSummary}
                  onChange={(event) => setDraftSummary(event.target.value)}
                  rows={4}
                  className={`w-full rounded-md border px-3 py-2 text-sm ${neutralControl} ${interactiveStateClasses.focus}`}
                />
              </label>

              <div>
                <label className="mb-1 block text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Confidence override</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={draftConfidence}
                  onChange={(event) => setDraftConfidence(Number(event.target.value))}
                  className="w-full accent-[var(--accent-slate-500)]"
                />
                <p className="mt-1 text-xs text-[var(--text-secondary)]">{Math.round(draftConfidence * 100)}% confidence</p>
              </div>

              <label className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={draftBillable}
                  onChange={(event) => setDraftBillable(event.target.checked)}
                  className="h-4 w-4 rounded border-[var(--border-default)] bg-[var(--bg-raised)]"
                />
                Billable work
              </label>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={applyDraftChanges}
                  className={`rounded-md border px-3 py-2 text-sm ${interactiveStateClasses.active} ${interactiveStateClasses.focus}`}
                >
                  Apply edits
                </button>
                <button
                  type="button"
                  onClick={requestExplanation}
                  className={`rounded-md border px-3 py-2 text-sm ${neutralControl}`}
                  disabled={aiLoadingSessionId === drawerSession.id}
                >
                  {aiLoadingSessionId === drawerSession.id ? "Asking AI..." : "Explain with AI"}
                </button>
                <button
                  type="button"
                  onClick={() => dispatch({ type: "resolve_session", sessionId: drawerSession.id })}
                  className={`rounded-md border px-3 py-2 text-sm ${interactiveStateClasses.active} ${interactiveStateClasses.focus}`}
                >
                  Resolve session
                </button>
              </div>

              {aiError ? (
                <p className={`rounded-md border px-3 py-2 text-xs ${interactiveStateClasses.critical}`}>{aiError}</p>
              ) : null}

              {drawerExplanation ? (
                <div className={`rounded-lg border px-3 py-3 ${interactiveStateClasses.info}`}>
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--accent-slate-700)]">AI rationale</p>
                  <p className="mt-2 text-sm text-[var(--accent-slate-700)]">{drawerExplanation.rationale}</p>
                  <p className="mt-2 text-xs text-[var(--accent-slate-700)]">
                    Confidence: {Math.round(drawerExplanation.confidence * 100)}%
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-[var(--accent-slate-700)]">
                    {drawerExplanation.factors.map((factor) => (
                      <li key={factor}>{factor}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--text-muted)]">Pick a session for detailed review.</div>
        )}
      </div>
    </div>
  );
}
