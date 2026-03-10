import type { AiExplanation, AiExplanationInput, RuntimeInfo } from "./types";

export interface ChronosRuntimeBridge {
  getRuntimeInfo: () => Promise<RuntimeInfo>;
  explainSession: (input: AiExplanationInput) => Promise<AiExplanation>;
}

const detectPlatform = () => {
  if (typeof navigator === "undefined") {
    return "unknown";
  }

  const platform = navigator.platform.toLowerCase();

  if (platform.includes("mac")) {
    return "darwin";
  }

  if (platform.includes("win")) {
    return "win32";
  }

  if (platform.includes("linux")) {
    return "linux";
  }

  return "unknown";
};

export const fallbackRuntimeBridge: ChronosRuntimeBridge = {
  getRuntimeInfo: async () => ({
    platform: detectPlatform(),
    appVersion: "dev",
    aiMode: "mock",
  }),
  explainSession: async (input) => ({
    rationale: `Fallback explanation for ${input.summary.toLowerCase()}.`,
    confidence: 0.62,
    factors: ["Fallback runtime bridge"],
  }),
};

export const getChronosRuntimeBridge = (): ChronosRuntimeBridge => {
  if (typeof window === "undefined") {
    return fallbackRuntimeBridge;
  }

  return window.chronos ?? fallbackRuntimeBridge;
};
