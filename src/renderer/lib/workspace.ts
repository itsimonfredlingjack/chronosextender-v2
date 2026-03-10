import {
  buildReviewQueue,
  buildSessionGroups,
  flattenSessionGroups,
  groupSessionsByProject,
  minutesToHours,
} from "./grouping";
import type {
  ActivityEvent,
  ResolutionAction,
  SessionGroup,
  WorkspaceMetrics,
  WorkspaceState,
  WorkSession,
} from "./types";

const clampConfidence = (value: number) => Math.max(0, Math.min(1, Number(value.toFixed(2))));

const cloneSession = (session: WorkSession): WorkSession => ({
  ...session,
  signals: [...session.signals],
  eventIds: [...session.eventIds],
});

export const computeWorkspaceMetrics = (
  groups: SessionGroup[],
  targetHours = 38,
): WorkspaceMetrics => {
  const sessions = flattenSessionGroups(groups);
  const trackedMinutes = sessions.reduce((sum, session) => sum + session.durationMinutes, 0);
  const resolvedCount = sessions.filter((session) => session.reviewState === "resolved").length;
  const unresolvedCount = sessions.length - resolvedCount;
  const coverage = sessions.length === 0 ? 1 : Number((resolvedCount / sessions.length).toFixed(2));
  const trackedHours = minutesToHours(trackedMinutes);

  return {
    trackedHours,
    targetHours,
    coverage,
    unresolvedCount,
    resolvedCount,
    totalSessions: sessions.length,
    submitReady: unresolvedCount === 0 && trackedHours >= targetHours,
  };
};

const deriveStateFromSessions = (
  sessions: WorkSession[],
  previous: Pick<WorkspaceState, "selectedIssueId" | "drawerSessionId" | "drawerOpen"> | null,
  targetHours: number,
): WorkspaceState => {
  const groups = groupSessionsByProject(sessions);
  const reviewQueue = buildReviewQueue(sessions);
  const metrics = computeWorkspaceMetrics(groups, targetHours);

  const stillSelected = reviewQueue.some((issue) => issue.id === previous?.selectedIssueId);
  const selectedIssueId = stillSelected ? previous?.selectedIssueId ?? null : (reviewQueue[0]?.id ?? null);

  const drawerSessionStillExists = sessions.some((session) => session.id === previous?.drawerSessionId);

  return {
    groups,
    sessions,
    reviewQueue,
    metrics,
    selectedIssueId,
    drawerSessionId: drawerSessionStillExists ? previous?.drawerSessionId ?? null : null,
    drawerOpen: Boolean(previous?.drawerOpen && drawerSessionStillExists),
  };
};

export const createWorkspaceState = (
  events: ActivityEvent[],
  options: { targetHours?: number; gapMinutes?: number } = {},
): WorkspaceState => {
  const groups = buildSessionGroups(events, { gapMinutes: options.gapMinutes ?? 30 });
  const sessions = flattenSessionGroups(groups);
  const targetHours = options.targetHours ?? 38;

  return deriveStateFromSessions(
    sessions,
    {
      selectedIssueId: null,
      drawerSessionId: null,
      drawerOpen: false,
    },
    targetHours,
  );
};

const patchSession = (
  session: WorkSession,
  patch: Partial<Pick<WorkSession, "project" | "summary" | "billable" | "confidence">>,
): WorkSession => {
  const next = cloneSession(session);

  if (typeof patch.project !== "undefined") {
    next.project = patch.project;
  }

  if (typeof patch.summary !== "undefined") {
    next.summary = patch.summary;
  }

  if (typeof patch.billable !== "undefined") {
    next.billable = patch.billable;
  }

  if (typeof patch.confidence === "number") {
    next.confidence = clampConfidence(patch.confidence);
  }

  if (next.reviewState !== "resolved") {
    next.reviewState = "edited";
  }

  if (next.reviewState === "resolved") {
    next.reviewState = "edited";
  }

  return next;
};

export const applyResolution = (state: WorkspaceState, action: ResolutionAction): WorkspaceState => {
  const targetHours = state.metrics.targetHours;

  if (action.type === "select_issue") {
    return {
      ...state,
      selectedIssueId: action.issueId,
    };
  }

  if (action.type === "open_drawer") {
    if (action.sessionId) {
      return {
        ...state,
        drawerOpen: true,
        drawerSessionId: action.sessionId,
      };
    }

    const selectedIssue = state.reviewQueue.find((issue) => issue.id === state.selectedIssueId);

    return {
      ...state,
      drawerOpen: true,
      drawerSessionId: selectedIssue?.sessionId ?? state.drawerSessionId,
    };
  }

  if (action.type === "close_drawer") {
    return {
      ...state,
      drawerOpen: false,
    };
  }

  if (action.type === "update_session") {
    const nextSessions = state.sessions.map((session) => {
      if (session.id !== action.sessionId) {
        return session;
      }

      return patchSession(session, action.patch);
    });

    return deriveStateFromSessions(nextSessions, state, targetHours);
  }

  if (action.type === "toggle_billable") {
    const nextSessions = state.sessions.map((session) => {
      if (session.id !== action.sessionId) {
        return session;
      }

      return patchSession(session, { billable: !session.billable });
    });

    return deriveStateFromSessions(nextSessions, state, targetHours);
  }

  if (action.type === "set_confidence") {
    const nextSessions = state.sessions.map((session) => {
      if (session.id !== action.sessionId) {
        return session;
      }

      return patchSession(session, { confidence: clampConfidence(action.confidence) });
    });

    return deriveStateFromSessions(nextSessions, state, targetHours);
  }

  if (action.type === "resolve_session") {
    const nextSessions = state.sessions.map((session) => {
      if (session.id !== action.sessionId) {
        return session;
      }

      return {
        ...cloneSession(session),
        reviewState: "resolved" as const,
      };
    });

    return deriveStateFromSessions(nextSessions, state, targetHours);
  }

  return state;
};
