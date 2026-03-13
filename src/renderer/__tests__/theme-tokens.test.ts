import { describe, expect, it } from "vitest";

import { interactiveStateClasses, themeTokenSpec, themeTokens } from "../lib/theme-tokens";

describe("theme token contract", () => {
  it("matches the agreed dark glassmorphism token values", () => {
    expect(themeTokens.bgCanvas).toBe("#111118");
    expect(themeTokens.bgApp).toBe("#111118");
    expect(themeTokens.bgShell).toBe("rgba(255, 255, 255, 0.05)");
    expect(themeTokens.bgPanel).toBe("rgba(255, 255, 255, 0.06)");
    expect(themeTokens.bgRaised).toBe("rgba(255, 255, 255, 0.10)");
    expect(themeTokens.borderDefault).toBe("rgba(255, 255, 255, 0.16)");
    expect(themeTokens.borderSoft).toBe("rgba(255, 255, 255, 0.24)");
    expect(themeTokens.textPrimary).toBe("#FFFFFF");
    expect(themeTokens.textSecondary).toBe("rgba(236, 240, 255, 0.78)");
    expect(themeTokens.textMuted).toBe("rgba(210, 216, 236, 0.58)");
    expect(themeTokens.glassSurface).toBe("rgba(255, 255, 255, 0.06)");
    expect(themeTokens.glassBorder).toBe("rgba(255, 255, 255, 0.18)");
    expect(themeTokens.accentAuroraStart).toBe("#5856D6");
    expect(themeTokens.accentAuroraEnd).toBe("#AF52DE");
    expect(themeTokens.categoryGreen).toBe("#34C759");
    expect(themeTokens.categoryPinkRed).toBe("#FF375F");
    expect(themeTokens.categoryOrange).toBe("#FF9F0A");
    expect(themeTokens.categoryCyan).toBe("#30B0C7");
    expect(themeTokens.focusRing).toBe("rgba(175, 82, 222, 0.55)");
    expect(themeTokenSpec["accent.slate.500"]).toBe("#5856D6");
    expect(themeTokenSpec["accent.aurora.end"]).toBe("#AF52DE");
    expect(themeTokenSpec["category.green"]).toBe("#34C759");
  });
});

describe("interactive state mapping", () => {
  it("maps default/hover/active/focus/info/critical to dark glass token families", () => {
    expect(interactiveStateClasses.default).toContain("var(--bg-panel)");
    expect(interactiveStateClasses.default).toContain("var(--border-default)");

    expect(interactiveStateClasses.hover).toContain("var(--bg-raised)");
    expect(interactiveStateClasses.hover).toContain("var(--border-soft)");

    expect(interactiveStateClasses.active).toContain("var(--accent-slate-300)");
    expect(interactiveStateClasses.active).toContain("var(--accent-aurora-start)");
    expect(interactiveStateClasses.active).toContain("var(--text-primary)");

    expect(interactiveStateClasses.focus).toContain("var(--focus-ring)");
    expect(interactiveStateClasses.focus).toContain("var(--bg-canvas)");

    expect(interactiveStateClasses.info).toContain("var(--category-cyan)");

    expect(interactiveStateClasses.critical).toContain("var(--critical-bg)");
    expect(interactiveStateClasses.critical).toContain("var(--critical-border)");
  });
});
