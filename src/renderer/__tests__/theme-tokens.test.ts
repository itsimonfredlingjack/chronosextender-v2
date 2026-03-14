import { describe, expect, it } from "vitest";

import { interactiveStateClasses, themeTokenSpec, themeTokens } from "../lib/theme-tokens";

describe("theme token contract", () => {
  it("matches the agreed dark glassmorphism token values", () => {
    expect(themeTokens.bgCanvas).toBe("#0B0F14");
    expect(themeTokens.bgApp).toBe("#0F141B");
    expect(themeTokens.bgShell).toBe("rgba(255, 255, 255, 0.03)");
    expect(themeTokens.bgPanel).toBe("rgba(255, 255, 255, 0.045)");
    expect(themeTokens.bgRaised).toBe("rgba(255, 255, 255, 0.075)");
    expect(themeTokens.borderDefault).toBe("rgba(173, 185, 214, 0.14)");
    expect(themeTokens.borderSoft).toBe("rgba(193, 203, 229, 0.22)");
    expect(themeTokens.textPrimary).toBe("#F5F7FB");
    expect(themeTokens.textSecondary).toBe("rgba(223, 230, 245, 0.76)");
    expect(themeTokens.textMuted).toBe("rgba(179, 190, 214, 0.68)");
    expect(themeTokens.glassSurface).toBe("rgba(17, 24, 39, 0.74)");
    expect(themeTokens.glassBorder).toBe("rgba(169, 181, 211, 0.16)");
    expect(themeTokens.accentAuroraStart).toBe("#5D71CF");
    expect(themeTokens.accentAuroraEnd).toBe("#7D8DE0");
    expect(themeTokens.categoryGreen).toBe("#34C759");
    expect(themeTokens.categoryPinkRed).toBe("#FF375F");
    expect(themeTokens.categoryOrange).toBe("#FF9F0A");
    expect(themeTokens.categoryCyan).toBe("#30B0C7");
    expect(themeTokens.focusRing).toBe("rgba(111, 132, 232, 0.42)");
    expect(themeTokens.stateWarningBg).toBe("rgba(255, 159, 10, 0.1)");
    expect(themeTokens.stateWarningBorder).toBe("rgba(255, 159, 10, 0.2)");
    expect(themeTokens.stateWarningText).toBe("#FFD19A");
    expect(themeTokens.stateInfoBg).toBe("rgba(48, 176, 199, 0.12)");
    expect(themeTokens.stateInfoBorder).toBe("rgba(48, 176, 199, 0.35)");
    expect(themeTokens.stateInfoText).toBe("#A9E7F0");
    expect(themeTokens.stateSuccessBg).toBe("rgba(52, 199, 89, 0.1)");
    expect(themeTokens.stateSuccessBorder).toBe("rgba(52, 199, 89, 0.2)");
    expect(themeTokens.stateSuccessText).toBe("#DCFCE7");
    expect(themeTokenSpec["accent.slate.500"]).toBe("#6F84E8");
    expect(themeTokenSpec["accent.aurora.end"]).toBe("#7D8DE0");
    expect(themeTokenSpec["category.green"]).toBe("#34C759");
    expect(themeTokenSpec["state.warning.bg"]).toBe("rgba(255, 159, 10, 0.1)");
    expect(themeTokenSpec["state.info.bg"]).toBe("rgba(48, 176, 199, 0.12)");
    expect(themeTokenSpec["state.success.bg"]).toBe("rgba(52, 199, 89, 0.1)");
  });
});

describe("interactive state mapping", () => {
  it("maps default/hover/active/focus/info/critical to dark glass token families", () => {
    expect(interactiveStateClasses.default).toContain("var(--bg-panel)");
    expect(interactiveStateClasses.default).toContain("var(--border-default)");

    expect(interactiveStateClasses.hover).toContain("var(--bg-raised)");
    expect(interactiveStateClasses.hover).toContain("var(--border-soft)");

    expect(interactiveStateClasses.active).toContain("var(--accent-slate-300)");
    expect(interactiveStateClasses.active).toContain("var(--accent-slate-500)");
    expect(interactiveStateClasses.active).toContain("var(--text-primary)");

    expect(interactiveStateClasses.focus).toContain("var(--focus-ring)");
    expect(interactiveStateClasses.focus).toContain("var(--bg-canvas)");

    expect(interactiveStateClasses.info).toContain("var(--state-info-bg)");
    expect(interactiveStateClasses.info).toContain("var(--state-info-border)");
    expect(interactiveStateClasses.info).toContain("var(--state-info-text)");

    expect(interactiveStateClasses.critical).toContain("var(--critical-bg)");
    expect(interactiveStateClasses.critical).toContain("var(--critical-border)");
    expect(interactiveStateClasses.critical).not.toContain("/80");
  });
});
