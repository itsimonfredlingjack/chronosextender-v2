# Drawer + Timeline Performance Profiling Guide

This guide standardizes manual profiling for renderer UI changes that affect glass surfaces, drawer motion, or timeline interactions.

## Scope
- Drawer slide-in/out performance
- Timeline hover and label readability behavior
- Review queue interactions while drawer is open

## Environment
- Electron app in dev mode (`npm run dev`)
- macOS target hardware representative of integrated GPU baseline
- No external monitor scaling changes during run

## Procedure
1. Open app with a normal review queue (at least 4 sessions).
2. Start Chrome DevTools Performance profile in renderer process.
3. Perform this sequence three times:
   - Open drawer from review queue
   - Edit one field
   - Close drawer
   - Hover timeline blocks rapidly for 3-5 seconds
4. Stop profile and inspect:
   - FPS drops during drawer animation
   - Long tasks over 50ms
   - Layer/compositing spikes from backdrop filters

## Acceptance Baseline
- Drawer open/close remains visually smooth (no visible hitching).
- No repeated long tasks > 50ms during standard interaction sequence.
- No obvious compositing explosion when focusing search + drawer open.

## Regression Signals
- Frequent frame drops when drawer is opened
- Input lag while timeline hover state updates
- Noticeably degraded performance on integrated GPU machines

If regression signals appear, prioritize reducing layered blur surfaces and nested layout animation before adding new visual effects.
