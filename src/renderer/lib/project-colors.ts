/**
 * Utility functions for generating deterministic category colors for projects.
 * Colors are constrained to the four fixed category hues from the design system.
 */

export interface ProjectColor {
  bgLight: string;
  textDark: string;
  ring: string;
}

/**
 * A simple string hashing algorithm (djb2) to convert a string into a number.
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
}

/**
 * Converts a HEX color string to [r, g, b].
 */
function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return [r, g, b];
}

function rgbaFromHex(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const fixedCategoryPalette = ["#34C759", "#FF375F", "#FF9F0A", "#30B0C7"] as const;

function buildProjectColor(hex: string): ProjectColor {
  return {
    bgLight: rgbaFromHex(hex, 0.18),
    textDark: rgbaFromHex(hex, 0.96),
    ring: rgbaFromHex(hex, 0.52),
  };
}

export function getProjectColor(projectName?: string | null): ProjectColor {
  if (!projectName || projectName.toLowerCase() === "unassigned") {
    return {
      bgLight: "rgba(255, 255, 255, 0.08)",
      textDark: "rgba(255, 255, 255, 0.84)",
      ring: "rgba(255, 255, 255, 0.24)",
    };
  }

  const hash = hashString(projectName);
  const colorHex = fixedCategoryPalette[hash % fixedCategoryPalette.length] ?? fixedCategoryPalette[0];

  return buildProjectColor(colorHex);
}
