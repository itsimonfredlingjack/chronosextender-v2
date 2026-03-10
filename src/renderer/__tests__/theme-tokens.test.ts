import { describe, expect, it } from "vitest";

import { interactiveStateClasses, themeTokenSpec, themeTokens } from "../lib/theme-tokens";

describe("theme token contract", () => {
  it("matches the agreed clinical warm light + slate token values", () => {
    expect(themeTokens.bgCanvas).toBe("#E9E6DE");
    expect(themeTokens.bgShell).toBe("#ECE8E1");
    expect(themeTokens.bgPanel).toBe("#F0ECE5");
    expect(themeTokens.bgRaised).toBe("#F5F2EC");
    expect(themeTokens.borderDefault).toBe("#CFC7BB");
    expect(themeTokens.borderSoft).toBe("#D8D1C6");
    expect(themeTokens.textPrimary).toBe("#2F3434");
    expect(themeTokens.textSecondary).toBe("#666158");
    expect(themeTokens.textMuted).toBe("#8A8376");
    expect(themeTokens.accentSlate300).toBe("#C3CBD5");
    expect(themeTokens.accentSlate500).toBe("#6E7C8C");
    expect(themeTokens.accentSlate600).toBe("#5D6B7A");
    expect(themeTokens.accentSlate700).toBe("#4F5D6C");
    expect(themeTokens.focusRing).toBe("#A8B5C3");
    expect(themeTokenSpec["accent.slate.500"]).toBe("#6E7C8C");
  });
});

describe("interactive state mapping", () => {
  it("maps default/hover/active/focus/info/critical to the agreed token families", () => {
    expect(interactiveStateClasses.default).toContain("var(--bg-raised)");
    expect(interactiveStateClasses.default).toContain("var(--border-default)");

    expect(interactiveStateClasses.hover).toContain("var(--bg-panel)");
    expect(interactiveStateClasses.hover).toContain("var(--border-soft)");

    expect(interactiveStateClasses.active).toContain("var(--accent-slate-300)");
    expect(interactiveStateClasses.active).toContain("var(--accent-slate-500)");
    expect(interactiveStateClasses.active).toContain("var(--accent-slate-700)");

    expect(interactiveStateClasses.focus).toContain("var(--focus-ring)");

    expect(interactiveStateClasses.info).toContain("var(--accent-slate-300)");
    expect(interactiveStateClasses.info).toContain("var(--accent-slate-700)");

    expect(interactiveStateClasses.critical).toContain("#F1E3DE");
    expect(interactiveStateClasses.critical).toContain("#CBAFA4");
  });
});
