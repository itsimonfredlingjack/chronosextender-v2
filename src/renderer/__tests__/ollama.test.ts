import { describe, expect, it, vi } from "vitest";

import { checkOllamaHealth, classifyEventRealtime, localRules } from "../lib/ollama";

describe("classifyEventRealtime", () => {
  it("short-circuits on a matching local rule", async () => {
    const fetcher = vi.fn();

    const result = await classifyEventRealtime(
      {
        appName: "Linear",
        windowTitle: "Chronos Control Tower",
      },
      fetcher,
    );

    expect(fetcher).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      source: "rule",
      status: "classified",
      category: "communication",
      project: "Chronos",
      billable: false,
      confidence: 1,
    });
  });

  it("marks low-confidence LLM responses as pending review", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      message: {
        content: JSON.stringify({
          project: null,
          category: "browsing",
          task_description: "Soker efter referens",
          confidence: 0.42,
          billable: false,
        }),
      },
    });

    const result = await classifyEventRealtime(
      {
        appName: "Arc",
        windowTitle: "Researching reporting benchmarks",
      },
      fetcher,
      [],
    );

    expect(fetcher).toHaveBeenCalledOnce();
    expect(result.status).toBe("pending");
    expect(result.source).toBe("llm");
    expect(result.pending).toBe(true);
  });
});

describe("localRules", () => {
  it("includes the default product-specific rule coverage for Chronos work", () => {
    expect(localRules.some((rule) => rule.project === "Chronos")).toBe(true);
  });
});

describe("checkOllamaHealth", () => {
  it("falls back to offline when the health request stalls past the timeout", async () => {
    vi.useFakeTimers();

    const fetchImpl = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    });

    const healthPromise = checkOllamaHealth(fetchImpl, 25);

    await vi.advanceTimersByTimeAsync(25);
    await expect(healthPromise).resolves.toBe(false);

    vi.useRealTimers();
  });
});
