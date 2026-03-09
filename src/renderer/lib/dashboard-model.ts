export type SessionCategory =
  | "coding"
  | "communication"
  | "design"
  | "documentation"
  | "browsing"
  | "meeting"
  | "admin"
  | "entertainment"
  | "unknown";

export type SessionSource = "rule" | "llm";
export type SessionStatus = "classified" | "pending";
export type DayKey = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday";
export type ActionKind = "gap" | "pending" | "low-confidence";
export type ActionPriority = "critical" | "high" | "medium";

export interface ActivityEvent {
  id: string;
  appName: string;
  windowTitle: string;
  startedAt: string;
  endedAt: string;
  reviewState: "resolved" | "needs-review";
}

export interface WorkSession {
  id: string;
  title: string;
  summary: string;
  project: string | null;
  day: DayKey;
  startedAt: string;
  endedAt: string;
  category: SessionCategory;
  source: SessionSource;
  confidence: number;
  billable: boolean;
  status: SessionStatus;
  pending: boolean;
  events: ActivityEvent[];
}

export interface ControlTowerMetrics {
  totalTrackedHours: number;
  billableHours: number;
  internalHours: number;
  missingHours: number;
  unresolvedItems: number;
  aiClassifiedItems: number;
  reviewCoverage: number;
  weekCompletion: number;
}

export interface ActionItem {
  id: string;
  title: string;
  subtitle: string;
  day: DayKey;
  kind: ActionKind;
  priority: ActionPriority;
  confidence: number;
  durationHours: number;
  source: SessionSource;
}

const TARGET_WEEK_HOURS = 39;
const DAY_ORDER: DayKey[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const parseClock = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
};

const roundTo = (value: number, decimals: number) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

export const getSessionDurationHours = (session: Pick<WorkSession, "startedAt" | "endedAt">) => {
  return roundTo((parseClock(session.endedAt) - parseClock(session.startedAt)) / 60, 1);
};

export const groupSessionsByDay = (sessions: WorkSession[]) => {
  return DAY_ORDER.map((day) => ({
    day,
    sessions: sessions
      .filter((session) => session.day === day)
      .sort((left, right) => parseClock(left.startedAt) - parseClock(right.startedAt)),
  }));
};

export const buildActionItems = (sessions: WorkSession[]): ActionItem[] => {
  return sessions
    .filter((session) => session.pending || session.confidence < 0.5)
    .map((session) => {
      const durationHours = getSessionDurationHours(session);

      if (session.pending && session.category === "unknown") {
        return {
          id: session.id,
          title: "Missing work context",
          subtitle: session.summary,
          day: session.day,
          kind: "gap" as const,
          priority: "critical" as const,
          confidence: session.confidence,
          durationHours,
          source: session.source,
        };
      }

      if (session.pending) {
        return {
          id: session.id,
          title: "Pending classification",
          subtitle: session.summary,
          day: session.day,
          kind: "pending" as const,
          priority: "high" as const,
          confidence: session.confidence,
          durationHours,
          source: session.source,
        };
      }

      return {
        id: session.id,
        title: "Low confidence review",
        subtitle: session.summary,
        day: session.day,
        kind: "low-confidence" as const,
        priority: "medium" as const,
        confidence: session.confidence,
        durationHours,
        source: session.source,
      };
    })
    .sort((left, right) => {
      const priorityWeight = { critical: 0, high: 1, medium: 2 };
      return priorityWeight[left.priority] - priorityWeight[right.priority];
    });
};

export const buildControlTowerMetrics = (sessions: WorkSession[]): ControlTowerMetrics => {
  const totalTrackedHours = roundTo(
    sessions.reduce((sum, session) => sum + getSessionDurationHours(session), 0),
    1,
  );

  const billableHours = roundTo(
    sessions.reduce((sum, session) => sum + (session.billable ? getSessionDurationHours(session) : 0), 0),
    1,
  );

  const internalHours = roundTo(
    sessions.reduce((sum, session) => {
      const isInternal = !session.billable && session.status === "classified" && !session.pending;
      return sum + (isInternal ? getSessionDurationHours(session) : 0);
    }, 0),
    1,
  );

  const totalEvents = sessions.reduce((sum, session) => sum + session.events.length, 0);
  const reviewedEvents = sessions.reduce(
    (sum, session) =>
      sum + session.events.filter((event) => event.reviewState === "resolved").length,
    0,
  );

  const unresolvedItems = buildActionItems(sessions).length;
  const missingHours = roundTo(Math.max(0, TARGET_WEEK_HOURS - totalTrackedHours), 1);
  const aiClassifiedItems = sessions.filter(
    (session) => session.source === "llm" && session.status === "classified" && session.confidence >= 0.5,
  ).length;

  return {
    totalTrackedHours,
    billableHours,
    internalHours,
    missingHours,
    unresolvedItems,
    aiClassifiedItems,
    reviewCoverage: roundTo(reviewedEvents / totalEvents, 2),
    weekCompletion: roundTo(totalTrackedHours / TARGET_WEEK_HOURS, 2),
  };
};

export const mockWeekSessions: WorkSession[] = [
  {
    id: "mon-build",
    title: "Renderer architecture spike",
    summary: "Built the Control Tower layout and interaction model.",
    project: "Chronos",
    day: "Monday",
    startedAt: "09:00",
    endedAt: "13:00",
    category: "coding",
    source: "llm",
    confidence: 0.93,
    billable: true,
    status: "classified",
    pending: false,
    events: [
      {
        id: "ev-101",
        appName: "Cursor",
        windowTitle: "ChronosDashboard.tsx - Control tower composition",
        startedAt: "09:00",
        endedAt: "10:10",
        reviewState: "resolved",
      },
      {
        id: "ev-102",
        appName: "Terminal",
        windowTitle: "npm test and renderer checks",
        startedAt: "10:10",
        endedAt: "11:00",
        reviewState: "resolved",
      },
      {
        id: "ev-103",
        appName: "Arc",
        windowTitle: "Linear inspired desktop dashboards",
        startedAt: "11:10",
        endedAt: "13:00",
        reviewState: "resolved",
      },
    ],
  },
  {
    id: "mon-review",
    title: "Internal architecture review",
    summary: "Aligned event grouping rules with weekly review expectations.",
    project: "Platform",
    day: "Monday",
    startedAt: "14:00",
    endedAt: "17:30",
    category: "documentation",
    source: "rule",
    confidence: 1,
    billable: false,
    status: "classified",
    pending: false,
    events: [
      {
        id: "ev-104",
        appName: "Notion",
        windowTitle: "Chronos weekly review model",
        startedAt: "14:00",
        endedAt: "15:40",
        reviewState: "resolved",
      },
      {
        id: "ev-105",
        appName: "Linear",
        windowTitle: "Refine review workflow acceptance criteria",
        startedAt: "15:45",
        endedAt: "17:30",
        reviewState: "resolved",
      },
    ],
  },
  {
    id: "tue-client",
    title: "Client alignment and backlog shaping",
    summary: "Converged on invoice categories and approval gates.",
    project: "Northstar",
    day: "Tuesday",
    startedAt: "09:30",
    endedAt: "14:30",
    category: "meeting",
    source: "llm",
    confidence: 0.88,
    billable: true,
    status: "classified",
    pending: false,
    events: [
      {
        id: "ev-106",
        appName: "Zoom",
        windowTitle: "Northstar sprint planning",
        startedAt: "09:30",
        endedAt: "10:30",
        reviewState: "resolved",
      },
      {
        id: "ev-107",
        appName: "Figma",
        windowTitle: "Northstar dashboard wireframes",
        startedAt: "10:40",
        endedAt: "12:10",
        reviewState: "resolved",
      },
      {
        id: "ev-108",
        appName: "Linear",
        windowTitle: "Northstar review scope and blockers",
        startedAt: "12:20",
        endedAt: "14:30",
        reviewState: "resolved",
      },
    ],
  },
  {
    id: "wed-ship",
    title: "Timeline workspace implementation",
    summary: "Shipped the week canvas and session block hierarchy.",
    project: "Chronos",
    day: "Wednesday",
    startedAt: "08:45",
    endedAt: "13:15",
    category: "coding",
    source: "llm",
    confidence: 0.84,
    billable: true,
    status: "classified",
    pending: false,
    events: [
      {
        id: "ev-109",
        appName: "Cursor",
        windowTitle: "Absolute-positioned week timeline blocks",
        startedAt: "08:45",
        endedAt: "11:20",
        reviewState: "resolved",
      },
      {
        id: "ev-110",
        appName: "Terminal",
        windowTitle: "vitest dashboard-model",
        startedAt: "11:30",
        endedAt: "13:15",
        reviewState: "resolved",
      },
    ],
  },
  {
    id: "wed-gap",
    title: "Untracked handoff gap",
    summary: "A ninety-minute block needs project attribution before submit.",
    project: null,
    day: "Wednesday",
    startedAt: "14:00",
    endedAt: "15:30",
    category: "unknown",
    source: "llm",
    confidence: 0.31,
    billable: false,
    status: "pending",
    pending: true,
    events: [
      {
        id: "ev-111",
        appName: "Finder",
        windowTitle: "Downloads",
        startedAt: "14:00",
        endedAt: "15:30",
        reviewState: "needs-review",
      },
    ],
  },
  {
    id: "thu-infra",
    title: "Ollama classifier integration",
    summary: "Connected local health checks, short-circuit rules, and explain flow.",
    project: "Chronos",
    day: "Thursday",
    startedAt: "09:00",
    endedAt: "13:30",
    category: "coding",
    source: "llm",
    confidence: 0.9,
    billable: true,
    status: "classified",
    pending: false,
    events: [
      {
        id: "ev-112",
        appName: "Cursor",
        windowTitle: "ollama.ts - classifyEventRealtime",
        startedAt: "09:00",
        endedAt: "10:15",
        reviewState: "resolved",
      },
      {
        id: "ev-113",
        appName: "Terminal",
        windowTitle: "npm run typecheck",
        startedAt: "10:20",
        endedAt: "11:10",
        reviewState: "resolved",
      },
      {
        id: "ev-114",
        appName: "Arc",
        windowTitle: "Ollama local API docs",
        startedAt: "11:20",
        endedAt: "13:30",
        reviewState: "resolved",
      },
    ],
  },
  {
    id: "thu-admin",
    title: "Invoice note cleanup",
    summary: "Administrative context still needs a verified non-billable label.",
    project: null,
    day: "Thursday",
    startedAt: "15:00",
    endedAt: "16:00",
    category: "admin",
    source: "llm",
    confidence: 0.38,
    billable: false,
    status: "pending",
    pending: true,
    events: [
      {
        id: "ev-115",
        appName: "Mail",
        windowTitle: "Drafting invoice follow-up",
        startedAt: "15:00",
        endedAt: "16:00",
        reviewState: "needs-review",
      },
    ],
  },
  {
    id: "fri-retro",
    title: "Operations retro and quality pass",
    summary: "Closed the week with internal review and cleanup decisions.",
    project: "Internal Ops",
    day: "Friday",
    startedAt: "09:00",
    endedAt: "13:30",
    category: "communication",
    source: "rule",
    confidence: 1,
    billable: false,
    status: "classified",
    pending: false,
    events: [
      {
        id: "ev-116",
        appName: "Linear",
        windowTitle: "Weekly retro notes",
        startedAt: "09:00",
        endedAt: "11:10",
        reviewState: "resolved",
      },
      {
        id: "ev-117",
        appName: "Notion",
        windowTitle: "Chronos polish checklist",
        startedAt: "11:20",
        endedAt: "13:30",
        reviewState: "resolved",
      },
    ],
  },
  {
    id: "fri-research",
    title: "Benchmarking reporting UX",
    summary: "Model confidence is low on whether this was billable client research.",
    project: "Northstar",
    day: "Friday",
    startedAt: "14:00",
    endedAt: "21:00",
    category: "browsing",
    source: "llm",
    confidence: 0.48,
    billable: true,
    status: "classified",
    pending: false,
    events: [
      {
        id: "ev-118",
        appName: "Arc",
        windowTitle: "Time reporting dashboard inspiration",
        startedAt: "14:00",
        endedAt: "21:00",
        reviewState: "needs-review",
      },
    ],
  },
];
