export interface ThemeTokens {
  bgCanvas: string;
  bgShell: string;
  bgPanel: string;
  bgRaised: string;
  borderDefault: string;
  borderSoft: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accentSlate300: string;
  accentSlate500: string;
  accentSlate600: string;
  accentSlate700: string;
  focusRing: string;
  criticalBg: string;
  criticalBorder: string;
  criticalText: string;
}

export const themeTokens: ThemeTokens = {
  bgCanvas: "#E9E6DE",
  bgShell: "#ECE8E1",
  bgPanel: "#F0ECE5",
  bgRaised: "#F5F2EC",
  borderDefault: "#CFC7BB",
  borderSoft: "#D8D1C6",
  textPrimary: "#2F3434",
  textSecondary: "#666158",
  textMuted: "#8A8376",
  accentSlate300: "#C3CBD5",
  accentSlate500: "#6E7C8C",
  accentSlate600: "#5D6B7A",
  accentSlate700: "#4F5D6C",
  focusRing: "#A8B5C3",
  criticalBg: "#F1E3DE",
  criticalBorder: "#CBAFA4",
  criticalText: "#7D5D55",
};

export const themeTokenSpec = {
  "bg.canvas": themeTokens.bgCanvas,
  "bg.shell": themeTokens.bgShell,
  "bg.panel": themeTokens.bgPanel,
  "bg.raised": themeTokens.bgRaised,
  "border.default": themeTokens.borderDefault,
  "border.soft": themeTokens.borderSoft,
  "text.primary": themeTokens.textPrimary,
  "text.secondary": themeTokens.textSecondary,
  "text.muted": themeTokens.textMuted,
  "accent.slate.300": themeTokens.accentSlate300,
  "accent.slate.500": themeTokens.accentSlate500,
  "accent.slate.600": themeTokens.accentSlate600,
  "accent.slate.700": themeTokens.accentSlate700,
  "focus.ring": themeTokens.focusRing,
} as const;

export const interactiveStateClasses = {
  default:
    "border-[var(--border-default)] bg-[var(--bg-raised)] text-[var(--text-secondary)]",
  hover: "hover:border-[var(--border-soft)] hover:bg-[var(--bg-panel)]",
  active:
    "border-[var(--accent-slate-500)] bg-[var(--accent-slate-300)] text-[var(--accent-slate-700)]",
  focus:
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg-panel)]",
  info: "border-[var(--border-soft)] bg-[var(--accent-slate-300)] text-[var(--accent-slate-700)]",
  critical: "border-[#CBAFA4] bg-[#F1E3DE] text-[#7D5D55]",
} as const;
