# Nocturne

Nocturne is a local-first study planner told as a night train journey. Tasks become stations, available study windows become Service Time, and the route changes calmly when the evening changes.

The interface is Korean-first and includes complete English, Japanese, and Simplified Chinese dictionaries. All planning data stays in the browser. There is no backend, account, runtime CDN, analytics service, or API key.

## Run locally

Requirements: Node.js 22 or newer and npm.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The first visit opens onboarding; it does not seed fake tasks.

## Quality checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

The unit suite covers the framework-free planning core, multilingual quick add, journey transitions, rescue planning, learning thresholds, statistics, normalization, and translation completeness. Playwright covers onboarding, routing, the journey ritual, persistence, four locales, 2D fallback, and the mobile/desktop screenshot set in `artifacts/screens/`.

## Static build and sub-path deployment

The normal static export is written to `out/`.

```bash
npm run build
```

For GitHub Pages at `/nocturne`:

```bash
NEXT_PUBLIC_BASE_PATH=/nocturne npm run build
```

Serve the parent of `out/` so the site is reachable at `/nocturne/`, or use the included `.github/workflows/deploy-pages.yml` workflow. It runs lint, type checking, unit tests, and the build before deploying `out/`.

## Architecture

- `src/core/` is pure TypeScript. It has no React or DOM dependencies and receives time through function arguments. Availability, long-term allocation, route chunking, replanning invariants, journey transitions, rescue plans, parsing, learning and statistics live here.
- `src/store/` adapts the pure operations to a localStorage repository. Saved data has a schema version and is normalized during every load and write.
- `src/i18n/` contains typed dictionaries. English defines the source key set and tests require every locale to match it.
- `src/components/` contains the responsive product UI, procedural Canvas/WebGL scenes, synthesized Web Audio, and a feature-detected WebMCP bridge.
- `public/sw.js` provides network-first page handling and cache-first static assets. The manifest and SVG icons make the export installable.

The visual scene starts with a permanent 2D Canvas renderer. WebGL2-capable, motion-enabled browsers upgrade it to a compact Three.js scene; a failure, `?no-webgl=1`, or reduced-motion preference keeps the calm 2D version visible.

## Data safety

Export creates a readable JSON backup. Import normalizes old shapes and shows record counts before replacement. Archive actions preserve history instead of deleting tasks. Reset affects only this browser and asks for confirmation.
