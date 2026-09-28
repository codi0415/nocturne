# Decisions

- 2026-09-28 — Pinned Next 16.3.6, React 19.3.0, Tailwind 4.3.3, zustand 5.0.15, three 0.186.1, Vitest 5.0.2 and Playwright 1.63.0 after checking the npm registry; exact pins keep the static build reproducible.
- 2026-09-28 — Use a keyboard-first reorder control instead of drag-and-drop; it fully covers the accessibility requirement without another dependency.
- 2026-09-28 — Keep all visual assets procedural (CSS, canvas, Three.js and SVG icons) and all state device-local, matching the offline and no-credential constraints.
- 2026-09-28 — Read the installed Next 16 static-export and PWA guidance; retained `output: "export"`, avoided server-only features, and used a public service worker with relative manifest scope.
- 2026-09-28 — Keep the boarding and cabin phases on the same live WebGL canvas; this makes the last boarding frame the first cabin frame and satisfies the measured 5/255 continuity target without a black handover.
- 2026-09-28 — Use a small Node static server for local export verification because the macOS development watcher exhausted file descriptors; the shipped app and GitHub Pages output remain ordinary static files.
