export interface AssistantInput {
  sessionId: string;
  summary: string;
  signals: string[];
}

export interface AssistantExplanation {
  rationale: string;
  confidence: number;
  factors: string[];
}

export class AssistantModeError extends Error {
  code: "UNAVAILABLE_MODE";
}

export function explainSessionWithMode(params: {
  mode: string;
  input: AssistantInput;
  fetchImpl?: typeof fetch;
}): Promise<AssistantExplanation>;
