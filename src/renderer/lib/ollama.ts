import type { SessionCategory, SessionSource, WorkSession } from "./dashboard-model";

const OLLAMA_BASE_URL = "http://localhost:11434";
const TIER_ONE_MODEL = "qwen3.5:0.8b";
const TIER_TWO_MODEL = "qwen3.5:4b";
const DEFAULT_TIMEOUT_MS = 2_000;

const classifierSystemPrompt = `You are a productivity classifier for a time tracking app. Given a macOS app name and window title, classify the activity and suggest a project.

Respond ONLY with valid JSON in this exact format:
{
  "project": "project name or null if unknown",
  "category": "one of: coding, communication, design, documentation, browsing, meeting, admin, entertainment, unknown",
  "task_description": "brief description of what was being done",
  "confidence": 0.0 to 1.0,
  "billable": true or false
}

Rules:
- confidence < 0.5 means you are unsure - the user will review it
- billable = false for entertainment, personal browsing, admin
- Keep task_description under 10 words`;

export interface ActivitySignal {
  appName: string;
  windowTitle: string;
}

export interface LocalRule {
  id: string;
  pattern: RegExp;
  project: string | null;
  category: SessionCategory;
  taskDescription: string;
  billable: boolean;
}

export interface ClassifiedEvent {
  project: string | null;
  category: SessionCategory;
  taskDescription: string;
  confidence: number;
  billable: boolean;
  source: SessionSource;
  status: "classified" | "pending";
  pending: boolean;
}

interface OllamaChatResponse {
  message?: {
    content?: string;
  };
}

interface OllamaChatRequest {
  model: string;
  format: "json";
  stream: false;
  options: {
    temperature: number;
    num_predict: number;
  };
  messages: Array<{
    role: "system" | "user";
    content: string;
  }>;
  keep_alive?: string | number;
}

export type OllamaFetcher = (payload: OllamaChatRequest) => Promise<OllamaChatResponse>;

export const localRules: LocalRule[] = [
  {
    id: "linear-chronos",
    pattern: /(linear).*(chronos|review|invoice|control tower)|(chronos).*(linear)/i,
    project: "Chronos",
    category: "communication",
    taskDescription: "Planerade Chronos arbete",
    billable: false,
  },
  {
    id: "figma-client",
    pattern: /(figma).*(northstar|client|wireframe|dashboard)/i,
    project: "Northstar",
    category: "design",
    taskDescription: "Formgav kundflode",
    billable: true,
  },
  {
    id: "mail-admin",
    pattern: /(mail|outlook).*(invoice|kvitto|receipts|follow-up)/i,
    project: null,
    category: "admin",
    taskDescription: "Hanterade adminuppgifter",
    billable: false,
  },
];

const fallbackPendingClassification: ClassifiedEvent = {
  project: null,
  category: "unknown",
  taskDescription: "Vantar pa manuell granskning",
  confidence: 0,
  billable: false,
  source: "llm",
  status: "pending",
  pending: true,
};

const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
  fetchImpl: typeof fetch = fetch,
) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetchImpl(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
};

const buildTierOneRequest = ({ appName, windowTitle }: ActivitySignal): OllamaChatRequest => ({
  model: TIER_ONE_MODEL,
  format: "json",
  stream: false,
  options: {
    temperature: 0.1,
    num_predict: 200,
  },
  messages: [
    {
      role: "system",
      content: classifierSystemPrompt,
    },
    {
      role: "user",
      content: `App: "${appName}"\nWindow: "${windowTitle}"`,
    },
  ],
});

export const matchLocalRule = (signal: ActivitySignal, rules = localRules) => {
  const combined = `${signal.appName} ${signal.windowTitle}`;
  return rules.find((rule) => rule.pattern.test(combined)) ?? null;
};

const defaultOllamaFetcher: OllamaFetcher = async (payload) => {
  const response = await fetchWithTimeout(
    `${OLLAMA_BASE_URL}/api/chat`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    DEFAULT_TIMEOUT_MS,
  );

  if (!response.ok) {
    throw new Error(`Ollama returned ${response.status}`);
  }

  return (await response.json()) as OllamaChatResponse;
};

export const classifyEventRealtime = async (
  signal: ActivitySignal,
  fetcher: OllamaFetcher = defaultOllamaFetcher,
  rules = localRules,
) => {
  const rule = matchLocalRule(signal, rules);

  if (rule) {
    return {
      project: rule.project,
      category: rule.category,
      taskDescription: rule.taskDescription,
      confidence: 1,
      billable: rule.billable,
      source: "rule" as const,
      status: "classified" as const,
      pending: false,
    };
  }

  try {
    const response = await fetcher(buildTierOneRequest(signal));
    const content = response.message?.content?.trim();

    if (!content) {
      return fallbackPendingClassification;
    }

    const parsed = JSON.parse(content) as {
      project: string | null;
      category: SessionCategory;
      task_description: string;
      confidence: number;
      billable: boolean;
    };

    return {
      project: parsed.project,
      category: parsed.category,
      taskDescription: parsed.task_description,
      confidence: parsed.confidence,
      billable: parsed.billable,
      source: "llm" as const,
      status: parsed.confidence < 0.5 ? ("pending" as const) : ("classified" as const),
      pending: parsed.confidence < 0.5,
    };
  } catch {
    return fallbackPendingClassification;
  }
};

export const checkOllamaHealth = async (fetchImpl: typeof fetch = fetch, timeoutMs = DEFAULT_TIMEOUT_MS) => {
  try {
    const response = await fetchWithTimeout(`${OLLAMA_BASE_URL}/api/tags`, {}, timeoutMs, fetchImpl);
    return response.ok;
  } catch {
    return false;
  }
};

export const explainEvent = async (session: WorkSession) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS * 2);

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: TIER_ONE_MODEL,
        stream: false,
        messages: [
          {
            role: "system",
            content:
              "Du forklarar klassificeringar i en tidrapporteringsapp. Svara kortfattat pa svenska med fokus pa signalerna som paverkade kategori, projekt och fakturerbarhet.",
          },
          {
            role: "user",
            content: JSON.stringify(
              {
                project: session.project,
                category: session.category,
                confidence: session.confidence,
                billable: session.billable,
                source: session.source,
                pending: session.pending,
                events: session.events.map(({ appName, windowTitle, startedAt, endedAt }) => ({
                  appName,
                  windowTitle,
                  startedAt,
                  endedAt,
                })),
              },
              null,
              2,
            ),
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama returned ${response.status}`);
    }

    const payload = (await response.json()) as OllamaChatResponse;
    return payload.message?.content?.trim() ?? "Ingen forklaring tillganglig just nu.";
  } finally {
    clearTimeout(timeoutId);
  }
};

export const unloadTierOneModel = async () => {
  await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: TIER_ONE_MODEL,
      keep_alive: 0,
    }),
  });
};

export const loadTierTwoModel = async () => {
  await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: TIER_TWO_MODEL,
      keep_alive: "5m",
    }),
  });
};
