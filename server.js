import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  RESOURCE_MIME_TYPE,
  registerAppResource,
  registerAppTool,
} from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";

import { explainSessionWithMode } from "./electron/assistant-service.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const widgetPath = path.join(__dirname, "public", "todo-widget.html");
const widgetHtml = readFileSync(widgetPath, "utf8");

const seedEvents = [
  {
    id: "evt-001",
    startedAt: "2026-03-02T08:45:00.000Z",
    endedAt: "2026-03-02T11:45:00.000Z",
    appName: "Cursor",
    windowTitle: "Chronos workspace architecture",
    summary: "Implemented workbench composition and review flow",
    projectHint: "Chronos",
    signals: ["workspace", "review", "react", "typescript"],
    source: "ai",
    confidence: 0.93,
    billable: true,
  },
  {
    id: "evt-002",
    startedAt: "2026-03-02T12:15:00.000Z",
    endedAt: "2026-03-02T14:15:00.000Z",
    appName: "Arc",
    windowTitle: "Interaction references",
    summary: "Researched premium desktop interaction language",
    projectHint: "Chronos",
    signals: ["research", "interaction", "product"],
    source: "ai",
    confidence: 0.88,
    billable: true,
  },
  {
    id: "evt-003",
    startedAt: "2026-03-02T14:45:00.000Z",
    endedAt: "2026-03-02T17:45:00.000Z",
    appName: "Figma",
    windowTitle: "Northstar reporting model",
    summary: "Mapped client reporting model to editable sessions",
    projectHint: "Northstar",
    signals: ["client", "modeling", "reporting"],
    source: "rule",
    confidence: 0.87,
    billable: true,
  },
  {
    id: "evt-004",
    startedAt: "2026-03-03T08:30:00.000Z",
    endedAt: "2026-03-03T11:30:00.000Z",
    appName: "Cursor",
    windowTitle: "Grouping pipeline",
    summary: "Built continuity-based event grouping into sessions",
    projectHint: "Chronos",
    signals: ["grouping", "pipeline", "continuity"],
    source: "ai",
    confidence: 0.84,
    billable: true,
  },
  {
    id: "evt-005",
    startedAt: "2026-03-03T12:00:00.000Z",
    endedAt: "2026-03-03T14:00:00.000Z",
    appName: "Linear",
    windowTitle: "Northstar decisions",
    summary: "Aligned unresolved policy with client reporting needs",
    projectHint: "Northstar",
    signals: ["alignment", "client", "policy"],
    source: "ai",
    confidence: 0.79,
    billable: true,
  },
  {
    id: "evt-006",
    startedAt: "2026-03-03T14:20:00.000Z",
    endedAt: "2026-03-03T16:50:00.000Z",
    appName: "Cursor",
    windowTitle: "State transitions",
    summary: "Implemented deterministic pending edited resolved transitions",
    projectHint: "Chronos",
    signals: ["state", "reducer", "workflow"],
    source: "ai",
    confidence: 0.9,
    billable: true,
  },
  {
    id: "evt-007",
    startedAt: "2026-03-04T08:40:00.000Z",
    endedAt: "2026-03-04T11:40:00.000Z",
    appName: "Zoom",
    windowTitle: "Client working session",
    summary: "Reviewed invoice categories and submission expectations",
    projectHint: "Northstar",
    signals: ["meeting", "invoice", "client"],
    source: "rule",
    confidence: 0.9,
    billable: true,
  },
  {
    id: "evt-008",
    startedAt: "2026-03-04T12:10:00.000Z",
    endedAt: "2026-03-04T14:40:00.000Z",
    appName: "Mail",
    windowTitle: "Receipts follow-up",
    summary: "Handled unstructured receipts and confirmations",
    projectHint: null,
    signals: ["receipts", "admin", "email"],
    source: "ai",
    confidence: 0.51,
    billable: false,
  },
  {
    id: "evt-009",
    startedAt: "2026-03-04T15:10:00.000Z",
    endedAt: "2026-03-04T17:10:00.000Z",
    appName: "Cursor",
    windowTitle: "Drawer UX",
    summary: "Polished drawer interactions and keyboard actions",
    projectHint: "Chronos",
    signals: ["drawer", "keyboard", "interaction"],
    source: "ai",
    confidence: 0.91,
    billable: true,
  },
  {
    id: "evt-010",
    startedAt: "2026-03-05T08:50:00.000Z",
    endedAt: "2026-03-05T11:50:00.000Z",
    appName: "Cursor",
    windowTitle: "Renderer integration tests",
    summary: "Wrote queue to drawer integration tests",
    projectHint: "Chronos",
    signals: ["tests", "renderer", "vitest"],
    source: "ai",
    confidence: 0.88,
    billable: true,
  },
  {
    id: "evt-011",
    startedAt: "2026-03-05T12:20:00.000Z",
    endedAt: "2026-03-05T14:50:00.000Z",
    appName: "Arc",
    windowTitle: "Policy references",
    summary: "Investigated policy edge cases for billable confidence",
    projectHint: "Chronos",
    signals: ["policy", "billing", "confidence"],
    source: "ai",
    confidence: 0.82,
    billable: true,
  },
  {
    id: "evt-012",
    startedAt: "2026-03-05T15:20:00.000Z",
    endedAt: "2026-03-05T18:20:00.000Z",
    appName: "Notion",
    windowTitle: "Ops handbook",
    summary: "Prepared internal release checklist and handoff notes",
    projectHint: "Operations",
    signals: ["internal", "ops", "handoff"],
    source: "rule",
    confidence: 0.83,
    billable: false,
  },
  {
    id: "evt-013",
    startedAt: "2026-03-06T08:40:00.000Z",
    endedAt: "2026-03-06T11:40:00.000Z",
    appName: "Cursor",
    windowTitle: "AI adapter seam",
    summary: "Implemented mock and ollama adapter seam",
    projectHint: "Chronos",
    signals: ["ai", "adapter", "ipc"],
    source: "ai",
    confidence: 0.92,
    billable: true,
  },
  {
    id: "evt-014",
    startedAt: "2026-03-06T12:00:00.000Z",
    endedAt: "2026-03-06T13:30:00.000Z",
    appName: "Browser",
    windowTitle: "General research",
    summary: "Investigated edge cases without strong project signal",
    projectHint: null,
    signals: ["research", "unknown", "review"],
    source: "ai",
    confidence: 0.43,
    billable: false,
  },
  {
    id: "evt-015",
    startedAt: "2026-03-06T13:50:00.000Z",
    endedAt: "2026-03-06T15:50:00.000Z",
    appName: "Linear",
    windowTitle: "Northstar handoff",
    summary: "Finalized client handoff and mapped deliverables",
    projectHint: "Northstar",
    signals: ["handoff", "client", "delivery"],
    source: "rule",
    confidence: 0.89,
    billable: true,
  },
  {
    id: "evt-016",
    startedAt: "2026-03-06T16:10:00.000Z",
    endedAt: "2026-03-06T18:40:00.000Z",
    appName: "Cursor",
    windowTitle: "Release hardening",
    summary: "Final quality pass and build verification",
    projectHint: "Chronos",
    signals: ["release", "quality", "verification"],
    source: "ai",
    confidence: 0.9,
    billable: true,
  },
];

const toMs = (value) => new Date(value).getTime();
const clampConfidence = (value) => Math.max(0, Math.min(1, Number(value.toFixed(2))));
const uniqueSignals = (signals) => [...new Set(signals.map((s) => s.trim()).filter(Boolean))];
const minutesToHours = (minutes) => Number((minutes / 60).toFixed(1));
const durationMinutes = (startedAt, endedAt) => Math.max(1, Math.round((toMs(endedAt) - toMs(startedAt)) / 60000));

const isLikelySameSession = (current, event, gapMinutes) => {
  const gap = (toMs(event.startedAt) - toMs(current.endedAt)) / 60000;
  if (gap < 0 || gap > gapMinutes) return false;

  if (current.project && event.projectHint && current.project === event.projectHint) return true;

  const signalOverlap = current.signals.filter((signal) => event.signals.includes(signal)).length;
  return signalOverlap >= 2;
};

const pickReviewState = (event) => {
  if (!event.projectHint) return "pending";
  if (event.confidence >= 0.86) return "resolved";
  return "pending";
};

const formatSessionTitle = (event) => {
  if (event.projectHint) return `${event.projectHint} focus block`;
  return event.summary.split(" ").slice(0, 6).join(" ");
};

const normalizeSession = (session) => ({
  ...session,
  durationMinutes: durationMinutes(session.startedAt, session.endedAt),
  signals: uniqueSignals(session.signals),
});

const mergeEventIntoSession = (session, event) => {
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

const createSessionFromEvent = (event, index) =>
  normalizeSession({
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

const groupSessionsByProject = (sessions) => {
  const buckets = new Map();

  for (const session of sessions) {
    const key = session.project ?? "unassigned";
    const current = buckets.get(key) ?? [];
    current.push(session);
    buckets.set(key, current);
  }

  return [...buckets.entries()]
    .map(([key, grouped]) => {
      const ordered = grouped.slice().sort((left, right) => toMs(left.startedAt) - toMs(right.startedAt));
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
      };
    })
    .sort((left, right) => toMs(left.firstStartedAt) - toMs(right.firstStartedAt));
};

const buildSessionGroups = (events, gapMinutes = 30) => {
  const orderedEvents = events.slice().sort((left, right) => toMs(left.startedAt) - toMs(right.startedAt));
  const sessions = [];

  for (const event of orderedEvents) {
    const current = sessions[sessions.length - 1];

    if (current && isLikelySameSession(current, event, gapMinutes)) {
      sessions[sessions.length - 1] = mergeEventIntoSession(current, event);
      continue;
    }

    sessions.push(createSessionFromEvent(event, sessions.length));
  }

  return groupSessionsByProject(sessions);
};

const flattenSessionGroups = (groups) => groups.flatMap((group) => group.sessions);

const buildReviewQueue = (sessions) => {
  const weight = { critical: 0, high: 1, medium: 2 };

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
        };
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
        };
      }

      return {
        id: `issue-${session.id}`,
        sessionId: session.id,
        title: "Needs confirmation",
        hint: "Confirm billable and narrative details.",
        priority: "medium",
        reason: "needs_confirmation",
        confidence: session.confidence,
      };
    })
    .sort((left, right) => {
      const priorityDelta = weight[left.priority] - weight[right.priority];
      if (priorityDelta !== 0) return priorityDelta;
      return left.confidence - right.confidence;
    });
};

const computeWorkspaceMetrics = (sessions, targetHours = 38) => {
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

const createChronosState = ({ events = seedEvents, targetHours = 38, gapMinutes = 30 } = {}) => {
  const groups = buildSessionGroups(events, gapMinutes);
  const sessions = flattenSessionGroups(groups);

  return {
    gapMinutes,
    targetHours,
    groups,
    sessions,
    reviewQueue: buildReviewQueue(sessions),
    metrics: computeWorkspaceMetrics(sessions, targetHours),
  };
};

let chronosState = createChronosState();

const refreshState = () => {
  chronosState = {
    ...chronosState,
    groups: groupSessionsByProject(chronosState.sessions),
    reviewQueue: buildReviewQueue(chronosState.sessions),
    metrics: computeWorkspaceMetrics(chronosState.sessions, chronosState.targetHours),
  };
};

const findSessionById = (sessionId) => chronosState.sessions.find((session) => session.id === sessionId);

const patchSession = (session, patch) => ({
  ...session,
  project: typeof patch.project === "undefined" ? session.project : patch.project,
  summary: typeof patch.summary === "undefined" ? session.summary : patch.summary,
  billable: typeof patch.billable === "undefined" ? session.billable : patch.billable,
  confidence: typeof patch.confidence === "number" ? clampConfidence(patch.confidence) : session.confidence,
  reviewState: "edited",
});

const applySessionPatch = (sessionId, patch) => {
  chronosState = {
    ...chronosState,
    sessions: chronosState.sessions.map((session) =>
      session.id === sessionId ? patchSession(session, patch) : session,
    ),
  };
  refreshState();
};

const resolveSession = (sessionId) => {
  chronosState = {
    ...chronosState,
    sessions: chronosState.sessions.map((session) =>
      session.id === sessionId ? { ...session, reviewState: "resolved" } : session,
    ),
  };
  refreshState();
};

const buildWorkspacePayload = ({ project, includeResolved = true, limit = 50 } = {}) => {
  let sessions = chronosState.sessions.slice();

  if (project && project.trim()) {
    const query = project.trim().toLowerCase();
    sessions = sessions.filter((session) => (session.project ?? "unassigned").toLowerCase() === query);
  }

  if (!includeResolved) {
    sessions = sessions.filter((session) => session.reviewState !== "resolved");
  }

  sessions = sessions.sort((left, right) => toMs(left.startedAt) - toMs(right.startedAt));

  const cappedSessions = sessions.slice(0, Math.max(1, Math.min(200, limit)));
  const groups = groupSessionsByProject(cappedSessions);
  const reviewQueue = buildReviewQueue(cappedSessions);
  const metrics = computeWorkspaceMetrics(cappedSessions, chronosState.targetHours);
  const projectCatalog = [...new Set(chronosState.sessions.map((s) => s.project).filter(Boolean))].sort();

  return {
    metrics,
    groups,
    sessions: cappedSessions,
    reviewQueue,
    projectCatalog,
    generatedAt: new Date().toISOString(),
    totalSessionsInWorkspace: chronosState.sessions.length,
  };
};

function createChronosServer() {
  const server = new McpServer({ name: "chronosextender-app", version: "0.2.0" });

  const templateUri = "ui://widget/chronos-workspace-v1.html";
  const widgetMeta = {
    ui: {
      prefersBorder: true,
      csp: {
        connectDomains: [],
        resourceDomains: [],
      },
    },
    "openai/widgetDescription":
      "Displays Chronos workspace metrics, grouped sessions, and the unresolved review queue.",
  };

  if (process.env.CHRONOS_WIDGET_DOMAIN) {
    widgetMeta.ui.domain = process.env.CHRONOS_WIDGET_DOMAIN;
  }

  registerAppResource(server, "chronos-workspace-widget", templateUri, {}, async () => ({
    contents: [
      {
        uri: templateUri,
        mimeType: RESOURCE_MIME_TYPE,
        text: widgetHtml,
        _meta: widgetMeta,
      },
    ],
  }));

  registerAppTool(
    server,
    "chronos_get_workspace",
    {
      title: "Get Chronos workspace",
      description:
        "Use this when you need session timelines, grouped workstreams, and submission metrics for Chronos time reporting.",
      inputSchema: {
        project: z.string().min(1).optional(),
        includeResolved: z.boolean().optional(),
        limit: z.number().int().min(1).max(200).optional(),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: true,
      },
      _meta: {
        "openai/toolInvocation/invoking": "Loading workspace...",
        "openai/toolInvocation/invoked": "Workspace ready",
      },
    },
    async (args) => {
      const workspace = buildWorkspacePayload(args ?? {});

      return {
        structuredContent: {
          workspace,
        },
        content: [
          {
            type: "text",
            text: `Workspace snapshot: ${workspace.metrics.totalSessions} sessions, ${workspace.metrics.unresolvedCount} unresolved.`,
          },
        ],
      };
    },
  );

  registerAppTool(
    server,
    "chronos_render_workspace",
    {
      title: "Render Chronos workspace widget",
      description:
        "Use this when you want the Chronos workspace rendered visually. Call chronos_get_workspace first when you need to narrow by project.",
      inputSchema: {
        project: z.string().min(1).optional(),
        includeResolved: z.boolean().optional(),
        limit: z.number().int().min(1).max(200).optional(),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: true,
      },
      _meta: {
        ui: { resourceUri: templateUri },
        "openai/outputTemplate": templateUri,
        "openai/toolInvocation/invoking": "Rendering timeline...",
        "openai/toolInvocation/invoked": "Timeline ready",
      },
    },
    async (args) => {
      const workspace = buildWorkspacePayload(args ?? {});

      return {
        structuredContent: {
          workspace,
        },
        content: [
          {
            type: "text",
            text: `Showing Chronos workspace with ${workspace.reviewQueue.length} review item(s).`,
          },
        ],
      };
    },
  );

  registerAppTool(
    server,
    "chronos_explain_session",
    {
      title: "Explain session classification",
      description:
        "Use this when you need an AI rationale for why a Chronos session was classified the way it was.",
      inputSchema: {
        sessionId: z.string().min(1),
        mode: z.enum(["mock", "ollama"]).optional(),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: true,
      },
      _meta: {
        "openai/toolInvocation/invoking": "Explaining session...",
        "openai/toolInvocation/invoked": "Explanation ready",
      },
    },
    async (args) => {
      const session = findSessionById(args?.sessionId ?? "");
      if (!session) {
        return {
          content: [{ type: "text", text: `Session ${args?.sessionId ?? ""} was not found.` }],
          structuredContent: { found: false },
        };
      }

      const explanation = await explainSessionWithMode({
        mode: args?.mode ?? "mock",
        input: {
          sessionId: session.id,
          summary: session.summary,
          signals: session.signals,
        },
      });

      return {
        structuredContent: {
          found: true,
          sessionId: session.id,
          explanation,
        },
        content: [
          {
            type: "text",
            text: `Confidence ${Math.round(explanation.confidence * 100)}%: ${explanation.rationale}`,
          },
        ],
      };
    },
  );

  registerAppTool(
    server,
    "chronos_update_session",
    {
      title: "Update session details",
      description:
        "Use this when you need to correct a session's project, summary, confidence, or billable status before submission.",
      inputSchema: {
        sessionId: z.string().min(1),
        project: z.string().min(1).nullable().optional(),
        summary: z.string().min(1).optional(),
        confidence: z.number().min(0).max(1).optional(),
        billable: z.boolean().optional(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: true,
      },
      _meta: {
        "openai/toolInvocation/invoking": "Applying edit...",
        "openai/toolInvocation/invoked": "Session updated",
      },
    },
    async (args) => {
      const session = findSessionById(args?.sessionId ?? "");
      if (!session) {
        return {
          content: [{ type: "text", text: `Session ${args?.sessionId ?? ""} was not found.` }],
          structuredContent: { updated: false },
        };
      }

      applySessionPatch(session.id, {
        project: args?.project,
        summary: args?.summary,
        confidence: args?.confidence,
        billable: args?.billable,
      });

      const updated = findSessionById(session.id);

      return {
        structuredContent: {
          updated: true,
          session: updated,
          metrics: chronosState.metrics,
        },
        content: [{ type: "text", text: `Updated ${session.id}.` }],
      };
    },
  );

  registerAppTool(
    server,
    "chronos_resolve_session",
    {
      title: "Resolve session",
      description:
        "Use this when a session has been reviewed and is ready to mark as resolved for final submission.",
      inputSchema: {
        sessionId: z.string().min(1),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: true,
      },
      _meta: {
        "openai/toolInvocation/invoking": "Resolving session...",
        "openai/toolInvocation/invoked": "Session resolved",
      },
    },
    async (args) => {
      const session = findSessionById(args?.sessionId ?? "");
      if (!session) {
        return {
          content: [{ type: "text", text: `Session ${args?.sessionId ?? ""} was not found.` }],
          structuredContent: { resolved: false },
        };
      }

      resolveSession(session.id);

      return {
        structuredContent: {
          resolved: true,
          sessionId: session.id,
          metrics: chronosState.metrics,
          reviewQueue: chronosState.reviewQueue,
        },
        content: [{ type: "text", text: `Resolved ${session.id}.` }],
      };
    },
  );

  return server;
}

const port = Number(process.env.PORT ?? 8787);
const MCP_PATH = "/mcp";

const httpServer = createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400).end("Missing URL");
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "OPTIONS" && url.pathname.startsWith(MCP_PATH)) {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "content-type, mcp-session-id",
      "Access-Control-Expose-Headers": "Mcp-Session-Id",
    });
    res.end();
    return;
  }

  if (req.method === "GET" && url.pathname === "/") {
    res.writeHead(200, { "content-type": "text/plain" }).end("Chronosextender MCP server");
    return;
  }

  const MCP_METHODS = new Set(["POST", "GET", "DELETE"]);
  const isMcpRoute = url.pathname === MCP_PATH || url.pathname.startsWith(`${MCP_PATH}/`);
  if (isMcpRoute && req.method && MCP_METHODS.has(req.method)) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");

    const server = createChronosServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    res.on("close", () => {
      transport.close();
      server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } catch (error) {
      console.error("Error handling MCP request:", error);
      if (!res.headersSent) {
        res.writeHead(500).end("Internal server error");
      }
    }
    return;
  }

  res.writeHead(404).end("Not Found");
});

httpServer.listen(port, () => {
  console.log(`Chronosextender MCP server listening on http://localhost:${port}${MCP_PATH}`);
});
