# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev           # Start full dev environment (Vite + Electron)
npm run dev:renderer  # Vite dev server only (port 5183)
npm run dev:electron  # Electron only (waits for renderer on port)
npm run apps:dev      # Start MCP/integration server (server.js)
npm test              # Run Vitest suite (single run)
npm run typecheck     # TypeScript type checking (no emit)
npm run build         # Vite production build to dist/
```

Run a single test file:
```bash
npx vitest run src/renderer/__tests__/workspace-reducer.test.ts
```

## Architecture

Electron desktop app for AI-assisted time tracking and session reporting.

**Process split:**
- `electron/` — Main process (Node.js): window management, IPC handlers, Ollama integration
- `src/renderer/` — Renderer process (React 19 + TypeScript + Tailwind CSS + Framer Motion)
- `server.js` — Standalone MCP/integration server (separate from Electron)

**IPC flow:** Renderer calls `window.chronos.*` (exposed by `electron/preload.mjs`) → IPC → `electron/main.mjs` handlers → `electron/assistant-service.mjs` (Ollama or mock)

**Renderer state:** Single `useReducer` with `WorkspaceState` and typed `ResolutionAction` union. Sessions flow through: `ActivityEvent` → `WorkSession` → `SessionGroup` → metrics/review queue.

**Core data types** (all in `src/renderer/lib/types.ts`):
- `ActivityEvent` — raw tracked event
- `WorkSession` — processed session with `ReviewState` ("pending" | "edited" | "resolved")
- `SessionGroup` — project-grouped sessions
- `ReviewIssue` — flagged problems (missing project, low confidence, etc.) with priority levels

## Key Conventions

**AI integration:** `AiMode` is "ollama" | "mock". Confidence scores are 0–1 floats clamped/rounded to 0.01. Set `CHRONOS_AI_MODE=mock` to bypass Ollama in development.

**Theme:** CSS variables via `src/renderer/lib/theme-tokens.ts`. Dark glassmorphism design. Custom scrollbars and animations gated behind `useReducedMotion`.

**Tests:** Vitest + jsdom + Testing Library. All test files in `src/renderer/__tests__/`. Fixtures in `src/renderer/lib/fixtures.ts`.

**Environment variables:**
- `CHRONOS_RENDERER_PORT` — dev server port (default: 5183)
- `CHRONOS_AI_MODE` — "ollama" or "mock"
- `OLLAMA_BASE_URL` — Ollama endpoint (default: http://127.0.0.1:11434)
- `OLLAMA_MODEL` — model to use (default: qwen3.5:4b)
