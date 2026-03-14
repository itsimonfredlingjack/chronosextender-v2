# UI Regression Checklist (Renderer PR Gate)

Use this checklist before opening/merging any renderer UI PR.

## 1) Visual Structure
- Header renders with expected glass surface and no overlap with AskChronos bar.
- Timeline panel, matrix panel, focus panel, and drawer render with expected hierarchy.
- CTA hierarchy remains clear: one primary action per context.

## 2) Design Token Compliance
- No hardcoded hex colors in `src/renderer/components/**/*.tsx`.
- Colors in component layer use CSS vars from token system.
- State styles (warning/info/success/critical) use semantic tokens, not one-off values.

## 3) Interaction and Motion
- Drawer open/close animation is smooth and does not stutter.
- Review queue list interactions still feel responsive.
- Motion layout props are not nested more than needed.

## 4) Accessibility
- Inputs have accessible names (`aria-label` or visible labels).
- Icon-only buttons include `sr-only` labels.
- Small text remains readable on dark surfaces.
- Keyboard flow works for core controls (search, review selection, drawer actions).

## 5) Automated Verification
- Run: `npm run typecheck`
- Run: `npm test`
- Confirm snapshot/contract tests pass:
  - `ui-regression-snapshots.test.tsx`
  - `design-token-guard.test.ts`
