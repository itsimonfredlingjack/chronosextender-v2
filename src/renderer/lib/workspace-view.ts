import type {
  MatrixSlot,
  ReviewIssue,
  ReviewSummary,
  ReviewSummaryItem,
  WorkSession,
  WorkspacePage,
} from "./types";

const toPriorityScore = (priority: ReviewIssue["priority"]) => {
  if (priority === "critical") {
    return 0;
  }

  if (priority === "high") {
    return 1;
  }

  return 2;
};

export const paginateSessionsIntoWorkspacePages = (
  sessions: WorkSession[],
  pageSize: number,
): WorkspacePage[] => {
  const normalizedPageSize = Math.max(1, pageSize);

  if (sessions.length === 0) {
    return [
      {
        index: 0,
        totalPages: 1,
        sessions: [],
      },
    ];
  }

  const totalPages = Math.ceil(sessions.length / normalizedPageSize);
  const pages: WorkspacePage[] = [];

  for (let index = 0; index < totalPages; index += 1) {
    const start = index * normalizedPageSize;
    const end = start + normalizedPageSize;

    pages.push({
      index,
      totalPages,
      sessions: sessions.slice(start, end),
    });
  }

  return pages;
};

export const buildMatrixSlots = (
  page: WorkspacePage,
  rows: number,
  cols: number,
  focusedSessionId: string | null,
): MatrixSlot[] => {
  const normalizedRows = Math.max(1, rows);
  const normalizedCols = Math.max(1, cols);
  const totalSlots = normalizedRows * normalizedCols;

  return Array.from({ length: totalSlots }, (_, slotIndex) => {
    const row = Math.floor(slotIndex / normalizedCols);
    const col = slotIndex % normalizedCols;
    const session = page.sessions[slotIndex] ?? null;

    return {
      id: session ? `slot-${session.id}` : `slot-empty-${slotIndex}`,
      slotIndex,
      row,
      col,
      session,
      isFocused: Boolean(session && focusedSessionId === session.id),
    } satisfies MatrixSlot;
  });
};

export const buildReviewSummary = (
  reviewQueue: ReviewIssue[],
  maxVisible = 4,
): ReviewSummary => {
  const normalizedMaxVisible = Math.max(1, maxVisible);

  const ordered = reviewQueue
    .slice()
    .sort((left, right) => {
      const priorityDelta = toPriorityScore(left.priority) - toPriorityScore(right.priority);

      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      return left.confidence - right.confidence;
    })
    .map(
      (issue): ReviewSummaryItem => ({
        id: issue.id,
        sessionId: issue.sessionId,
        title: issue.title,
        hint: issue.hint,
        priority: issue.priority,
      }),
    );

  return {
    items: ordered.slice(0, normalizedMaxVisible),
    overflowCount: Math.max(0, ordered.length - normalizedMaxVisible),
    total: ordered.length,
  };
};
