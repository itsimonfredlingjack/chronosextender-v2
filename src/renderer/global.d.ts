import type { ChronosRuntimeBridge } from "./lib/runtime";

declare global {
  interface Window {
    chronos?: ChronosRuntimeBridge;
  }
}

export {};
