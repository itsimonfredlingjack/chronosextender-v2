import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { seedActivityEvents } from "../lib/fixtures";
import { getChronosRuntimeBridge, type ChronosRuntimeBridge } from "../lib/runtime";
import { interactiveStateClasses } from "../lib/theme-tokens";
import type { ActivityEvent, AiExplanation, ReviewIssue, WorkSession, WorkspacePage } from "../lib/types";
import { buildMatrixSlots, buildReviewSummary, paginateSessionsIntoWorkspacePages } from "../lib/workspace-view";
import { applyResolution, createWorkspaceState } from "../lib/workspace";
import { PulseOrb, type AiState } from "./ai-pulse";
import { ConfidenceTimeline } from "./confidence-timeline";
import { AskChronosBar } from "./ask-chronos-bar";
import { DailySyncModal } from "./daily-sync-modal";
import { Typewriter } from "./typewriter";
import { AiNudgeToast } from "./ai-nudge-toast";
import { getProjectColor } from "../lib/project-colors";

function injectMockConfidence(sessions: WorkSession[]): WorkSession[] {
  return sessions.map((s, i) => {
    if (i === 1) return { ...s, confidence: 0.45, alternativeProjects: ["Figma Redesign", "Slack Comm", "Internal Meeting"] };
    if (i === 3) return { ...s, confidence: 0.72, alternativeProjects: ["Client Call", "Review PRs"] };
    return s;
  });
}

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
  critical: "bg-[var(--category-pink-red)]",
  high: "bg-[var(--category-orange)]",
  medium: "bg-[var(--category-cyan)]",
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
  const [baseState, dispatch] = useReducer(
    applyResolution,
    createWorkspaceState(events, { targetHours, gapMinutes: 32 }),
  );

  const [nlQuery, setNlQuery] = useState("");
  const [nlSummary, setNlSummary] = useState<string | null>(null);
  const [isAiFiltering, setIsAiFiltering] = useState(false);
  const [isDailySyncOpen, setIsDailySyncOpen] = useState(false);

  const state = useMemo(() => {
    // 1. Mock confidence injection
    const sessionsWithConfidence = injectMockConfidence(baseState.sessions);
    
    // 2. Natural Language Filtering (Mock Logic)
    let filteredSessions = sessionsWithConfidence;
    if (nlQuery.trim().length > 0) {
      const q = nlQuery.toLowerCase();
      filteredSessions = sessionsWithConfidence.filter(s => {
        // A simple text match against project or summary to simulate AI understanding
        return (s.project?.toLowerCase().includes(q)) || (s.summary.toLowerCase().includes(q));
      });
    }

    // Rebuild a new pseudo-state based on the filtered sessions
    const pseudoState = createWorkspaceState(events, { targetHours, gapMinutes: 32 });
    
    // We overwrite the sessions and recompute metrics so the header stats reflect the slice
    const trackedStats = filteredSessions.reduce((acc, s) => {
      acc.tracked += s.durationMinutes / 60;
      if (s.reviewState === "resolved") acc.resolved++;
      else acc.unresolved++;
      return acc;
    }, { tracked: 0, resolved: 0, unresolved: 0 });

    const updatedMetrics = {
      ...pseudoState.metrics,
      trackedHours: trackedStats.tracked,
      unresolvedCount: trackedStats.unresolved,
      submitReady: trackedStats.unresolved === 0 && filteredSessions.length > 0,
      coverage: trackedStats.tracked / targetHours, // simplified coverage
    };

    return {
      ...baseState,
      sessions: filteredSessions,
      metrics: nlQuery ? updatedMetrics : baseState.metrics,
      // We also need to re-derive the review queue for only these sessions
      reviewQueue: baseState.reviewQueue.filter(issue => filteredSessions.some(s => s.id === issue.sessionId))
    };
  }, [baseState, events, targetHours, nlQuery]);

  // Simulate LLM delay for summary generation
  useEffect(() => {
    if (!nlQuery.trim()) {
      setNlSummary(null);
      setIsAiFiltering(false);
      return;
    }

    setIsAiFiltering(true);
    setNlSummary(null);
    
    const delay = setTimeout(() => {
      const h = state.metrics.trackedHours.toFixed(1);
      const proj = state.sessions[0]?.project ?? "the selected project";
      setNlSummary(`You logged ${h} hours for this context. I have filtered your timeline and review queue to show only relevant sessions.`);
      setIsAiFiltering(false);
    }, 800);

    return () => clearTimeout(delay);
  }, [nlQuery, state.metrics.trackedHours, state.sessions]);

  // Simulation: Proactive Friction Nudge
  const [showAiNudge, setShowAiNudge] = useState(false);
  useEffect(() => {
    // Show the nudge 5 seconds after the component mounts to simulate anomaly detection
    const timer = setTimeout(() => setShowAiNudge(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleNudgeAction = (action: "split" | "pause") => {
    console.log("Nudge action taken:", action);
    setShowAiNudge(false);
  };

  const [runtimeLabel, setRuntimeLabel] = useState("Loading runtime");
  const [runtimePlatform, setRuntimePlatform] = useState(detectRuntimePlatform);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [focusedSessionId, setFocusedSessionId] = useState<string | null>(null);
  const [aiLoadingSessionId, setAiLoadingSessionId] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string>("");
  const [aiBySession, setAiBySession] = useState<Record<string, AiExplanation>>({});
  const [aiSuccessFlash, setAiSuccessFlash] = useState(false);

  // Derive orb state from active actions
  let orbState: AiState = "idle";
  if (aiLoadingSessionId) {
    orbState = "processing";
  } else if (aiError) {
    orbState = "error";
  } else if (aiSuccessFlash) {
    orbState = "success";
  }

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

  const handleAssignProject = (sessionId: string, project: string) => {
    dispatch({
      type: "update_session",
      sessionId,
      patch: { project, confidence: 1 },
    });
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
      
      setAiSuccessFlash(true);
      setTimeout(() => setAiSuccessFlash(false), 2000);
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
    <div className="relative h-screen overflow-hidden bg-[var(--bg-app)] text-[var(--text-primary)] antialiased transition-colors duration-500">
      
      {/* Ask Chronos Bar - Floating Layer */}
      <div className="absolute inset-x-0 top-8 z-50 px-12 pointer-events-none">
        <div className="pointer-events-auto">
          <AskChronosBar 
            onQueryChange={setNlQuery} 
            isProcessing={isAiFiltering} 
            nlSummary={nlSummary} 
          />
        </div>
      </div>

      {runtimePlatform === "darwin" ? (
        <div className="titlebar-drag-region absolute inset-x-0 top-0 h-11 z-[60]" aria-hidden="true" />
      ) : null}
      
      {/* Main app content with dimming when a query is active */}
      <div className={`mx-auto flex h-full max-w-[1680px] flex-col gap-4 transition-all duration-500 ${shellPaddingClass} ${nlQuery ? "opacity-95 contrast-125 saturate-50" : ""}`}>
        <header className="glass-panel-strong relative mt-20 h-[88px] overflow-hidden rounded-3xl px-6">
          <div className="flex h-full items-center justify-between gap-4">
            <div className="min-w-0 pr-4 flex items-center gap-4">
              <PulseOrb state={orbState} />
              <div>
                <p className="font-display text-xs font-bold uppercase tracking-[0.15em] text-[var(--text-secondary)]">Chronos Local AI</p>
                <p className="mt-1.5 truncate font-mono text-[11px] uppercase tracking-wider text-[var(--text-muted)]">{runtimeLabel}</p>
              </div>
            </div>

            <div className="grid w-[min(940px,100%)] grid-cols-4 gap-3 border-l border-[var(--glass-border)] pl-5">
              <div className="glass-panel group relative overflow-hidden rounded-2xl px-4 py-3.5 transition-all hover:bg-[var(--bg-raised)] hover:-translate-y-0.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--text-secondary)]">Coverage</p>
                <p className="mt-2 font-display text-3xl font-medium tracking-tight tabular-nums text-[var(--text-primary)]" style={{ letterSpacing: "-0.04em" }} data-testid="status-coverage">
                  {Math.round(state.metrics.coverage * 100)}%
                </p>
              </div>

              <div className="glass-panel group relative overflow-hidden rounded-2xl px-4 py-3.5 transition-all hover:bg-[var(--bg-raised)] hover:-translate-y-0.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--text-secondary)]">Needs Attention</p>
                <p className={`mt-2 font-display text-3xl font-medium tracking-tight tabular-nums ${state.metrics.unresolvedCount > 0 ? "text-[var(--category-pink-red)]" : "text-[var(--text-primary)]"}`} style={{ letterSpacing: "-0.04em" }} data-testid="status-unresolved">
                  {state.metrics.unresolvedCount}
                </p>
              </div>

              <div
                className="glass-panel group time-fluid-fill relative overflow-hidden rounded-2xl px-4 py-3.5 transition-all hover:-translate-y-0.5"
                style={{ "--fill-pct": Math.min(state.metrics.trackedHours / state.metrics.targetHours, 1) } as React.CSSProperties}
              >
                <div className="relative z-10 flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--text-secondary)]">Tracked vs Target</p>
                </div>
                <p className="relative z-10 mt-2 font-display text-3xl font-medium tracking-tight tabular-nums text-[var(--accent-slate-700)]" style={{ letterSpacing: "-0.04em" }}>
                  {formatHours(state.metrics.trackedHours)}
                  <span className="mx-1.5 text-xl font-normal text-[var(--text-muted)]/50" style={{ letterSpacing: "normal" }}>/</span>
                  <span className="text-xl font-normal text-[var(--text-muted)]">{formatHours(state.metrics.targetHours)}</span>
                </p>
              </div>

              <div className="glass-panel group relative overflow-hidden rounded-2xl px-4 py-3.5 transition-all hover:bg-[var(--bg-raised)] hover:-translate-y-0.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--text-secondary)]">Submission State</p>
                <div className="mt-2 flex items-center gap-2.5">
                  <div className={`h-2.5 w-2.5 rounded-full ${state.metrics.submitReady ? "bg-[var(--accent-slate-500)] shadow-[0_0_12px_var(--accent-slate-500)] animate-pulse" : "bg-[var(--text-muted)]/30"}`} />
                  {state.metrics.submitReady ? (
                    <button 
                      onClick={() => setIsDailySyncOpen(true)}
                      className="font-display text-3xl font-medium tracking-tight text-[var(--accent-slate-700)] transition-colors hover:text-white"
                    >
                      Sync Ready
                    </button>
                  ) : (
                    <p className="font-display text-3xl font-medium tracking-tight text-[var(--text-secondary)]">
                      In Review
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-[80px_minmax(0,1fr)_320px] gap-4">
          <section className="glass-panel min-h-0 overflow-visible rounded-2xl p-2">
             <ConfidenceTimeline sessions={currentPage.sessions} onAssignProject={handleAssignProject} />
          </section>

          <section className="min-h-0 flex flex-col gap-4">
            <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.75fr)_340px] gap-4">
              <div className="glass-panel flex min-h-0 flex-col rounded-2xl p-4">
                <div className="flex items-center justify-between gap-3 px-2 pt-1">
                  <div>
                    <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Session Matrix</h1>
                    <p className="text-sm mt-1 text-[var(--text-secondary)]">Captured work sessions, composed for one-glance review.</p>
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

                <div className={`mt-3 grid min-h-0 flex-1 grid-cols-3 grid-rows-2 gap-2 ${focusedSessionId ? "matrix-grid-spotlight" : ""}`} data-testid="matrix-grid">
                  {matrixSlots.map((slot) => {
                    if (!slot.session) {
                      return (
                        <div
                          key={slot.id}
                          className="rounded-lg border border-dashed border-[var(--border-soft)] bg-[var(--glass-surface)]"
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
                        className={`matrix-slot flex h-full flex-col items-start justify-between rounded-xl px-4 py-3.5 text-left border-0 ${interactiveStateClasses.focus} ${
                          slot.isFocused
                            ? `matrix-slot--focused bg-[var(--glass-surface-strong)] ring-2 ring-[var(--accent-slate-500)] ring-offset-2 ring-offset-[var(--bg-canvas)] shadow-[var(--glass-shadow-soft)]`
                            : `bg-[var(--glass-surface)] ring-1 ring-[var(--glass-border)]`
                        }`}
                      >
                        <div className="flex w-full items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[15px] font-semibold tracking-tight leading-snug text-[var(--text-primary)]">{slot.session.summary}</p>
                            {(() => {
                              const pc = getProjectColor(slot.session.project);
                              return (
                                <span 
                                  className="mt-1.5 inline-block rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ring-1"
                                  style={{
                                    backgroundColor: pc.bgLight,
                                    color: pc.textDark,
                                    borderColor: pc.ring,
                                  }}
                                >
                                  {slot.session.project ?? "Unassigned"}
                                </span>
                              );
                            })()}
                          </div>
                          <span className="shrink-0 rounded-full border border-[var(--glass-border)] bg-[var(--glass-surface)] px-2.5 py-1 font-mono text-xs font-medium tabular-nums text-[var(--accent-slate-700)]">
                            {formatHours(slot.session.durationMinutes / 60)}
                          </span>
                        </div>
                        <div className="mt-auto pt-4 w-full text-xs text-[var(--text-secondary)] flex items-center justify-between">
                          <p className="rounded bg-[var(--glass-surface)] px-2 py-0.5 text-[11px] font-medium">{reviewStateLabel[slot.session.reviewState]}</p>
                          <p className="font-mono tabular-nums text-[var(--text-muted)]">{formatWindow(slot.session.startedAt, slot.session.endedAt)}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <aside className="glass-panel min-h-0 rounded-2xl p-5" data-testid="matrix-focus-panel">
                {focusedSession ? (
                  <div className="flex h-full flex-col">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--text-secondary)]">Focused Session</p>
                    <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight leading-tight text-[var(--text-primary)]">{focusedSession.summary}</h2>
                    <div className="mt-3 flex">
                      {(() => {
                        const pc = getProjectColor(focusedSession.project);
                        return (
                          <span 
                            className="inline-block rounded-full border px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider"
                            style={{
                              backgroundColor: pc.bgLight,
                              color: pc.textDark,
                              borderColor: pc.ring,
                            }}
                          >
                            {focusedSession.project ?? "Project assignment needed"}
                          </span>
                        );
                      })()}
                    </div>
                    <p className="mt-3 inline-block self-start rounded-md border border-[var(--glass-border)] bg-[var(--glass-surface)] px-2.5 py-1 font-mono text-sm font-medium tabular-nums text-[var(--accent-slate-700)]">
                      {formatWindow(focusedSession.startedAt, focusedSession.endedAt)} · <span className="opacity-70">{formatHours(focusedSession.durationMinutes / 60)}</span>
                    </p>
                    <p className="mt-8 text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--text-secondary)] border-b border-[var(--border-soft)] pb-2 mb-3">Signals</p>
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
                  <div className="glass-panel flex h-full w-full flex-col items-center justify-center rounded-xl border-dashed p-6 text-center">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-surface)]">
                      <svg className="h-5 w-5 text-[var(--accent-slate-500)] opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <h3 className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)]">No session selected</h3>
                    <p className="mt-2 max-w-[240px] text-[13px] leading-relaxed text-[var(--text-secondary)]">
                      Select a session from the matrix to view detailed tracking insights, AI rationale, and application switching events.
                    </p>
                  </div>
                )}
              </aside>
            </div>
          </section>

          <aside className="glass-panel-strong flex flex-col rounded-3xl p-5">
            <div className="mb-4 border-b border-[var(--glass-border)] pb-4">
              <h3 className="font-display text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Review Queue</h3>
              <p className="mt-1.5 align-middle text-sm text-[var(--text-secondary)]">Use <kbd className="mx-0.5 rounded border border-[var(--glass-border)] bg-[var(--glass-surface)] px-1 py-0.5 font-mono text-xs">↑`/`↓</kbd> to navigate, <kbd className="mx-0.5 rounded border border-[var(--glass-border)] bg-[var(--glass-surface)] px-1 py-0.5 font-mono text-xs">Enter</kbd> to detail.</p>
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
                      className={`w-full rounded-xl px-3 py-2.5 text-left border-0 transition-all ${interactiveStateClasses.focus} ${
                        isSelected
                          ? `bg-[var(--glass-surface-strong)] shadow-[var(--glass-shadow-soft)] ring-1 ring-[var(--accent-slate-500)]`
                          : `bg-[var(--glass-surface)] ring-1 ring-[var(--glass-border)] hover:-translate-y-px hover:bg-[var(--bg-raised)]`
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-[var(--glass-border)] ${reviewMarkerClass[item.priority]}`} aria-hidden="true" />
                        <div className="min-w-0">
                          <p className="text-[14px] font-semibold tracking-tight leading-tight text-[var(--text-primary)]">{item.title}</p>
                          <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)] opacity-90">{item.hint}</p>
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

      <AnimatePresence>
      {state.drawerOpen && (
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed inset-y-0 right-0 z-30 w-[460px] border-l border-[var(--glass-border)] bg-[var(--glass-surface-strong)] p-6 shadow-[-16px_0_48px_rgba(3,4,14,0.5)] backdrop-blur-3xl"
      >
        {drawerSession ? (
          <div className="flex h-full flex-col">
            <div className="mb-6 flex items-start justify-between border-b border-[var(--border-soft)] pb-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--text-secondary)]">Session Review</p>
                <h3 className="mt-2 font-display text-3xl font-semibold tracking-tight text-[var(--text-primary)] leading-none" data-testid="drawer-session-title">
                  {drawerSession.summary}
                </h3>
                <p className="mt-3 w-max rounded-md border border-[var(--glass-border)] bg-[var(--glass-surface)] px-2.5 py-1 font-mono text-xs tabular-nums text-[var(--accent-slate-700)]">{formatWindow(drawerSession.startedAt, drawerSession.endedAt)} · <span className="opacity-70">{formatHours(drawerSession.durationMinutes / 60)}</span></p>
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
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Project</span>
                <input
                  value={draftProject}
                  onChange={(event) => setDraftProject(event.target.value)}
                  placeholder="Assign project"
                  className="drawer-input w-full rounded-md px-3 py-2 text-sm text-[var(--text-primary)]"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Session summary</span>
                <textarea
                  value={draftSummary}
                  onChange={(event) => setDraftSummary(event.target.value)}
                  rows={4}
                  className="drawer-input w-full rounded-md px-3 py-2 text-sm text-[var(--text-primary)]"
                />
              </label>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Confidence override</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={draftConfidence}
                  onChange={(event) => setDraftConfidence(Number(event.target.value))}
                  className="w-full accent-[var(--accent-aurora-end)]"
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
                  className={`aurora-cta rounded-md border px-3 py-2 text-sm ${interactiveStateClasses.focus}`}
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
                  className={`aurora-cta rounded-md border px-3 py-2 text-sm ${interactiveStateClasses.focus}`}
                >
                  Resolve session
                </button>
              </div>

              {aiError ? (
                <p className={`rounded-md border px-3 py-2 text-xs ${interactiveStateClasses.critical}`}>{aiError}</p>
              ) : null}

              {drawerExplanation ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`rounded-lg border px-3 py-3 ${interactiveStateClasses.info}`}
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#9FEAF2]">AI rationale</p>
                  <p className="mt-2 text-sm text-[#BFEFF5]">
                    <Typewriter text={drawerExplanation.rationale} speed={18} />
                  </p>
                  <p className="mt-2 text-xs tabular-nums text-[#9FEAF2]">
                    Confidence: {Math.round(drawerExplanation.confidence * 100)}%
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-[#9FEAF2]">
                    {drawerExplanation.factors.map((factor) => (
                      <li key={factor}>{factor}</li>
                    ))}
                  </ul>
                </motion.div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--text-muted)]">Pick a session for detailed review.</div>
        )}
      </motion.div>
      )}
      </AnimatePresence>

      {/* AI Generative Summary Modal */}
      <DailySyncModal 
        isOpen={isDailySyncOpen} 
        onClose={() => setIsDailySyncOpen(false)} 
        sessions={state.sessions} 
      />

      {/* Proactive AI Nudges */}
      <AiNudgeToast 
        isOpen={showAiNudge} 
        onDismiss={() => setShowAiNudge(false)} 
        onAction={handleNudgeAction} 
      />
    </div>
  );
}
