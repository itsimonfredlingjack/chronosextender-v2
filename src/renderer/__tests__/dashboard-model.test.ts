import { describe, expect, it } from "vitest";

import { buildActionItems, buildControlTowerMetrics, mockWeekSessions } from "../lib/dashboard-model";

describe("buildControlTowerMetrics", () => {
  it("summarizes the weekly dashboard metrics from grouped work sessions", () => {
    const metrics = buildControlTowerMetrics(mockWeekSessions);

    expect(metrics.totalTrackedHours).toBeCloseTo(35.5, 1);
    expect(metrics.billableHours).toBeCloseTo(25, 1);
    expect(metrics.internalHours).toBeCloseTo(8, 1);
    expect(metrics.missingHours).toBeCloseTo(3.5, 1);
    expect(metrics.unresolvedItems).toBe(3);
    expect(metrics.aiClassifiedItems).toBe(4);
    expect(metrics.reviewCoverage).toBe(0.83);
  });
});

describe("buildActionItems", () => {
  it("prioritizes pending and low-confidence sessions for fast review", () => {
    const actionItems = buildActionItems(mockWeekSessions);

    expect(actionItems.map((item) => item.id)).toEqual(["wed-gap", "thu-admin", "fri-research"]);
    expect(actionItems[0]?.priority).toBe("critical");
    expect(actionItems[1]?.kind).toBe("pending");
    expect(actionItems[2]?.kind).toBe("low-confidence");
  });
});
