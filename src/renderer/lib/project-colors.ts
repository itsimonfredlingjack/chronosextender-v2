/**
 * Utility functions for generating consistent, accessible pastel HSL colors
 * based on string inputs (like project names).
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
 * Generates a consistent HSL color badge for a given project name.
 * We fix Saturation at 80% to keep it colorful but controlled,
 * and vary the hue based on the string hash.
 */
export function getProjectColor(projectName?: string | null): ProjectColor {
  if (!projectName || projectName.toLowerCase() === "unassigned") {
    // Return a neutral slate color for unassigned items
    return {
      bgLight: "rgba(110, 124, 140, 0.15)", // Equivalent to bg-[var(--accent-slate-500)]/15
      textDark: "rgba(79, 93, 108, 1)", // Equivalent to text-[var(--accent-slate-700)]
      ring: "rgba(110, 124, 140, 0.25)", // Equivalent to ring-[var(--accent-slate-500)]/25
    };
  }

  // Hash the string to get a consistent Hue (0-360)
  const hash = hashString(projectName);
  const hue = hash % 360;

  return {
    // Soft pastel background
    bgLight: `hsl(${hue}, 80%, 92%)`,
    // Deep, accessible text color on that background
    textDark: `hsl(${hue}, 80%, 25%)`,
    // Subtle matching border ring
    ring: `hsl(${hue}, 80%, 80%)`,
  };
}
