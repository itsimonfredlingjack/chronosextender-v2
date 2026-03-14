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
  categorySuccess: string;
  categoryFormal: string;
  categoryFinancial: string;
  categorySummary: string;
  categoryNeutral: string;
  categoryMedia: string;
  surfaceCanvas: string;
  surfaceGlass: string;
  surfaceGlassStrong: string;
  surfaceGlassHover: string;
  borderSubtle: string;
  borderActive: string;
  highlightInner: string;
}

export const themeTokens: ThemeTokens = {
  bgCanvas: "#0B0F14",
  bgApp: "#0F141B",
  bgShell: "rgba(255, 255, 255, 0.03)",
  bgPanel: "rgba(255, 255, 255, 0.045)",
  bgRaised: "rgba(255, 255, 255, 0.075)",
  borderDefault: "rgba(173, 185, 214, 0.14)",
  borderSoft: "rgba(193, 203, 229, 0.22)",
  textPrimary: "#f5f7fb",
  textSecondary: "rgba(223, 230, 245, 0.76)",
  textMuted: "rgba(179, 190, 214, 0.68)",
  
  // Tactical Canvas Canvas / Glass Surfaces
  surfaceCanvas: "#090a0c",
  surfaceGlass: "rgba(18, 20, 26, 0.6)",
  surfaceGlassStrong: "rgba(12, 14, 18, 0.8)",
  surfaceGlassHover: "rgba(30, 34, 42, 0.65)",
  
  // Borders
  borderSubtle: "rgba(255, 255, 255, 0.04)",
  borderActive: "rgba(255, 255, 255, 0.15)",
  highlightInner: "rgba(255, 255, 255, 0.06)",
  
  // Legacy mappings for stability (can be removed if all components updated)
  glassSurface: "rgba(18, 20, 26, 0.6)",
  glassSurfaceStrong: "rgba(12, 14, 18, 0.8)",
  glassBorder: "rgba(255, 255, 255, 0.04)",
  glassBorderBright: "rgba(255, 255, 255, 0.12)",
  
  accentAuroraStart: "#5D71CF",
  accentAuroraEnd: "#7D8DE0",
  accentSlate300: "rgba(93, 113, 207, 0.18)",
  accentSlate500: "#6F84E8",
  accentSlate600: "#95A6F2",
  accentSlate700: "#D9E1FF",
  focusRing: "rgba(111, 132, 232, 0.42)",
  categorySuccess: "#34C759",    // green - verified, receipt
  categoryFormal: "#5D5CE6",     // violet/blue-violet - legal, formal
  categoryFinancial: "#FF375F",  // magenta/red - financial, invoice
  categorySummary: "#FF9F0A",    // orange - summary, meetings
  categoryNeutral: "#8E8E93",    // gray - neutral, analysis
  categoryMedia: "#30B0C7",      // cyan - media, signal
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
  "category.success": themeTokens.categorySuccess,
  "category.formal": themeTokens.categoryFormal,
  "category.financial": themeTokens.categoryFinancial,
  "category.summary": themeTokens.categorySummary,
  "category.neutral": themeTokens.categoryNeutral,
  "category.media": themeTokens.categoryMedia,
  "surface.canvas": themeTokens.surfaceCanvas,
  "surface.glass": themeTokens.surfaceGlass,
  "surface.glass.strong": themeTokens.surfaceGlassStrong,
  "surface.glass.hover": themeTokens.surfaceGlassHover,
  "border.subtle": themeTokens.borderSubtle,
  "focus.ring": themeTokens.focusRing,
} as const;

export const interactiveStateClasses = {
  default:
    "border-[var(--border-subtle)] bg-[var(--surface-glass)] text-[var(--text-secondary)] transition-[background-color,border-color,color,transform,box-shadow,filter] duration-200 ease-out",
  hover:
    "hover:border-[var(--border-active)] hover:bg-[var(--surface-glass-hover)] hover:text-[var(--text-primary)]",
  active:
    "border-[var(--accent-slate-500)]/40 bg-[var(--surface-glass-strong)] text-[var(--text-primary)] shadow-[var(--glass-shadow-soft)]",
  focus:
    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-0",
  info: "border-l-2 border-[var(--category-media)] bg-[var(--surface-glass)] text-[var(--text-primary)]",
  critical: "border-l-2 border-[var(--category-financial)] bg-[var(--surface-glass-strong)] text-[var(--category-financial)]",
} as const;
