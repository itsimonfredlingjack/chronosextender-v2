import { describe, expect, it } from "vitest";

import { getProjectColor } from "../lib/project-colors";

const allowedBackgrounds = new Set([
  "rgba(52, 199, 89, 0.18)",
  "rgba(255, 55, 95, 0.18)",
  "rgba(255, 159, 10, 0.18)",
  "rgba(48, 176, 199, 0.18)",
]);

const allowedTexts = new Set([
  "rgba(52, 199, 89, 0.96)",
  "rgba(255, 55, 95, 0.96)",
  "rgba(255, 159, 10, 0.96)",
  "rgba(48, 176, 199, 0.96)",
]);

const allowedRings = new Set([
  "rgba(52, 199, 89, 0.52)",
  "rgba(255, 55, 95, 0.52)",
  "rgba(255, 159, 10, 0.52)",
  "rgba(48, 176, 199, 0.52)",
]);

describe("project color mapping", () => {
  it("is deterministic for the same project name", () => {
    const first = getProjectColor("Chronos AI");
    const second = getProjectColor("Chronos AI");

    expect(first).toEqual(second);
  });

  it("maps projects only to the four allowed color families", () => {
    const names = [
      "Chronos",
      "Billing Pipeline",
      "Release Notes",
      "Platform Ops",
      "Figma Redesign",
      "Admin Console",
      "Time Sync",
      "Mobile QA",
      "Customer Success",
      "Data Migration",
      "Payments",
      "Contract Review",
      "Legal",
      "Ad-hoc",
      "Runbook",
      "Nightly Build",
    ];

    for (const name of names) {
      const color = getProjectColor(name);
      expect(allowedBackgrounds.has(color.bgLight)).toBe(true);
      expect(allowedTexts.has(color.textDark)).toBe(true);
      expect(allowedRings.has(color.ring)).toBe(true);
    }
  });

  it("returns neutral dark styling for unassigned project values", () => {
    expect(getProjectColor(null)).toEqual({
      bgLight: "rgba(255, 255, 255, 0.08)",
      textDark: "rgba(255, 255, 255, 0.84)",
      ring: "rgba(255, 255, 255, 0.24)",
    });

    expect(getProjectColor("Unassigned")).toEqual({
      bgLight: "rgba(255, 255, 255, 0.08)",
      textDark: "rgba(255, 255, 255, 0.84)",
      ring: "rgba(255, 255, 255, 0.24)",
    });
  });
});
