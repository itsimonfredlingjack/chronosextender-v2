export type AiMode = "mock" | "ollama";
export type SessionSource = "rule" | "ai" | "manual";
export type ReviewState = "pending" | "edited" | "resolved";

export interface RuntimeInfo {
  platform: string;
  appVersion: string;
  aiMode: AiMode;
}

export interface AiExplanationInput {
  sessionId: string;
  summary: string;
  signals: string[];
}

export interface AiExplanation {
  rationale: string;
  confidence: number;
  factors: string[];
}

export interface ActivityEvent {
  id: string;
  startedAt: string;
  endedAt: string;
  appName: string;
  windowTitle: string;
  summary: string;
  projectHint: string | null;
  signals: string[];
  source: SessionSource;
  confidence: number;
  billable: boolean;
}

export interface WorkSession {
  id: string;
  title: string;
  summary: string;
  project: string | null;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  signals: string[];
  source: SessionSource;
  confidence: number;
  alternativeProjects?: string[];
  billable: boolean;
  reviewState: ReviewState;
  eventIds: string[];
}

export interface SessionGroup {
  id: string;
  title: string;
  project: string | null;
  totalMinutes: number;
  firstStartedAt: string;
  lastEndedAt: string;
  sessions: WorkSession[];
}

export type ReviewPriority = "critical" | "high" | "medium";
export type ReviewReason = "missing_project" | "low_confidence" | "needs_confirmation";

export interface ReviewIssue {
  id: string;
  sessionId: string;
  title: string;
  hint: string;
  priority: ReviewPriority;
  reason: ReviewReason;
  confidence: number;
}

export interface WorkspacePage {
  index: number;
  totalPages: number;
  sessions: WorkSession[];
}

export interface MatrixSlot {
  id: string;
  slotIndex: number;
  row: number;
  col: number;
  session: WorkSession | null;
  isFocused: boolean;
}

export interface ReviewSummaryItem {
  id: string;
  sessionId: string;
  title: string;
  hint: string;
  priority: ReviewPriority;
}

export interface ReviewSummary {
  items: ReviewSummaryItem[];
  overflowCount: number;
  total: number;
}

export interface WorkspaceMetrics {
  trackedHours: number;
  targetHours: number;
  coverage: number;
  unresolvedCount: number;
  resolvedCount: number;
  totalSessions: number;
  submitReady: boolean;
}

export interface WorkspaceState {
  groups: SessionGroup[];
  sessions: WorkSession[];
  reviewQueue: ReviewIssue[];
  metrics: WorkspaceMetrics;
  selectedIssueId: string | null;
  drawerSessionId: string | null;
  drawerOpen: boolean;
}

export type ResolutionAction =
  | { type: "select_issue"; issueId: string | null }
  | { type: "open_drawer"; sessionId?: string }
  | { type: "close_drawer" }
  | {
      type: "update_session";
      sessionId: string;
      patch: Partial<Pick<WorkSession, "project" | "summary" | "billable" | "confidence">>;
    }
  | { type: "resolve_session"; sessionId: string }
  | { type: "toggle_billable"; sessionId: string }
  | { type: "set_confidence"; sessionId: string; confidence: number };

export interface GroupingOptions {
  gapMinutes: number;
}
