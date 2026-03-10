import type { ActivityEvent, GroupingOptions, ReviewIssue, SessionGroup, WorkSession } from "./types";

const DEFAULT_GROUPING_OPTIONS: GroupingOptions = {
  gapMinutes: 30,
};

const priorityWeight = {
  critical: 0,
  high: 1,
  medium: 2,
} as const;

const toMs = (value: string) => new Date(value).getTime();

const durationMinutes = (startedAt: string, endedAt: string) => {
  return Math.max(1, Math.round((toMs(endedAt) - toMs(startedAt)) / 60000));
};

const uniqueSignals = (signals: string[]) => {
  return [...new Set(signals.map((signal) => signal.trim()).filter(Boolean))];
};

const isLikelySameSession = (current: WorkSession, event: ActivityEvent, gapMinutes: number) => {
  const gap = (toMs(event.startedAt) - toMs(current.endedAt)) / 60000;

  if (gap < 0 || gap > gapMinutes) {
    return false;
  }

  if (current.project && event.projectHint && current.project === event.projectHint) {
    return true;
  }

  const signalOverlap = current.signals.filter((signal) => event.signals.includes(signal)).length;
  return signalOverlap >= 2;
};

const pickReviewState = (event: ActivityEvent): WorkSession["reviewState"] => {
  if (!event.projectHint) {
    return "pending";
  }

  if (event.confidence >= 0.86) {
    return "resolved";
  }

  return "pending";
};

const formatSessionTitle = (event: ActivityEvent) => {
  if (event.projectHint) {
    return `${event.projectHint} focus block`;
  }

  return event.summary.split(" ").slice(0, 6).join(" ");
};

const normalizeSession = (session: WorkSession): WorkSession => ({
  ...session,
  durationMinutes: durationMinutes(session.startedAt, session.endedAt),
  signals: uniqueSignals(session.signals),
});

const mergeEventIntoSession = (session: WorkSession, event: ActivityEvent): WorkSession => {
  const combinedSignals = uniqueSignals([...session.signals, ...event.signals]);
  const combinedConfidence = Number(((session.confidence + event.confidence) / 2).toFixed(2));

  return normalizeSession({
    ...session,
    endedAt: event.endedAt,
    summary: `${session.summary}; ${event.summary}`,
    signals: combinedSignals,
    confidence: combinedConfidence,
    billable: session.billable || event.billable,
    eventIds: [...session.eventIds, event.id],
    reviewState:
      session.reviewState === "resolved" && pickReviewState(event) === "resolved" ? "resolved" : "pending",
  });
};

const createSessionFromEvent = (event: ActivityEvent, index: number): WorkSession => {
  return normalizeSession({
    id: `session-${index + 1}`,
    title: formatSessionTitle(event),
    summary: event.summary,
    project: event.projectHint,
    startedAt: event.startedAt,
    endedAt: event.endedAt,
    durationMinutes: durationMinutes(event.startedAt, event.endedAt),
    signals: uniqueSignals(event.signals),
    source: event.source,
    confidence: event.confidence,
    billable: event.billable,
    reviewState: pickReviewState(event),
    eventIds: [event.id],
  });
};

export const groupSessionsByProject = (sessions: WorkSession[]): SessionGroup[] => {
  const buckets = new Map<string, WorkSession[]>();

  for (const session of sessions) {
    const key = session.project ?? "unassigned";
    const current = buckets.get(key) ?? [];
    current.push(session);
    buckets.set(key, current);
  }

  return [...buckets.entries()]
    .map(([key, groupedSessions]) => {
      const ordered = groupedSessions.slice().sort((left, right) => toMs(left.startedAt) - toMs(right.startedAt));
      const firstStartedAt = ordered[0]?.startedAt ?? new Date().toISOString();
      const lastEndedAt = ordered[ordered.length - 1]?.endedAt ?? firstStartedAt;
      const totalMinutes = ordered.reduce((sum, session) => sum + session.durationMinutes, 0);
      const project = key === "unassigned" ? null : key;

      return {
        id: `group-${key}`,
        title: project ? `${project} workstream` : "Unassigned review stream",
        project,
        totalMinutes,
        firstStartedAt,
        lastEndedAt,
        sessions: ordered,
      } satisfies SessionGroup;
    })
    .sort((left, right) => toMs(left.firstStartedAt) - toMs(right.firstStartedAt));
};

export const buildSessionGroups = (
  events: ActivityEvent[],
  options: Partial<GroupingOptions> = {},
): SessionGroup[] => {
  const mergedOptions = { ...DEFAULT_GROUPING_OPTIONS, ...options };
  const orderedEvents = events.slice().sort((left, right) => toMs(left.startedAt) - toMs(right.startedAt));
  const sessions: WorkSession[] = [];

  for (const event of orderedEvents) {
    const currentSession = sessions[sessions.length - 1];

    if (currentSession && isLikelySameSession(currentSession, event, mergedOptions.gapMinutes)) {
      sessions[sessions.length - 1] = mergeEventIntoSession(currentSession, event);
      continue;
    }

    sessions.push(createSessionFromEvent(event, sessions.length));
  }

  return groupSessionsByProject(sessions);
};

export const flattenSessionGroups = (groups: SessionGroup[]): WorkSession[] => {
  return groups.flatMap((group) => group.sessions);
};

export const buildReviewQueue = (sessions: WorkSession[]): ReviewIssue[] => {
  return sessions
    .filter((session) => session.reviewState !== "resolved")
    .map((session) => {
      if (!session.project) {
        return {
          id: `issue-${session.id}`,
          sessionId: session.id,
          title: "Project missing",
          hint: "Assign project before submission.",
          priority: "critical",
          reason: "missing_project",
          confidence: session.confidence,
        } satisfies ReviewIssue;
      }

      if (session.confidence < 0.65) {
        return {
          id: `issue-${session.id}`,
          sessionId: session.id,
          title: "Low confidence classification",
          hint: "Review summary and confidence override.",
          priority: "high",
          reason: "low_confidence",
          confidence: session.confidence,
        } satisfies ReviewIssue;
      }

      return {
        id: `issue-${session.id}`,
        sessionId: session.id,
        title: "Needs confirmation",
        hint: "Confirm billable and narrative details.",
        priority: "medium",
        reason: "needs_confirmation",
        confidence: session.confidence,
      } satisfies ReviewIssue;
    })
    .sort((left, right) => {
      const priorityDelta = priorityWeight[left.priority] - priorityWeight[right.priority];

      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      return left.confidence - right.confidence;
    });
};

export const minutesToHours = (minutes: number) => Number((minutes / 60).toFixed(1));
