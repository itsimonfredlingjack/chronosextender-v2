export interface ThemeTokens {
  bgCanvas: string;
  bgApp: string;
  bgShell: string;
  bgPanel: string;
  bgRaised: string;
  borderDefault: string;
  borderSoft: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  glassSurface: string;
  glassSurfaceStrong: string;
  glassBorder: string;
  glassBorderBright: string;
  accentAuroraStart: string;
  accentAuroraEnd: string;
  accentSlate300: string;
  accentSlate500: string;
  accentSlate600: string;
  accentSlate700: string;
  focusRing: string;
  categoryGreen: string;
  categoryPinkRed: string;
  categoryOrange: string;
  categoryCyan: string;
  criticalBg: string;
  criticalBorder: string;
  criticalText: string;
}

export const themeTokens: ThemeTokens = {
  bgCanvas: "#111118",
  bgApp: "#111118",
  bgShell: "rgba(255, 255, 255, 0.05)",
  bgPanel: "rgba(255, 255, 255, 0.06)",
  bgRaised: "rgba(255, 255, 255, 0.10)",
  borderDefault: "rgba(255, 255, 255, 0.16)",
  borderSoft: "rgba(255, 255, 255, 0.24)",
  textPrimary: "#FFFFFF",
  textSecondary: "rgba(236, 240, 255, 0.78)",
  textMuted: "rgba(210, 216, 236, 0.58)",
  glassSurface: "rgba(255, 255, 255, 0.06)",
  glassSurfaceStrong: "rgba(255, 255, 255, 0.10)",
  glassBorder: "rgba(255, 255, 255, 0.18)",
  glassBorderBright: "rgba(255, 255, 255, 0.28)",
  accentAuroraStart: "#5856D6",
  accentAuroraEnd: "#AF52DE",
  accentSlate300: "rgba(88, 86, 214, 0.24)",
  accentSlate500: "#5856D6",
  accentSlate600: "#7F61DF",
  accentSlate700: "#D0BBF6",
  focusRing: "rgba(175, 82, 222, 0.55)",
  categoryGreen: "#34C759",
  categoryPinkRed: "#FF375F",
  categoryOrange: "#FF9F0A",
  categoryCyan: "#30B0C7",
  criticalBg: "rgba(255, 55, 95, 0.18)",
  criticalBorder: "rgba(255, 55, 95, 0.55)",
  criticalText: "#FF8CA4",
};

export const themeTokenSpec = {
  "bg.canvas": themeTokens.bgCanvas,
  "bg.app": themeTokens.bgApp,
  "bg.shell": themeTokens.bgShell,
  "bg.panel": themeTokens.bgPanel,
  "bg.raised": themeTokens.bgRaised,
  "border.default": themeTokens.borderDefault,
  "border.soft": themeTokens.borderSoft,
  "text.primary": themeTokens.textPrimary,
  "text.secondary": themeTokens.textSecondary,
  "text.muted": themeTokens.textMuted,
  "glass.surface": themeTokens.glassSurface,
  "glass.surface.strong": themeTokens.glassSurfaceStrong,
  "glass.border": themeTokens.glassBorder,
  "glass.border.bright": themeTokens.glassBorderBright,
  "accent.aurora.start": themeTokens.accentAuroraStart,
  "accent.aurora.end": themeTokens.accentAuroraEnd,
  "accent.slate.300": themeTokens.accentSlate300,
  "accent.slate.500": themeTokens.accentSlate500,
  "accent.slate.600": themeTokens.accentSlate600,
  "accent.slate.700": themeTokens.accentSlate700,
  "category.green": themeTokens.categoryGreen,
  "category.pink-red": themeTokens.categoryPinkRed,
  "category.orange": themeTokens.categoryOrange,
  "category.cyan": themeTokens.categoryCyan,
  "focus.ring": themeTokens.focusRing,
} as const;

export const interactiveStateClasses = {
  default:
    "border-[var(--border-default)] bg-[var(--bg-panel)] text-[var(--text-secondary)]",
  hover: "hover:border-[var(--border-soft)] hover:bg-[var(--bg-raised)]",
  active:
    "border-[var(--accent-aurora-start)] bg-[var(--accent-slate-300)] text-[var(--text-primary)]",
  focus:
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg-canvas)]",
  info: "border-[var(--category-cyan)]/50 bg-[var(--category-cyan)]/15 text-[#9FEAF2]",
  critical: "border-[var(--critical-border)] bg-[var(--critical-bg)] text-[var(--critical-text)]",
} as const;
