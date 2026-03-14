# WCAG Micro Audit (Renderer, Dark Mode)

Short recurring audit for accessibility-sensitive UI updates.

## Focus Areas
- Text contrast on dark surfaces
- Input/button naming for screen readers
- Keyboard access for primary workflows
- Focus visibility on interactive controls

## Checks
1. **Small Text Contrast**
   - Timeline labels and metadata text remain legible.
   - Muted token (`--text-muted`) is not used where it drops readability below acceptable levels.

2. **Accessible Names**
   - Search input has explicit accessible name.
   - Icon-only controls include descriptive `sr-only` text.

3. **Keyboard Flow**
   - Search can be focused from keyboard.
   - Review navigation and drawer actions remain operable by keyboard.

4. **State Communication**
   - Status pills are readable and color usage remains semantically consistent.
   - “Primary” action is visually distinct from secondary/tertiary actions.

## Automated Baseline
- `renderer-integration.test.tsx` for accessible labels and action naming.
- `design-token-guard.test.ts` for component-layer token compliance.

## Manual Baseline
- Validate drawer and timeline behavior in running Electron app.
- Run quick screen reader smoke-check on search input and drawer close action.
