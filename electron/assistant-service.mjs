const DEFAULT_OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen3.5:4b";

export class AssistantModeError extends Error {
  constructor(mode) {
    super(`Unsupported AI mode: ${mode}`);
    this.name = "AssistantModeError";
    this.code = "UNAVAILABLE_MODE";
  }
}

const clampConfidence = (value) => {
  if (Number.isNaN(value)) {
    return 0.5;
  }

  return Math.max(0, Math.min(1, value));
};

const buildMockExplanation = (input) => {
  const normalizedSignals = input.signals.slice(0, 3);

  return {
    rationale:
      `The session clusters around ${normalizedSignals.join(", ")} and maps to ${input.summary.toLowerCase()}.`,
    confidence: clampConfidence(0.78 + normalizedSignals.length * 0.04),
    factors: [
      "Window title continuity",
      "Signal consistency across apps",
      "Project intent inferred from summary",
    ],
  };
};

const fetchOllamaExplanation = async (input, fetchImpl = fetch) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetchImpl(`${DEFAULT_OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        format: "json",
        messages: [
          {
            role: "system",
            content:
              "You explain AI-assisted time classifications. Respond with JSON {rationale:string, confidence:number, factors:string[]}.",
          },
          {
            role: "user",
            content: JSON.stringify(input),
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`OLLAMA_HTTP_${response.status}`);
    }

    const parsed = await response.json();
    const content = parsed?.message?.content;

    if (typeof content !== "string" || content.trim().length === 0) {
      throw new Error("OLLAMA_EMPTY_RESPONSE");
    }

    const decoded = JSON.parse(content);
    return {
      rationale: String(decoded.rationale ?? "No rationale available."),
      confidence: clampConfidence(Number(decoded.confidence ?? 0.5)),
      factors: Array.isArray(decoded.factors)
        ? decoded.factors.slice(0, 4).map((factor) => String(factor))
        : ["Model response normalization"],
    };
  } finally {
    clearTimeout(timeout);
  }
};

export const explainSessionWithMode = async ({ mode, input, fetchImpl }) => {
  if (mode === "mock") {
    return buildMockExplanation(input);
  }

  if (mode === "ollama") {
    return fetchOllamaExplanation(input, fetchImpl);
  }

  throw new AssistantModeError(mode);
};
