import { startTransition, useEffect, useMemo, useRef, useState } from "react";

import {
  buildActionItems,
  buildControlTowerMetrics,
  getSessionDurationHours,
  groupSessionsByDay,
  mockWeekSessions,
  type ActionItem,
  type DayKey,
  type SessionCategory,
  type WorkSession,
} from "./lib/dashboard-model";
import { checkOllamaHealth, explainEvent } from "./lib/ollama";

const timelineStartHour = 8;
const timelineEndHour = 21.5;

const categoryStyles: Record<
  SessionCategory,
  {
    badge: string;
    block: string;
    glow: string;
  }
> = {
  coding: {
    badge: "bg-emerald-500/16 text-emerald-200 ring-1 ring-emerald-400/30",
    block:
      "border-emerald-400/35 bg-[linear-gradient(135deg,rgba(16,185,129,0.22),rgba(6,8,22,0.88))]",
    glow: "shadow-[0_22px_40px_-24px_rgba(16,185,129,0.85)]",
  },
  communication: {
    badge: "bg-sky-500/16 text-sky-200 ring-1 ring-sky-400/30",
    block: "border-sky-400/35 bg-[linear-gradient(135deg,rgba(56,189,248,0.22),rgba(6,8,22,0.88))]",
    glow: "shadow-[0_22px_40px_-24px_rgba(56,189,248,0.8)]",
  },
  design: {
    badge: "bg-fuchsia-500/16 text-fuchsia-200 ring-1 ring-fuchsia-400/30",
    block:
      "border-fuchsia-400/35 bg-[linear-gradient(135deg,rgba(217,70,239,0.22),rgba(6,8,22,0.88))]",
    glow: "shadow-[0_22px_40px_-24px_rgba(217,70,239,0.85)]",
  },
  documentation: {
    badge: "bg-amber-500/16 text-amber-200 ring-1 ring-amber-400/30",
    block:
      "border-amber-400/35 bg-[linear-gradient(135deg,rgba(251,191,36,0.2),rgba(6,8,22,0.88))]",
    glow: "shadow-[0_22px_40px_-24px_rgba(251,191,36,0.8)]",
  },
  browsing: {
    badge: "bg-violet-500/16 text-violet-200 ring-1 ring-violet-400/30",
    block:
      "border-violet-400/35 bg-[linear-gradient(135deg,rgba(139,92,246,0.22),rgba(6,8,22,0.88))]",
    glow: "shadow-[0_22px_40px_-24px_rgba(139,92,246,0.85)]",
  },
  meeting: {
    badge: "bg-cyan-500/16 text-cyan-200 ring-1 ring-cyan-400/30",
    block:
      "border-cyan-400/35 bg-[linear-gradient(135deg,rgba(34,211,238,0.22),rgba(6,8,22,0.88))]",
    glow: "shadow-[0_22px_40px_-24px_rgba(34,211,238,0.85)]",
  },
  admin: {
    badge: "bg-slate-400/16 text-slate-200 ring-1 ring-slate-300/20",
    block:
      "border-slate-400/25 bg-[linear-gradient(135deg,rgba(100,116,139,0.24),rgba(6,8,22,0.88))]",
    glow: "shadow-[0_22px_40px_-24px_rgba(100,116,139,0.85)]",
  },
  entertainment: {
    badge: "bg-rose-500/16 text-rose-200 ring-1 ring-rose-400/30",
    block:
      "border-rose-400/35 bg-[linear-gradient(135deg,rgba(251,113,133,0.2),rgba(6,8,22,0.88))]",
    glow: "shadow-[0_22px_40px_-24px_rgba(251,113,133,0.8)]",
  },
  unknown: {
    badge: "bg-zinc-400/14 text-zinc-200 ring-1 ring-zinc-300/20",
    block:
      "border-zinc-400/30 bg-[linear-gradient(135deg,rgba(113,113,122,0.2),rgba(6,8,22,0.88))]",
    glow: "shadow-[0_22px_40px_-24px_rgba(161,161,170,0.75)]",
  },
};

const dayShortLabels: Record<DayKey, string> = {
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
};

const timeMarkers = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"];

const formatHours = (value: number) => `${value.toFixed(1)}h`;
const formatConfidence = (value: number) => `${Math.round(value * 100)}%`;

const toMinutes = (clock: string) => {
  const [hours, minutes] = clock.split(":").map(Number);
  return hours * 60 + minutes;
};

const getBlockGeometry = (session: WorkSession) => {
  const rangeStart = timelineStartHour * 60;
  const rangeEnd = timelineEndHour * 60;
  const range = rangeEnd - rangeStart;
  const start = toMinutes(session.startedAt);
  const end = toMinutes(session.endedAt);

  return {
    top: `${((start - rangeStart) / range) * 100}%`,
    height: `${Math.max(((end - start) / range) * 100, 10)}%`,
  };
};

const priorityStyles: Record<ActionItem["priority"], string> = {
  critical: "bg-rose-500/12 text-rose-200 ring-1 ring-rose-400/30",
  high: "bg-amber-500/12 text-amber-200 ring-1 ring-amber-400/30",
  medium: "bg-sky-500/12 text-sky-200 ring-1 ring-sky-400/30",
};

export default function ChronosDashboard() {
  const [sessions] = useState(mockWeekSessions);
  const [selectedId, setSelectedId] = useState<string | null>(mockWeekSessions[0]?.id ?? null);
  const [queueFilter, setQueueFilter] = useState<"all" | "pending" | "low-confidence">("all");
  const [ollamaState, setOllamaState] = useState<"checking" | "online" | "offline">("checking");
  const [explanation, setExplanation] = useState("");
  const [isExplaining, setIsExplaining] = useState(false);
  const [explanationError, setExplanationError] = useState("");
  const [isWeekCompleted, setIsWeekCompleted] = useState(false);
  const explainRequestVersion = useRef(0);

  const metrics = useMemo(() => buildControlTowerMetrics(sessions), [sessions]);
  const actionItems = useMemo(() => buildActionItems(sessions), [sessions]);
  const groupedDays = useMemo(() => groupSessionsByDay(sessions), [sessions]);

  const filteredActionItems = useMemo(() => {
    if (queueFilter === "all") {
      return actionItems;
    }

    if (queueFilter === "pending") {
      return actionItems.filter((item) => item.kind === "gap" || item.kind === "pending");
    }

    return actionItems.filter((item) => item.kind === "low-confidence");
  }, [actionItems, queueFilter]);

  const selectedSession = sessions.find((session) => session.id === selectedId) ?? null;

  useEffect(() => {
    let active = true;

    const runHealthCheck = async () => {
      try {
        const isOnline = await checkOllamaHealth();

        if (active) {
          setOllamaState(isOnline ? "online" : "offline");
        }
      } catch {
        if (active) {
          setOllamaState("offline");
        }
      }
    };

    void runHealthCheck();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    explainRequestVersion.current += 1;
    setExplanation("");
    setExplanationError("");
    setIsExplaining(false);
  }, [selectedId]);

  const handleExplain = async () => {
    if (!selectedSession) {
      return;
    }

    const requestVersion = explainRequestVersion.current + 1;
    explainRequestVersion.current = requestVersion;
    setIsExplaining(true);
    setExplanation("");
    setExplanationError("");

    try {
      const response = await explainEvent(selectedSession);

      if (requestVersion !== explainRequestVersion.current) {
        return;
      }

      setExplanation(response);
    } catch {
      if (requestVersion !== explainRequestVersion.current) {
        return;
      }

      setExplanationError("Ollama kunde inte forklara klassificeringen just nu.");
    } finally {
      if (requestVersion === explainRequestVersion.current) {
        setIsExplaining(false);
      }
    }
  };

  const completionGate = metrics.unresolvedItems === 0 && metrics.missingHours <= 0;
  const handleCompleteReview = () => {
    if (!completionGate) {
      return;
    }

    setIsWeekCompleted(true);
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#060816] text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_30%),radial-gradient(circle_at_85%_15%,rgba(99,102,241,0.2),transparent_28%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.12),transparent_35%)]" />

      <main className="relative mx-auto flex min-h-screen max-w-[1680px] flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        {/* Control tower: large, glanceable metrics instead of passive widgets. */}
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,1fr)]">
          <article className="overflow-hidden rounded-[32px] border border-white/10 bg-slate-950/80 p-5 shadow-[0_24px_80px_-36px_rgba(0,0,0,0.9)] backdrop-blur xl:p-6">
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-cyan-200">
                    Chronos control tower
                  </span>
                  <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-white md:text-[2.6rem]">
                      {isWeekCompleted ? "Week 11 is locked and ready to submit." : "Week 11 review is almost submission-ready."}
                    </h1>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300 md:text-base">
                      {isWeekCompleted
                        ? "The workspace has been reviewed, the unresolved queue is cleared, and the week can be handed off without reopening the raw event stream."
                        : "The workspace is already grouped into meaningful work sessions. The remaining work is concentrated in three review decisions, not a backlog of raw events."}
                    </p>
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/10 bg-white/5 px-4 py-3 text-right shadow-inner shadow-white/5">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Review coverage</p>
                  <p className="mt-2 text-4xl font-semibold tracking-tight text-white">
                    {Math.round(metrics.reviewCoverage * 100)}%
                  </p>
                  <p className="mt-1 text-sm text-slate-400">15 of 18 source events are already resolved</p>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.9fr)]">
                <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(140deg,rgba(14,165,233,0.18),rgba(15,23,42,0.82),rgba(14,165,233,0.06))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-300">Tracked this week</p>
                      <p className="mt-3 text-6xl font-semibold tracking-[-0.04em] text-white">
                        {metrics.totalTrackedHours}
                        <span className="ml-2 text-2xl text-slate-300">h</span>
                      </p>
                      <p className="mt-3 max-w-lg text-sm leading-6 text-slate-300">
                        Billing is anchored by implementation, client planning, and long-form research. Internal work is
                        concentrated into review rituals instead of leaking across the week.
                      </p>
                    </div>

                    <div className="min-w-36 rounded-[24px] border border-white/10 bg-slate-950/40 px-4 py-3 text-right">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Completion</p>
                      <p className="mt-2 text-4xl font-semibold text-white">{Math.round(metrics.weekCompletion * 100)}%</p>
                      <p className="mt-1 text-sm text-slate-400">toward the planned week</p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[24px] border border-emerald-400/20 bg-emerald-400/10 px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-emerald-200/80">Billable</p>
                      <p className="mt-2 text-3xl font-semibold text-white">{formatHours(metrics.billableHours)}</p>
                      <p className="mt-2 text-sm text-emerald-100/80">High-confidence client work dominates the week.</p>
                    </div>
                    <div className="rounded-[24px] border border-slate-400/20 bg-slate-400/10 px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-300/80">Internal</p>
                      <p className="mt-2 text-3xl font-semibold text-white">{formatHours(metrics.internalHours)}</p>
                      <p className="mt-2 text-sm text-slate-200/75">Review and operations are isolated and visible.</p>
                    </div>
                    <div className="rounded-[24px] border border-rose-400/20 bg-rose-400/10 px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-rose-200/80">Missing</p>
                      <p className="mt-2 text-3xl font-semibold text-white">{formatHours(metrics.missingHours)}</p>
                      <p className="mt-2 text-sm text-rose-100/75">Still missing before the week can be closed.</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-2">
                  <div className="rounded-[28px] border border-white/10 bg-white/5 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Unresolved items</p>
                    <p className="mt-2 text-4xl font-semibold text-white">{metrics.unresolvedItems}</p>
                    <p className="mt-2 text-sm text-slate-300">Only the review lane still needs attention.</p>
                  </div>
                  <div className="rounded-[28px] border border-white/10 bg-white/5 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">AI-classified</p>
                    <p className="mt-2 text-4xl font-semibold text-white">{metrics.aiClassifiedItems}</p>
                    <p className="mt-2 text-sm text-slate-300">Tier 1 handled most sessions without human correction.</p>
                  </div>
                  <div className="rounded-[28px] border border-white/10 bg-white/5 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Ollama</p>
                    <div className="mt-3 flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          ollamaState === "online"
                            ? "bg-emerald-400 shadow-[0_0_14px_rgba(74,222,128,0.8)]"
                            : ollamaState === "offline"
                              ? "bg-rose-400 shadow-[0_0_14px_rgba(251,113,133,0.7)]"
                              : "bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.6)]"
                        }`}
                      />
                      <p className="text-xl font-semibold text-white">
                        {ollamaState === "checking"
                          ? "Checking"
                          : ollamaState === "online"
                            ? "Online"
                            : "Offline"}
                      </p>
                    </div>
                    <p className="mt-2 text-sm text-slate-300">Tier 1 health is checked on startup via `/api/tags`.</p>
                  </div>
                  <div className="rounded-[28px] border border-white/10 bg-white/5 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Week status</p>
                    <p className="mt-2 text-2xl font-semibold text-white">
                      {isWeekCompleted ? "Completed" : completionGate ? "Ready to submit" : "Needs review"}
                    </p>
                    <p className="mt-2 text-sm text-slate-300">
                      {isWeekCompleted
                        ? "This week has already been marked as complete."
                        : completionGate
                        ? "Every missing or uncertain block has been resolved."
                        : "Resolve the right rail, then the week is safe to complete."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </article>

          <article className="rounded-[32px] border border-white/10 bg-slate-950/80 p-5 shadow-[0_24px_80px_-36px_rgba(0,0,0,0.9)] backdrop-blur xl:p-6">
            <div className="flex h-full flex-col gap-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Command posture</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">One view for the whole week</h2>
                </div>
                <button
                  type="button"
                  onClick={handleCompleteReview}
                  disabled={!completionGate || isWeekCompleted}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:border-white/5 disabled:bg-white/[0.03] disabled:text-slate-500"
                >
                  {isWeekCompleted ? "Week completed" : "Complete review"}
                </button>
              </div>

              <div className="grid flex-1 gap-3 sm:grid-cols-2">
                <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Focus lane</p>
                  <p className="mt-3 text-3xl font-semibold text-white">Chronos</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Product implementation and AI pipeline work are the visual truth this week.
                  </p>
                </div>
                <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Review lane</p>
                  <p className="mt-3 text-3xl font-semibold text-white">{filteredActionItems.length} items</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Pending gaps and uncertain research are isolated in the side rail.
                  </p>
                </div>
                <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-4 sm:col-span-2">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Submission rule</p>
                  <p className="mt-3 text-lg font-medium text-white">
                    {completionGate || isWeekCompleted ? "The week can be completed now." : "No raw events in the main canvas."}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {completionGate || isWeekCompleted
                      ? "The primary action is enabled only when missing hours and unresolved sessions have both been driven to zero."
                      : "The center stage stays clean by showing grouped work sessions only. Detail only appears on demand in the drawer."}
                  </p>
                </div>
              </div>
            </div>
          </article>
        </section>

        <section className="grid flex-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,360px)]">
          <article className="rounded-[32px] border border-white/10 bg-slate-950/75 p-4 shadow-[0_24px_80px_-36px_rgba(0,0,0,0.95)] backdrop-blur sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-4 px-1 pb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Workspace</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Weekly work canvas</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300">
                  Work blocks grouped by session
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300">
                  Click any block for details
                </span>
              </div>
            </div>

            <div className="hidden lg:grid lg:grid-cols-[4.5rem_repeat(5,minmax(0,1fr))] lg:gap-3">
              <div className="relative h-[780px]">
                {timeMarkers.map((time) => (
                  <div
                    key={time}
                    className="absolute left-0 right-3 -translate-y-1/2 text-right text-xs font-medium tracking-[0.18em] text-slate-500"
                    style={{ top: `${((toMinutes(time) - timelineStartHour * 60) / ((timelineEndHour - timelineStartHour) * 60)) * 100}%` }}
                  >
                    {time}
                  </div>
                ))}
              </div>

              {groupedDays.map(({ day, sessions: daySessions }) => (
                <section key={day} className="flex flex-col gap-3">
                  <header className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{dayShortLabels[day]}</p>
                    <p className="mt-1 text-lg font-semibold text-white">{day}</p>
                  </header>

                  <div className="relative h-[780px] rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.82),rgba(2,6,23,0.98))] p-3 shadow-inner shadow-black/30">
                    {timeMarkers.map((time) => (
                      <div
                        key={`${day}-${time}`}
                        className="absolute inset-x-3 border-t border-dashed border-white/6"
                        style={{ top: `${((toMinutes(time) - timelineStartHour * 60) / ((timelineEndHour - timelineStartHour) * 60)) * 100}%` }}
                      />
                    ))}

                    {daySessions.map((session) => {
                      const tone = categoryStyles[session.category];

                      return (
                        <button
                          key={session.id}
                          type="button"
                          onClick={() => setSelectedId(session.id)}
                          className={`absolute inset-x-3 rounded-[24px] border p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-white/30 hover:shadow-[0_26px_40px_-26px_rgba(15,23,42,0.8)] ${
                            tone.block
                          } ${tone.glow} ${selectedId === session.id ? "ring-2 ring-white/30" : ""}`}
                          style={getBlockGeometry(session)}
                        >
                          <div className="flex h-full flex-col justify-between">
                            <div className="space-y-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${tone.badge}`}>
                                  {session.category}
                                </span>
                                <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] font-medium text-slate-200">
                                  {session.source}
                                </span>
                                <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] font-medium text-slate-200">
                                  {session.billable ? "billable" : "internal"}
                                </span>
                              </div>

                              <div>
                                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-300">
                                  {session.project ?? "Needs project"}
                                </p>
                                <h3 className="mt-2 text-lg font-semibold text-white">{session.title}</h3>
                                <p className="mt-2 text-sm leading-6 text-slate-200/80">{session.summary}</p>
                              </div>
                            </div>

                            <div className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-200/80">
                              <span>
                                {session.startedAt} - {session.endedAt}
                              </span>
                              <span>{formatConfidence(session.confidence)}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>

            <div className="grid gap-4 lg:hidden">
              {groupedDays.map(({ day, sessions: daySessions }) => (
                <section key={day} className="rounded-[28px] border border-white/10 bg-white/5 p-4">
                  <header className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{dayShortLabels[day]}</p>
                      <p className="mt-1 text-lg font-semibold text-white">{day}</p>
                    </div>
                    <p className="text-sm text-slate-400">{daySessions.length} blocks</p>
                  </header>

                  <div className="space-y-3">
                    {daySessions.map((session) => {
                      const tone = categoryStyles[session.category];

                      return (
                        <button
                          key={session.id}
                          type="button"
                          onClick={() => setSelectedId(session.id)}
                          className={`w-full rounded-[24px] border p-4 text-left transition hover:border-white/25 ${tone.block} ${
                            selectedId === session.id ? "ring-2 ring-white/30" : ""
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-xs uppercase tracking-[0.22em] text-slate-300">
                                {session.project ?? "Needs project"}
                              </p>
                              <h3 className="mt-2 text-lg font-semibold text-white">{session.title}</h3>
                            </div>
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${tone.badge}`}>
                              {formatHours(getSessionDurationHours(session))}
                            </span>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-slate-200/80">{session.summary}</p>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </article>

          <aside className="rounded-[32px] border border-white/10 bg-slate-950/80 p-4 shadow-[0_24px_80px_-36px_rgba(0,0,0,0.95)] backdrop-blur sm:p-5">
            <div className="flex h-full flex-col gap-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Actions</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Review lane</h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const firstItem = filteredActionItems[0];
                    if (firstItem) {
                      setSelectedId(firstItem.id);
                    }
                  }}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  Open first
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: "all", label: "All" },
                  { key: "pending", label: "Pending" },
                  { key: "low-confidence", label: "Low conf." },
                ].map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => {
                      startTransition(() => {
                        setQueueFilter(option.key as typeof queueFilter);
                      });
                    }}
                    className={`rounded-2xl px-3 py-2 text-sm font-medium transition ${
                      queueFilter === option.key
                        ? "bg-white text-slate-950"
                        : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Queue snapshot</p>
                <p className="mt-2 text-3xl font-semibold text-white">{filteredActionItems.length}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Everything unresolved is isolated here so the workspace can stay pristine and legible.
                </p>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {filteredActionItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full rounded-[24px] border border-white/10 bg-white/5 p-4 text-left transition hover:-translate-y-0.5 hover:border-white/20 ${
                      selectedId === item.id ? "ring-2 ring-white/30" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{item.day}</p>
                        <h3 className="mt-2 text-base font-semibold text-white">{item.title}</h3>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${priorityStyles[item.priority]}`}>
                        {item.priority}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-300">{item.subtitle}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
                      <span>{formatHours(item.durationHours)}</span>
                      <span>{formatConfidence(item.confidence)}</span>
                      <span>{item.source}</span>
                    </div>
                  </button>
                ))}

                {filteredActionItems.length === 0 ? (
                  <div className="rounded-[24px] border border-emerald-400/20 bg-emerald-500/10 p-4">
                    <p className="text-sm font-medium text-emerald-200">Nothing left in this filter.</p>
                    <p className="mt-2 text-sm leading-6 text-emerald-100/80">
                      The remaining sessions are already strong enough to complete the week.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </aside>
        </section>
      </main>

      {/* On-demand details keep the main workspace clean and decision-focused. */}
      <button
        type="button"
        aria-label="Close details"
        onClick={() => setSelectedId(null)}
        className={`fixed inset-0 z-40 bg-black/40 transition ${
          selectedSession ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-[460px] transform border-l border-white/10 bg-slate-950/95 p-5 shadow-[-18px_0_50px_rgba(0,0,0,0.5)] backdrop-blur transition duration-300 sm:p-6 ${
          selectedSession ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {selectedSession ? (
          <div className="flex h-full flex-col gap-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Details</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">{selectedSession.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">{selectedSession.summary}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Close
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Project</p>
                <p className="mt-2 text-lg font-semibold text-white">{selectedSession.project ?? "Needs project"}</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Duration</p>
                <p className="mt-2 text-lg font-semibold text-white">{formatHours(getSessionDurationHours(selectedSession))}</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Classification source</p>
                <p className="mt-2 text-lg font-semibold text-white">{selectedSession.source}</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Confidence</p>
                <p className="mt-2 text-lg font-semibold text-white">{formatConfidence(selectedSession.confidence)}</p>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
              <div className="flex flex-wrap gap-2">
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${categoryStyles[selectedSession.category].badge}`}>
                  {selectedSession.category}
                </span>
                <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] font-medium text-slate-200">
                  {selectedSession.billable ? "Billable" : "Non-billable"}
                </span>
                <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] font-medium text-slate-200">
                  {selectedSession.pending ? "Needs review" : "Ready"}
                </span>
              </div>

              <div className="mt-4 space-y-2">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Task description</p>
                <p className="text-sm leading-6 text-slate-200">{selectedSession.summary}</p>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Explain with Ollama</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Ask the local model why this session landed on its current classification.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExplain}
                  disabled={isExplaining}
                  className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isExplaining ? "Explaining..." : "Explain"}
                </button>
              </div>

              {explanation ? (
                <p className="mt-4 rounded-[22px] border border-cyan-400/20 bg-cyan-500/10 p-4 text-sm leading-6 text-cyan-50">
                  {explanation}
                </p>
              ) : null}

              {explanationError ? (
                <p className="mt-4 rounded-[22px] border border-rose-400/20 bg-rose-500/10 p-4 text-sm leading-6 text-rose-100">
                  {explanationError}
                </p>
              ) : null}
            </div>

            <div className="flex-1 overflow-y-auto rounded-[28px] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Underlying app and window signals</p>
              <div className="mt-4 space-y-3">
                {selectedSession.events.map((event) => (
                  <div key={event.id} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-white">{event.appName}</p>
                      <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        {event.startedAt} - {event.endedAt}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{event.windowTitle}</p>
                    <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-500">
                      {event.reviewState === "resolved" ? "Resolved" : "Needs review"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
