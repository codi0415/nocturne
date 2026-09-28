# Nocturne milestone progress

- [x] M0 Scaffold — verified `npm run lint`, strict `npm run typecheck`, and a Next 16 static export with the Pages workflow and `/nocturne` base path.
- [x] M1 Core model plus availability, allocate, route and planner — verified in the 281-test Vitest run.
- [x] M2 Journey state machine, ops, route diff, arrival, stats and station names — verified transition and invariant coverage in Vitest.
- [x] M3 Local repository plus Tasks, Service, Route and Lines — verified persistence and route interactions in Chromium.
- [x] M4 Tonight 2D platform, board, forecast and rescue — verified the onboarding/quick-add board flow and conflict core tests.
- [x] M5 Journey ritual, cabin controls, stops, final ticket, wallet and stats — verified the complete journey Playwright flow.
- [x] M6 Four-language quick add, Feel and learning — verified 44 multilingual parser phrases and learning thresholds.
- [x] M7 Complete ko/en/ja/zh dictionaries, onboarding, settings, glossary and PWA — verified every typed key, manifest and service-worker registration.
- [x] M8 Responsive desktop/mobile layout — reviewed all ten PNGs in `artifacts/screens/` at 390×844 and 1440×900 and corrected the mobile coach overlap.
- [x] M9 Web Audio ambience and effects — verified synthesized carriage ambience and gesture-started effects in the journey flow.
- [x] M10 Three.js platform with fallback and debug overlay — verified WebGL Chromium rendering plus `?no-webgl=1` fallback without console errors.
- [x] M11 Cabin, outside lights, rain/tunnel and reduced-motion frame — verified cabin/tunnel renders and reduced-motion static fallback.
- [x] M12 Boarding, ticket tap and no-black-gap handover — verified direct WebGL framebuffer pixel comparison at the same viewport stays at or below 5/255 while the same canvas remains live.
- [x] M13 Final QA and README — `npm run lint && npm run typecheck && npm test && npm run build` passed; 9 Playwright flows passed and the final `/nocturne` export passed a separate static-host smoke test.
- [ ] M14 (stretch, only if everything above is ticked) A share-a-ticket image export (canvas → PNG); a weekly review page; keyboard shortcuts on desktop.
