import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

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

const reviewStateClass: Record<WorkSession["reviewState"], string> = {
  pending: "border-[var(--category-summary)]/30 bg-[var(--category-summary)]/10 text-[var(--category-summary)]",
  edited: "border-[var(--category-neutral)]/30 bg-[var(--surface-subtle)] text-[var(--text-secondary)]",
  resolved: "border-[var(--category-success)]/30 bg-[var(--category-success)]/10 text-[var(--category-success)]",
};

const reviewMarkerClass: Record<ReviewIssue["priority"], string> = {
  critical: "bg-[var(--category-financial)]",
  high: "bg-[var(--category-summary)]",
  medium: "bg-[var(--category-media)]",
};

const reviewPriorityClass: Record<ReviewIssue["priority"], string> = {
  critical: "border-[var(--category-financial)]/50 bg-[var(--category-financial)]/15 text-[var(--category-financial)]",
  high: "border-[var(--category-summary)]/30 bg-[var(--category-summary)]/10 text-[var(--category-summary)]",
  medium: "border-[var(--category-media)]/30 bg-[var(--category-media)]/15 text-[var(--category-media)]",
};

const reviewPriorityRingClass: Record<ReviewIssue["priority"], string> = {
  critical: "ring-[var(--category-financial)]/45",
  high: "ring-[var(--category-summary)]/45",
  medium: "ring-[var(--category-media)]/45",
};

const reviewPriorityLabel: Record<ReviewIssue["priority"], string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
};

const getConfidenceClass = (confidence: number) => {
  if (confidence >= 0.8) {
    return "border-[var(--category-success)]/30 bg-[var(--category-success)]/10 text-[var(--category-success)]";
  }

  if (confidence >= 0.55) {
    return "border-[var(--category-formal)]/30 bg-[var(--category-formal)]/10 text-[var(--text-primary)]";
  }

  return "border-[var(--category-summary)]/30 bg-[var(--category-summary)]/10 text-[var(--category-summary)]";
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
  const prefersReducedMotion = useReducedMotion();
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
    const sessionsWithConfidence = injectMockConfidence(baseState.sessions);

    const normalizedQuery = nlQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return {
        ...baseState,
        sessions: sessionsWithConfidence,
      };
    }

    const filteredSessions = sessionsWithConfidence.filter((session) => (
      session.project?.toLowerCase().includes(normalizedQuery)
      || session.summary.toLowerCase().includes(normalizedQuery)
    ));

    const pseudoState = createWorkspaceState(events, { targetHours, gapMinutes: 32 });
    const trackedStats = filteredSessions.reduce((acc, session) => {
      acc.tracked += session.durationMinutes / 60;
      if (session.reviewState === "resolved") {
        acc.resolved += 1;
      } else {
        acc.unresolved += 1;
      }
      return acc;
    }, { tracked: 0, resolved: 0, unresolved: 0 });

    const updatedMetrics = {
      ...pseudoState.metrics,
      trackedHours: trackedStats.tracked,
      unresolvedCount: trackedStats.unresolved,
      submitReady: trackedStats.unresolved === 0 && filteredSessions.length > 0,
      coverage: trackedStats.tracked / targetHours,
    };

    return {
      ...baseState,
      sessions: filteredSessions,
      metrics: updatedMetrics,
      reviewQueue: baseState.reviewQueue.filter((issue) =>
        filteredSessions.some((session) => session.id === issue.sessionId),
      ),
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
      setNlSummary(`You logged ${h} hours for this context. I have filtered your timeline and review queue to show only relevant sessions.`);
      setIsAiFiltering(false);
    }, 800);

    return () => clearTimeout(delay);
  }, [nlQuery, state.metrics.trackedHours, state.sessions.length]);

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
  const focusedIssue =
    state.reviewQueue.find((issue) => issue.sessionId === focusedSession?.id) ?? null;
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
  const microLabelClass = "text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]";
  const helperTextClass = "text-[13px] leading-5 text-[var(--text-secondary)]";
  const queueProgress =
    state.metrics.totalSessions === 0 ? 1 : state.metrics.resolvedCount / state.metrics.totalSessions;
  const surfaceTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const };
  const contentTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.18, ease: [0.22, 1, 0.36, 1] as const };
  const drawerTransition = prefersReducedMotion
    ? { duration: 0.16 }
    : { type: "spring" as const, damping: 26, stiffness: 230, mass: 0.92 };
  const shellPaddingClass =
    runtimePlatform === "darwin" ? "px-4 pb-4 pt-0" : "p-4";

  return (
    <div className="relative h-screen overflow-hidden bg-[var(--bg-app)] text-[var(--text-primary)] antialiased transition-colors duration-300">
      <div className={`mx-auto flex h-full max-w-[1680px] flex-col gap-4 transition-all duration-300 ${shellPaddingClass} ${nlQuery ? "opacity-95 contrast-110 saturate-75" : ""}`}>
        {runtimePlatform === "darwin" ? (
          <div className="titlebar-drag-region h-11 shrink-0" aria-hidden="true" />
        ) : null}

        <div className="shrink-0 px-12">
          <AskChronosBar
            onQueryChange={setNlQuery}
            isProcessing={isAiFiltering}
            nlSummary={nlSummary}
          />
        </div>

        <header className="glass-panel-strong relative h-[92px] overflow-hidden rounded-2xl px-6" data-testid="workspace-header">
          <div className="flex h-full items-center justify-between gap-4">
            <div className="min-w-0 pr-4 flex items-center gap-4">
              <PulseOrb state={orbState} />
              <div>
                <p className={microLabelClass}>Chronos Local AI</p>
                <p className="mt-1.5 truncate font-mono text-[12px] tracking-[0.08em] text-[var(--text-secondary)]">{runtimeLabel}</p>
              </div>
            </div>

            <div className="grid w-[min(940px,100%)] grid-cols-4 gap-3 border-l border-[var(--glass-border)] pl-5">
              <div className="glass-panel group relative overflow-hidden rounded-xl px-4 py-3 transition-all duration-200 hover:bg-[var(--surface-glass-hover)]">
                <p className={microLabelClass}>Coverage</p>
                <p className="mt-2 font-display text-[30px] font-semibold tracking-tight tabular-nums text-[var(--text-primary)]" style={{ letterSpacing: "-0.04em" }} data-testid="status-coverage">
                  {Math.round(state.metrics.coverage * 100)}%
                </p>
              </div>

              <div className="glass-panel group relative overflow-hidden rounded-xl px-4 py-3 transition-all duration-200 hover:bg-[var(--surface-glass-hover)]">
                <p className={microLabelClass}>Needs Attention</p>
                <p className={`mt-2 font-display text-[30px] font-semibold tracking-tight tabular-nums ${state.metrics.unresolvedCount > 0 ? "text-[var(--category-financial)]" : "text-[var(--text-primary)]"}`} style={{ letterSpacing: "-0.04em" }} data-testid="status-unresolved">
                  {state.metrics.unresolvedCount}
                </p>
              </div>

              <div
                className="glass-panel group time-fluid-fill relative overflow-hidden rounded-xl px-4 py-3 transition-all duration-200"
                style={{ "--fill-pct": Math.min(state.metrics.trackedHours / state.metrics.targetHours, 1) } as React.CSSProperties}
              >
                <div className="relative z-10 flex items-center justify-between">
                  <p className={microLabelClass}>Tracked vs Target</p>
                </div>
                <p className="relative z-10 mt-2 font-mono text-[30px] font-semibold tracking-tight tabular-nums text-[var(--text-primary)]" style={{ letterSpacing: "-0.04em" }}>
                  {formatHours(state.metrics.trackedHours)}
                  <span className="mx-1.5 text-[20px] font-normal text-[var(--text-muted)]/50" style={{ letterSpacing: "normal" }}>/</span>
                  <span className="text-[20px] font-normal text-[var(--text-muted)]">{formatHours(state.metrics.targetHours)}</span>
                </p>
              </div>

              <div className="glass-panel group relative overflow-hidden rounded-xl px-4 py-3 transition-all duration-200 hover:bg-[var(--surface-glass-hover)]">
                <p className={microLabelClass}>Submission State</p>
                <div className="mt-2 flex items-center gap-2.5">
                  <div className={`h-2.5 w-2.5 rounded-full ${state.metrics.submitReady ? "bg-[var(--category-success)] shadow-[0_0_10px_rgba(52,199,89,0.35)] animate-pulse" : "bg-[var(--category-summary)] shadow-[0_0_8px_rgba(255,159,10,0.22)]"}`} />
                  <AnimatePresence mode="wait" initial={false}>
                    {state.metrics.submitReady ? (
                      <motion.button
                        key="submit-ready"
                        initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={prefersReducedMotion ? undefined : { opacity: 0, y: -4 }}
                        transition={contentTransition}
                        onClick={() => setIsDailySyncOpen(true)}
                        className="font-display text-[30px] font-semibold tracking-tight text-[var(--category-success)] transition-colors duration-200 hover:text-[var(--text-primary)]"
                      >
                        Sync Ready
                      </motion.button>
                    ) : (
                      <motion.p
                        key="submit-review"
                        initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={prefersReducedMotion ? undefined : { opacity: 0, y: -4 }}
                        transition={contentTransition}
                        className="font-display text-[30px] font-semibold tracking-tight text-[var(--text-secondary)]"
                      >
                        In Review
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={state.metrics.submitReady ? "submit-ready-copy" : `submit-review-copy-${state.metrics.unresolvedCount}`}
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={prefersReducedMotion ? undefined : { opacity: 0, y: -3 }}
                    transition={contentTransition}
                    className="mt-1.5 text-[12px] leading-5 font-ui text-[var(--text-secondary)]"
                  >
                    {state.metrics.submitReady
                      ? "Everything is resolved and ready for export."
                      : `${state.metrics.unresolvedCount} session${state.metrics.unresolvedCount === 1 ? "" : "s"} still need review.`}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-[80px_minmax(0,1fr)_320px] gap-4">
          <section className="glass-panel min-h-0 overflow-visible rounded-2xl p-2" data-testid="session-timeline-panel">
             <ConfidenceTimeline sessions={currentPage.sessions} onAssignProject={handleAssignProject} />
          </section>

          <section className="min-h-0 flex flex-col gap-4">
            <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.75fr)_340px] gap-4">
              <div className="glass-panel-inner flex min-h-0 flex-col rounded-2xl p-4">
                <div className="flex items-center justify-between gap-3 px-2 pt-1">
                  <div>
                    <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Session Matrix</h1>
                    <p className={`${helperTextClass} mt-1`}>Captured work sessions, composed for one-glance review.</p>
                  </div>
                  <div className="flex items-center gap-2" data-testid="matrix-pagination">
                    <button
                      type="button"
                      onClick={() => setActivePageIndex((previous) => Math.max(0, previous - 1))}
                      className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium disabled:opacity-50 ${neutralControl}`}
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
                          className={`h-6 min-w-6 rounded-full border px-1.5 text-[11px] font-medium ${
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

                <div className={`mt-4 grid min-h-0 flex-1 grid-cols-3 grid-rows-2 gap-3 ${focusedSessionId ? "matrix-grid-spotlight" : ""}`} data-testid="matrix-grid">
                  {matrixSlots.map((slot) => {
                    if (!slot.session) {
                      return (
                        <div
                          key={slot.id}
                          className="rounded-xl border border-dashed border-[var(--border-soft)] bg-[rgba(255,255,255,0.02)]"
                          aria-hidden="true"
                        />
                      );
                    }

                    return (
                      <motion.button
                        layout={!prefersReducedMotion}
                        key={slot.id}
                        type="button"
                        data-testid={`matrix-slot-${slot.session.id}`}
                        onClick={() => activateSession(slot.session!.id)}
                        whileHover={
                          prefersReducedMotion || slot.isFocused
                            ? undefined
                            : { scale: 1.01, transition: { duration: 0.16 } }
                        }
                        whileTap={prefersReducedMotion ? undefined : { scale: 0.992 }}
                        transition={surfaceTransition}
                        className={`matrix-slot relative overflow-hidden flex h-full flex-col items-start justify-between rounded-xl px-4 py-4 text-left border-0 transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--focus-ring)] ${
                          slot.isFocused
                            ? `matrix-slot--focused bg-[var(--surface-glass-strong)] shadow-[var(--glass-shadow-soft)] before:absolute before:inset-0 before:ring-1 before:ring-inset before:ring-[var(--border-active)] before:rounded-xl`
                            : `bg-[var(--surface-subtle)] hover:bg-[var(--surface-glass-hover)] ring-1 ring-inset ring-[var(--border-subtle)]`
                        }`}
                      >
                        {/* Dynamic edge bleed on hover (semantic colors) */}
                        <div className="absolute top-0 left-0 h-full w-[2px] bg-gradient-to-b from-transparent via-[var(--border-active)] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                        
                        <div className="flex w-full items-start justify-between gap-3 relative z-10">
                          <div className="min-w-0">
                            <p className="font-ui text-[15px] font-semibold tracking-tight leading-6 text-[var(--text-primary)]">{slot.session.summary}</p>
                            {(() => {
                              const pc = getProjectColor(slot.session.project);
                              return (
                                <span 
                                  className="mt-2 inline-block rounded-md bg-[var(--surface-subtle)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--text-secondary)] ring-1 ring-inset ring-[var(--border-subtle)]"
                                >
                                  {slot.session.project ?? "Unassigned"}
                                </span>
                              );
                            })()}
                          </div>
                          <span className="shrink-0 rounded-md bg-[var(--surface-subtle)] px-2 py-1 font-mono text-[12px] font-medium tabular-nums text-[var(--text-primary)] ring-1 ring-inset ring-[var(--border-subtle)]">
                            {formatHours(slot.session.durationMinutes / 60)}
                          </span>
                        </div>
                        <div className="mt-auto flex w-full items-center justify-between pt-5 text-xs text-[var(--text-secondary)] relative z-10">
                          <p className={`rounded-md border px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-[0.05em] ${reviewStateClass[slot.session.reviewState]}`}>
                            {reviewStateLabel[slot.session.reviewState]}
                          </p>
                          <p className="font-mono text-[11px] tabular-nums text-[var(--text-muted)]">{formatWindow(slot.session.startedAt, slot.session.endedAt)}</p>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <aside className="glass-panel-strong min-h-0 rounded-2xl p-6 relative overflow-hidden" data-testid="matrix-focus-panel">
                <div className="absolute top-0 left-1/2 w-32 h-[1px] bg-[var(--category-formal)] opacity-60 -translate-x-1/2 blur-[1px]" />
                {focusedSession ? (
                  <motion.div
                    layout={!prefersReducedMotion}
                    initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.98, filter: "blur(4px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="flex h-full flex-col relative z-10"
                  >
                      <p className={microLabelClass}>Focused Session</p>
                      <h2 className="mt-4 font-ui text-2xl font-semibold tracking-tight leading-snug text-[var(--text-primary)]">{focusedSession.summary}</h2>
                      <motion.div layout={!prefersReducedMotion} className="mt-4 flex flex-wrap gap-2">
                        {(() => {
                          const pc = getProjectColor(focusedSession.project);
                          return (
                            <span 
                              className="inline-block rounded-md bg-[var(--surface-subtle)] px-2 py-1 font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--text-secondary)] ring-1 ring-inset ring-[var(--border-subtle)]"
                            >
                              {focusedSession.project ?? "Project assignment needed"}
                            </span>
                          );
                        })()}
                        <span className={`inline-flex items-center rounded-md border px-2 py-1 font-mono uppercase tracking-[0.05em] text-[10px] font-semibold ${reviewStateClass[focusedSession.reviewState]}`}>
                          {reviewStateLabel[focusedSession.reviewState]}
                        </span>
                        <span className={`inline-flex items-center rounded-md border px-2 py-1 font-mono uppercase tracking-[0.05em] text-[10px] font-semibold ${getConfidenceClass(focusedSession.confidence)}`}>
                          {Math.round(focusedSession.confidence * 100)}% confidence
                        </span>
                      </motion.div>
                      <p className="mt-5 inline-block self-start rounded-md border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-1.5 font-mono text-[12px] font-medium tabular-nums text-[var(--text-primary)]">
                        {formatWindow(focusedSession.startedAt, focusedSession.endedAt)} · <span className="opacity-50">{formatHours(focusedSession.durationMinutes / 60)}</span>
                      </p>
                      <AnimatePresence mode="wait" initial={false}>
                        {focusedIssue ? (
                          <motion.div
                            key={`focused-issue-${focusedIssue.id}`}
                            initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={prefersReducedMotion ? undefined : { opacity: 0, y: -6 }}
                            transition={contentTransition}
                            className="mt-4 rounded-xl border border-[var(--glass-border)] bg-[rgba(255,255,255,0.025)] px-3.5 py-3"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className={microLabelClass}>Review Signal</p>
                              <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${reviewPriorityClass[focusedIssue.priority]}`}>
                                {reviewPriorityLabel[focusedIssue.priority]}
                              </span>
                            </div>
                            <p className="mt-2 text-[13px] leading-5 text-[var(--text-primary)]">{focusedIssue.hint}</p>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="focused-clear"
                            initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={prefersReducedMotion ? undefined : { opacity: 0, y: -6 }}
                            transition={contentTransition}
                            className="mt-4 rounded-xl border border-[var(--category-success)]/30 bg-[var(--category-success)]/10 px-3.5 py-3"
                          >
                            <p className={microLabelClass}>Review Signal</p>
                            <p className="mt-2 text-[13px] font-ui leading-5 text-[var(--category-success)]">This session is clear enough to ship without more review.</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <p className={`mt-8 mb-3 border-b border-[var(--border-subtle)] pb-2 ${microLabelClass}`}>Signals</p>
                      <p className={`${helperTextClass} font-mono text-[12px]`}>
                        {focusedSession.signals.slice(0, 3).join(" · ") || "No high-signal hints"}
                      </p>

                      <div className="mt-auto flex flex-wrap gap-2 pt-4">
                        <button
                          type="button"
                          onClick={() => dispatch({ type: "open_drawer", sessionId: focusedSession.id })}
                          className={`rounded-xl border px-3.5 py-2 text-sm font-ui font-medium ${neutralControl}`}
                        >
                          Open details
                        </button>
                        <button
                          type="button"
                          onClick={() => dispatch({ type: "resolve_session", sessionId: focusedSession.id })}
                          className={`rounded-xl border px-3.5 py-2 text-sm font-ui font-medium ${interactiveStateClasses.active} ${interactiveStateClasses.focus}`}
                        >
                          Mark resolved
                        </button>
                      </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={contentTransition}
                    className="glass-panel-inner flex h-full w-full flex-col items-center justify-center rounded-xl border-dashed p-6 text-center"
                  >
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-surface)]">
                      <svg className="h-5 w-5 text-[var(--accent-slate-500)] opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <h3 className="text-[16px] font-semibold tracking-tight text-[var(--text-primary)]">No session selected</h3>
                    <p className="mt-2 max-w-[240px] text-[13px] leading-6 text-[var(--text-secondary)]">
                      Select a session from the matrix to view detailed tracking insights, AI rationale, and application switching events.
                    </p>
                  </motion.div>
                )}
              </aside>
            </div>
          </section>

          <aside className="glass-panel-strong flex flex-col rounded-2xl p-5">
            <div className="mb-4 border-b border-[var(--glass-border)] pb-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Review Queue</h3>
                  <p className="mt-1.5 align-middle text-[13px] leading-5 text-[var(--text-secondary)]">Use <kbd className="mx-0.5 rounded border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] px-1.5 py-0.5 font-mono text-[11px]">↑`/`↓</kbd> to navigate, <kbd className="mx-0.5 rounded border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] px-1.5 py-0.5 font-mono text-[11px]">Enter</kbd> to detail.</p>
                </div>
                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${state.metrics.submitReady ? "border-[var(--state-success-border)] bg-[var(--state-success-bg)] text-[var(--state-success-text)]" : "border-[var(--state-warning-border)] bg-[var(--state-warning-bg)] text-[var(--state-warning-text)]"}`}>
                  {state.metrics.submitReady ? "Ready" : `${state.metrics.unresolvedCount} open`}
                </span>
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/5">
                <motion.div
                  className={`h-full rounded-full transition-all duration-300 ${state.metrics.submitReady ? "bg-[var(--category-green)]" : "bg-[var(--accent-slate-500)]"}`}
                  animate={{ width: `${Math.max(queueProgress * 100, state.metrics.totalSessions === 0 ? 100 : 8)}%` }}
                  transition={surfaceTransition}
                />
              </div>
            </div>

            <motion.ul layout={!prefersReducedMotion} className="mt-2 space-y-2" data-testid="review-list">
              {reviewSummary.items.map((item) => {
                const isSelected = item.id === state.selectedIssueId;
                const issue = state.reviewQueue.find((queuedIssue) => queuedIssue.id === item.id) ?? null;

                return (
                  <motion.li key={item.id} transition={surfaceTransition}>
                    <motion.button
                      layout={!prefersReducedMotion}
                      type="button"
                      data-testid={`review-item-${item.id}`}
                      onClick={() => {
                        dispatch({ type: "select_issue", issueId: item.id });
                        setFocusedSessionId(item.sessionId);
                        dispatch({ type: "open_drawer", sessionId: item.sessionId });
                      }}
                      whileHover={prefersReducedMotion ? undefined : { x: 1 }}
                      whileTap={prefersReducedMotion ? undefined : { scale: 0.995 }}
                      transition={surfaceTransition}
                      className={`w-full rounded-xl px-3.5 py-3 text-left border-0 transition-all duration-200 ${interactiveStateClasses.focus} ${
                        isSelected
                          ? `bg-[var(--glass-surface-strong)] shadow-[var(--glass-shadow-soft)] ring-1 ${issue ? reviewPriorityRingClass[issue.priority] : "ring-[var(--accent-slate-500)]"}`
                          : `bg-[var(--glass-surface)] ring-1 ring-[var(--glass-border)] hover:bg-[rgba(255,255,255,0.06)]`
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-[var(--glass-border)] ${reviewMarkerClass[item.priority]}`} aria-hidden="true" />
                        <div className="min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-[14px] font-semibold tracking-tight leading-5 text-[var(--text-primary)]">{item.title}</p>
                            {issue ? (
                              <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${reviewPriorityClass[issue.priority]}`}>
                                {reviewPriorityLabel[issue.priority]}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-[12px] leading-5 text-[var(--text-secondary)] opacity-90">{item.hint}</p>
                          {issue ? (
                            <p className="mt-2 font-mono text-[11px] tabular-nums text-[var(--text-muted)]">
                              {Math.round(issue.confidence * 100)}% confidence
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </motion.button>
                  </motion.li>
                );
              })}
            </motion.ul>

            {reviewSummary.overflowCount > 0 ? (
              <p className="mt-3 text-[12px] text-[var(--text-muted)]">+{reviewSummary.overflowCount} additional review items</p>
            ) : null}

            {reviewSummary.total === 0 ? (
              <p className={`mt-3 rounded-xl border px-3 py-2.5 text-[12px] ${interactiveStateClasses.info}`}>
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
        transition={drawerTransition}
        data-testid="session-drawer"
        className="fixed inset-y-0 right-0 z-30 w-[460px] border-l border-[var(--glass-border)] bg-[var(--glass-surface-strong)] p-6 shadow-[-16px_0_40px_rgba(3,4,14,0.34)] backdrop-blur-3xl"
      >
        {drawerSession ? (
          <div className="flex h-full flex-col">
            <div className="mb-6 flex items-start justify-between border-b border-[var(--border-soft)] pb-5">
              <div>
                <p className={microLabelClass}>Session Review</p>
                <h3 className="mt-2 font-display text-3xl font-semibold tracking-tight text-[var(--text-primary)] leading-none" data-testid="drawer-session-title">
                  {drawerSession.summary}
                </h3>
                <p className="mt-3 w-max rounded-lg border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] px-3 py-1.5 font-mono text-[12px] tabular-nums text-[var(--accent-slate-700)]">{formatWindow(drawerSession.startedAt, drawerSession.endedAt)} · <span className="opacity-70">{formatHours(drawerSession.durationMinutes / 60)}</span></p>
              </div>
              <button
                type="button"
                onClick={() => dispatch({ type: "close_drawer" })}
                className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-medium ${neutralControl}`}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="sr-only">Close</span>
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto pr-1">
              <label className="block">
                <span className={`mb-2 block ${microLabelClass}`}>Project</span>
                <input
                  value={draftProject}
                  onChange={(event) => setDraftProject(event.target.value)}
                  placeholder="Assign project"
                  className="drawer-input w-full rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)]"
                />
              </label>

              <label className="block">
                <span className={`mb-2 block ${microLabelClass}`}>Session summary</span>
                <textarea
                  value={draftSummary}
                  onChange={(event) => setDraftSummary(event.target.value)}
                  rows={4}
                  className="drawer-input w-full rounded-xl px-3 py-2.5 text-sm leading-6 text-[var(--text-primary)]"
                />
              </label>

              <div>
                <label className={`mb-2 block ${microLabelClass}`}>Confidence override</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={draftConfidence}
                  onChange={(event) => setDraftConfidence(Number(event.target.value))}
                  className="drawer-range"
                />
                <p className="mt-2 text-[13px] text-[var(--text-secondary)]">{Math.round(draftConfidence * 100)}% confidence</p>
              </div>

              <label className="inline-flex items-center gap-2.5 text-sm text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={draftBillable}
                  onChange={(event) => setDraftBillable(event.target.checked)}
                  className="drawer-checkbox"
                />
                Billable work
              </label>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={applyDraftChanges}
                  className={`rounded-xl border px-3.5 py-2 text-sm font-medium ${neutralControl}`}
                >
                  Apply edits
                </button>
                <button
                  type="button"
                  onClick={requestExplanation}
                  className={`rounded-xl border px-3.5 py-2 text-sm font-medium ${neutralControl}`}
                  disabled={aiLoadingSessionId === drawerSession.id}
                >
                  {aiLoadingSessionId === drawerSession.id ? "Asking AI..." : "Explain with AI"}
                </button>
                <button
                  type="button"
                  onClick={() => dispatch({ type: "resolve_session", sessionId: drawerSession.id })}
                  className={`aurora-cta rounded-xl border px-4 py-2.5 text-sm font-semibold ${interactiveStateClasses.focus}`}
                >
                  Resolve session
                </button>
              </div>

              {aiError ? (
                <p className={`rounded-xl border px-3 py-2.5 text-[12px] ${interactiveStateClasses.critical}`}>{aiError}</p>
              ) : null}

              {drawerExplanation ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`rounded-xl border px-3.5 py-3.5 ${interactiveStateClasses.info}`}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--category-cyan)]">AI rationale</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-primary)]">
                    <Typewriter text={drawerExplanation.rationale} speed={18} />
                  </p>
                  <p className="mt-3 text-[12px] tabular-nums text-[var(--text-secondary)]">
                    Confidence: {Math.round(drawerExplanation.confidence * 100)}%
                  </p>
                  <ul className="mt-3 list-disc space-y-1.5 pl-4 text-[12px] leading-5 text-[var(--text-secondary)]">
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
