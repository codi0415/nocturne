GOAL
Build Nocturne from an empty repository to a finished, polished, deployable web app — a study planner told as a night train journey — with no human input at any point. Work until every item in "Definition of Done" (section 12) is true and verified by commands you ran yourself. Never stop early, never ask questions, never wait for approval.

0. How you work (read every iteration)
First iteration only: save this entire prompt verbatim as SPEC.md at the repo root. Create PROGRESS.md holding the milestone checklist from section 11. Create DECISIONS.md as an empty log.
Every iteration:
Read SPEC.md, PROGRESS.md and DECISIONS.md.
Take the first unchecked item. Implement it completely, then verify it with the quality gates in section 10.
Tick it in PROGRESS.md with a one-line note of how you verified it.
Commit with a clear message.
Continue to the next item.
Never ask. When something is ambiguous, pick the option that best serves the product described here. Record it in DECISIONS.md (one line: decision + reason) and move on.
Never break what works. Before a milestone is ticked, npm run lint && npm run typecheck && npm test && npm run build must all pass. If a change breaks an earlier feature, fix it before going further. Do not delete a working feature to make something else pass.
No credentials, no accounts, no paid services. Everything must run locally and build to static files. If a step would need a key, a login or a remote service, build the local-first version instead and note it in DECISIONS.md.
Blocked? Take the simpler path that still meets the acceptance criteria. Log it and keep going. A missing GPU, font download or network resource is never a reason to stop: there is always a fallback, described below.
Keep the app shippable after every milestone. Order matters: a correct planner and a usable 2D app come before 3D polish.
Record what you learn. If a tool or library version behaves differently from what you expect, read its bundled docs (for example node_modules/next/dist/docs/ if present). Heed deprecations, and write the lesson into DECISIONS.md.
1. The product
Nocturne turns tonight's study plan into a night train ride. Tasks become stations. The evening's available study time is Service Time. The ordered plan for tonight is the route. Breaks are Station Stops. Focusing is riding in the cabin. When reality changes, the route adjusts itself calmly, the way a railway does: a signal change, a delay, a transfer to a later train. It never says "you failed" or "impossible". It always says what happens next and how to still make it.

Tone. Quiet, warm, adult, literary. Night, lamps, rain on glass, paper tickets. No exclamation marks, no gamification, no emojis in the UI, no "AI assistant" voice.

Good: "Route updated. Math problems moves up while you're sharp."
Bad: "Great job! 🎉 Your AI has optimized your schedule!"
Glossary (use these words consistently, and include them in-app on a help sheet):

Term	Meaning
Station	One focus session for a task
Route / Line tonight	Tonight's ordered stations
Service Time	Available study windows
Station Stop	A break between stations
Boarding	Starting tonight's journey
Cabin	The focus screen
Tunnel	Distraction-free deep-focus view
Signal check	Asking the traveller's current energy
Route change	Automatic re-plan, with its explanation
Final station	The end of the night
Ticket	The keepsake issued per journey
Lines	Projects grouping tasks, with an optional target date
Someday	A task with no deadline
Primary language: Korean UI with full English, Japanese and Chinese translations (section 8). The traveller picks the language in onboarding and in settings.

2. Stack and constraints
Framework: Next.js (App Router) with output: "export" (fully static), React 19, TypeScript strict, Tailwind CSS v4, zustand for state.
Pin the exact versions that install cleanly on the day and record them in DECISIONS.md.
If the installed Next major version differs from what you know, read its bundled docs before writing routing code.
3D and tests: three.js for 3D. Vitest for unit tests. Playwright (Chromium) for end-to-end tests and screenshots.
Persistence: local-first in localStorage behind a small repository interface (load, save, subscribe), so a cloud backend could be added later. No backend.
Pure core: everything under src/core is framework-free, pure TypeScript: data in, data out, no React, no DOM, no Date.now() inside (pass now). This is where the planner lives, and it must be heavily tested.
No binary assets.
All textures are drawn procedurally on <canvas>, including normal maps generated from height noise.
All sound is synthesised with the Web Audio API.
Fonts come from npm packages (@fontsource/*), never from a runtime CDN, so the build works offline: Instrument Serif (display), Inter (UI), IBM Plex Mono (numbers and tickets). For CJK, use IBM Plex Sans KR and Noto Serif KR (Korean), IBM Plex Sans JP (Japanese) and Noto Sans SC (Chinese) where packages exist, otherwise system fallbacks.
Static hosting: it must work under a sub-path, e.g. GitHub Pages at /nocturne. Support NEXT_PUBLIC_BASE_PATH and use it for every asset and link. Add .github/workflows/deploy-pages.yml that builds and deploys out/.
PWA: a web manifest, generated icons (drawn in code at build time or as SVG), and a service worker (network-first for pages, cache-first for hashed assets). It must be installable.
Accessibility: every control is keyboard reachable and has an accessible name. prefers-reduced-motion gives a calm static version of every animation and scene. Text contrast is AA.
3. Domain model (src/core/types.ts)
Dates are local YYYY-MM-DD keys (DateKey); instants are ISO strings.

type FocusLevel = "low" | "steady" | "sharp";
type Locale = "en" | "ko" | "ja" | "zh";
type Level = 1 | 2 | 3 | 4 | 5;
type TaskStatus = "inbox" | "active" | "done" | "archived";   // archived = deleted but kept for history
type Recurrence = { freq: "daily" } | { freq: "weekly"; days: number[] };  // 0 = Sunday
type CarriageId = "quiet" | "rain" | "tunnel" | "moon";
type JourneyPhase = "boarding" | "cabin" | "stop" | "paused" | "final";
type SessionStatus = "planned" | "active" | "done" | "partial" | "skipped";
type SessionEnd = "complete" | "early" | "early-all" | "low-focus" | "ended" | "removed" | "skipped" | "unreached";
type ReplanReason = "initial" | "boarding" | "late-start" | "finish-early" | "more-time" | "low-focus"
  | "signal-change" | "skip" | "task-change" | "reorder" | "edit" | "optimize" | "service-resume" | "depart";

interface Profile { id; name; timezone; createdAt; preferredCarriage: CarriageId; autoTunnel: boolean; locale: Locale;
  onboardedAt: string | null; learnFromSessions: boolean; autoAdjustEstimates: boolean; useFocusHistory: boolean;
  shortStops: boolean /* 3/5-minute stops instead of 5/10 */ }

interface Task { id; title; description; deadline: DateKey | null /* null = Someday */; estimatedMinutes;
  userEstimatedMinutes: number | null /* their own number when they accepted a calibrated one */;
  trimmedMinutes?: number /* already trimmed by a rescue plan, so it is never trimmed twice */;
  remainingMinutes; interest: Level; difficulty: Level; importance: Level; splittable: boolean;
  minSessionMinutes; maxSessionMinutes; recurrence: Recurrence | null; status: TaskStatus; lineId: string | null;
  createdAt; updatedAt; completedAt }

interface StudyWindow { id; dayOfWeek: number | null; specificDate: DateKey | null; startTime: "HH:MM"; endTime: "HH:MM";
  recurring: boolean; enabled: boolean; kind: "available" | "blocked" /* blocked = one-off exception removing time */ }

interface StudySession /* a station */ { id; taskId; date: DateKey; sequence; stationName; plannedStart; plannedEnd;
  plannedMinutes /* clock time, grows with "need more time" */; workMinutes /* task work it represents */;
  completedMinutes; creditedMinutes; status: SessionStatus; locked: boolean; actualStart; actualEnd;
  elapsedSeconds; resumedAt /* timer bookkeeping */; focusBefore; focusAfter; endedBy: SessionEnd | null; extendedMinutes }

interface Line { id; title; description; targetDate: DateKey | null; createdAt }

interface Journey { id; date; phase: JourneyPhase; platform; car; seat; plannedMinutes; focusedMinutes; stationsPlanned;
  stationsCompleted; routeChanges; selectedCarriage: CarriageId; plannedDeparture; plannedArrival; startedAt; completedAt;
  stopEndsAt; focus: FocusLevel; focusLog: {at, level}[]; changeLog: RouteChange[] }

interface RouteChange { at; reason: ReplanReason; messages: { key: string; params?: Record<string, string|number> }[] }
interface Ticket { id; journeyId; generatedAt; ticketStyle: CarriageId; serial }
interface NocturneData { profile; tasks; windows; sessions; lines; journeys; tickets }
Also write normalizeData(), which fills fields that older saved data lacks. It must never throw on old data.

Core messages. The core emits only message keys and params, never finished sentences. The UI renders them in the traveller's language. Keep English templates in src/core/messages.ts, for example:

"Something lighter first. {task} is next."
"The other {min} of {task} changes to the {at} train."
4. Core algorithms (src/core, pure, each with tests)
Availability (availability.ts).

Service Time for a date = the windows that apply that day, merged, minus blocked windows.
Fragments under 15 minutes are useless.
Stops are normal (5 minutes after a short station, 10 after a long one) or short (3 and 5).
capacityOf(intervals, stops) is the focus minutes that fit once stops are subtracted.
Validate windows: end after start, no overlaps within the same day.
Long-term allocation (allocate.ts). Decides how many minutes of each task happen on each day, from now until its deadline (horizon 14 days, extended up to 60 when deadlines are further out).

Order: earliest deadline first, ties broken by importance.
Water-fill each task across the days before its deadline, choosing the least-loaded day with a slight bias toward earlier days. The deadline day itself is a buffer, used only when nothing else fits.
Recurring tasks reserve their occurrences first.
Someday tasks only use spare capacity in the coming week.
Check feasibility independently with the cumulative EDF test. A shortfall becomes a Conflict { deadline, requiredMinutes, availableMinutes, shortfallMinutes, taskIds }, never a silently impossible plan.
Option keepTodayPlan: tonight's unlocked planned stations stay fixed (forecast mode).
Tonight's route (route.ts + planner.ts). Turn today's allocation into stations inside Service Time, with stops between them.

Chunking: split work into sessions between minSessionMinutes and maxSessionMinutes. Never leave a crumb under 15 minutes. The session cap shrinks when focus is low.
Ordering: demanding work (high difficulty, low interest) goes early while the traveller is fresh or "sharp", lighter work goes later or first when focus is "low". Keep a mild history nudge (see learning). Deadlines always dominate.
Invariants, tested:
done, partial and skipped stations are never touched;
the active station keeps its place and remaining time;
locked stations never move;
only future, unlocked stations are rebuilt or retimed.
Each replan returns a RouteChange with messages that say what moved and why.
Also produce a per-station diff for the departure board: new, earlier by N min, delayed N min, transfer (continues at another stop tonight), and "changes to another day's train".
Station names are atmosphere: assigned by position from a fixed list: BLUE HOUR, STILLWATER, LANTERN, FERNHILL, SILVER BAY, NORTHLIGHT, CEDAR CROSS, HALCYON, MOONWELL, ASHGROVE, QUIET HARBOR, EMBER, WILLOW, GLASS LAKE, LAST LIGHT, MIDNIGHT The first station reads like a departure, the last like a late arrival. In Korean they display as pure Korean words, e.g. 어스름, 물비늘, 별뉘, 산마루, 윤슬, 샛별, 솔바람, 고요, 달무리, 들꽃, 나루, … . The platform, car and seat numbers are seeded from the date.
Journey state machine (journey.ts).

Phases: boarding → cabin ⇄ stop → … → paused (between service windows) → final.
Transitions (each returns new data plus an optional RouteChange): board(focus, carriage), arrive, finishEarly(stationOnly | wholeTask), needMoreTime(min), lowFocus (something lighter next, a 10-minute stop), pause/resume, depart (end a stop early), extendStop, reassessFocus (signal check), resumeService, endJourney, issueTicket, removeTask, continueService.
settleStale(now): stations whose time passed while the app was closed are closed honestly (unreached).
Important lesson: if the journey is final but Service Time is left and the traveller adds or edits tasks, reopen the journey: clear unreached stations, set the phase back to boarding, and replan. It must never be stuck saying "final station" with work that could still be done tonight.
Arrival forecast (arrival.ts). Per task: the day its last planned piece is done versus its deadline, plus the arithmetic (needed versus available Service Time). The UI answers "if I ride the route, do I make it?".

Rescue plan (rescue.ts) — never just say it won't fit. When there is a conflict, try remedies in order of how little they ask, measuring each by re-running the allocator:

shorter stops;
a little more study time on specific days before the deadline (which day, from when to when; extend an existing evening by at most 90 minutes, add a new day of at most 120 minutes, a total top-up of at most 180 minutes, in 30-minute steps; never past 24:00);
trim at most 25% off less important tasks (never importance 5, never twice);
last resort: move the least important deadlines back, within 7 days.
Return { deadline, shortfall, steps[{kind, gain, details}], left }, and applyRescue(data, steps). One tap applies all steps or a single step. Test that applying the plan actually removes the conflict in typical overbooked cases (for example 22 tasks, 07:00–23:00 service, deadlines today and tomorrow).

Learning (learning.ts). Quiet, and only once there is enough data (for example at least 3 similar tasks or 6 sessions; for focus patterns at least 10 sessions over 5 days). Always weaker than deadlines, workload and importance. Every part can be switched off in settings.

Similarity: subject plus kind of work, read from the title in any of the four languages. "수학 문제집" matches "Math problem set"; "수학 문제집" does not match "수학 개념 정리".
Feel suggestion: interest and difficulty prefilled from similar past tasks.
Estimate calibration: how long similar work really took versus the traveller's own estimate. Offer the adjusted estimate and keep theirs.
Focus profile: the hours when hard work tends to get finished, and when focus fades.
Quick add (quickadd.ts). A rule-based natural-language parser for ko, en, ja and zh. It fills a field only when the wording is clear and marks unclear fields unsure. It reads:

title;
deadline: 오늘/내일/모레/이번 주 금요일/다음 주 월요일/9월 30일/by Friday/tomorrow/明日/明天;
duration: 2시간/90분/1.5h/2 hours/2時間/两个小时;
importance words: 중요/急/important;
recurrence: 매일/매주 월수금/every day;
a line name if it matches an existing line.
Include 40+ test phrases across the four languages.

Stats (stats.ts).

Journey summary: focused minutes, delay, completion rate.
Archive stats: streaks, focus by day over the last 7 days, totals.
ticketFace(): everything printed on a ticket — date, from/to stations, departure/arrival, platform/car/seat, focused time, stations, serial, carriage style.
Ops (ops.ts). Every user action is a pure function: addTask, editTask, finishTask, logTaskProgress, removeTask, reorder, lock, editWindows, applyRescue. Each goes through replan(), so everything plans identically.

5. Screens and flows
Layout.

Mobile, below 1024 px: a bottom tab bar (Tonight, Tasks, Route, Archive, Settings) and a floating quick-add button.
Desktop, 1024 px and up: a left rail navigation (240 px) with a quick-add pill, two-column layouts, and a departure board of up to 8 rows. It must look designed for a Mac-sized window, not a stretched phone.
Welcome / onboarding (first run only): language → name → Service Time (weekly windows, sensible presets such as 19:00–23:00 weekdays) → first two or three tasks via quick add → preferred carriage and sound → done. It can be skipped, and it seeds nothing fake.

Tonight (home) — one scroll-free scene. The station platform at night fills the background (see section 7). On top:

the time the train leaves (flip-board digits);
the next station and task;
a departure board (station, time, task, status: on time / earlier / delayed / new / transfer);
an arrival forecast chip;
the Board button.
States:

No Service Time today: say so and link to Service.
Nothing due: offer Someday work or rest.
Overdue tasks: a gentle prompt.
Conflict: the Rescue plan appears first, with each remedy, its cost and its gain, "apply" per step and "apply all". Below it are the figures (required, available, shortfall) and a manual resolver sheet (deadline +2 days, −30 minutes, move to Someday), which re-plans live.
Journey ended with service left: "N of Service Time left · keep going".
A small coach explains the scene once, dismissible, and is remembered.

Quick add — a text field plus a live preview of the parsed fields (unsure ones highlighted), then a second small sheet, Feel: interest, difficulty and importance as 1–5, prefilled from similar tasks. There is also a manual form. The quick add is reachable from every main screen.

Tasks — grouped by deadline (today, tomorrow, this week, later, Someday) and by line. Rows show the remaining time and the arrival forecast. The task detail page edits everything and shows history, the calibration note and the planned schedule per day. Finishing, logging progress and archiving are available; archived tasks keep history.

Route — tonight's stations on a vertical line. Drag to reorder (dnd-kit or a keyboard alternative), lock or unlock, skip for tonight, "optimize again". Each change shows a signal-change toast with the route-change messages.

Lines — projects with a target date. A line page shows its tasks drawn as a small route map with progress.

Service — the weekly Service Time editor plus one-off exceptions (extra time on a date, blocked time) and validation messages.

Journey (immersive, full screen) — the ritual:

Ticket machine on the platform: signal check (low / steady / sharp), choose a carriage (Quiet, Rain, Tunnel, Moon, each with a sound preview), a ticket prints, and you take it.
Boarding: stand before the car door. Tap the ticket: your hand brings it up to the reader, holds it flat, a beep, the ring and door lamp light at the moment of contact, then the ticket lowers away. A chime, the doors slide into the body, you walk in and sit by the window. Skippable.
Cabin (focus):
the window view (section 7), the station name, a big quiet countdown, the task title;
controls appear on tap and hide after a few seconds: Pause, Finish early (this station / whole task), More time (+10/+15/+25), Low focus, Enter tunnel, End journey;
after about 75 seconds with no input (if auto-tunnel is on and more than 8 minutes remain), the view goes into the tunnel: darker, fewer UI elements;
the station name board passes as you arrive.
Station stop: break countdown, "depart now", extend the stop, signal check, what comes next, and the route-change explanation if anything moved.
Service paused: between service windows.
Final station: the journey summary, the final ticket prints (a paper-feel animation), and the ticket goes to the archive.
Archive — a ticket wallet (every ticket as a paper ticket card; open one to its detail page), statistics (streak, focus by day, focused hours), and focus insights (when you finish hard work, how accurate your estimates are).

Settings — language, name, carriage and sound, auto-tunnel, short stops, learning toggles, data export and import (JSON), reset, "install app" (PWA prompt or instructions), and a glossary and help sheet.

Every screen: empty states written in the product voice. No broken layout from 360 px to 1920 px. Sheets and dialogs are focus-trapped and close on Esc.

6. Visual design system
Colour tokens (Tailwind v4 @theme):

night-950 #04060a, night-900 #070a10, night-850 #0b1017, night-800 #10171f, night-700 #18212a
rule #1f2a30
paper #efe6d3, paper-dim #cdc3ae
mist #8f978f, haze #5b645e
lamp #dcae6a (accent)
moss #2d3d35, beige #c8b796, umber #5a4535
signal #c98a7a (conflict; never alarm red)
Type: display serif (Instrument Serif) for big moments, Inter for the UI, IBM Plex Mono for times, numbers, boards and tickets. Use tabular numerals. Small uppercase eyebrow labels with wide tracking.

Motion: slow and glide-like (cubic-bezier(0.22,1,0.36,1)), rise/fade entrances of 700–900 ms, flip-board digits, a breathing lamp. Nothing bouncy.

Tickets: a real paper ticket — perforated stub, serial, barcode drawn in SVG, carriage-coloured band, slight paper grain.

Carriage palettes:

Carriage	Curtain	Light tint	Stripe
quiet	#4a6152	warm 1, .84, .62	#55786a
rain	#3e5261	cool .74, .84, .98	#4c6a8e
tunnel	#6b4e38	amber 1, .7, .42	#9a6431
moon	#515866	.86, .9, 1	#b69a62
7. Scenes, sound and performance
Build order:

First, a 2D canvas version of every scene: platform, doors, cabin window with passing lights, rain, tunnel, and stations sliding past. This is the permanent fallback for no-WebGL2, failures and reduced motion.
Then the 3D versions with three.js. Any shader or context failure falls back to 2D automatically.
3D platform (Tonight background).

A rainy night station: concrete with a wet, blurred floor reflection (redrawn every other frame), a tactile strip, a roof on posts, fluorescent tubes with haze, lamp posts, a boarded station building, benches, vending machines, posters, a hanging clock showing real time, a name board, track and ballast, poles and wires, distant town lights, and rain streaks lit by nearby lamps.
A slow idle camera breath.
Instance repeated parts (posts, tubes, fence, benches) and keep draws around 120 or fewer.
3D boarding.

A stainless Korean-subway-style car: horizontal pressed ribs, a line-colour band, a car number, a door lamp, a ticket reader, door leaves with windows that slide into the body.
The interior: moquette seats in facing bays, instanced; linen headrest covers; luggage racks; poles; ceiling light strips.
The camera walks in along a CatmullRom path with a smooth, continuous speed profile (ease in, constant, ease out, no discontinuities). The gaze follows its own smooth curve, and a subtle step bob is tied to the distance walked.
It ends seated at the platform-side window.
3D cabin (focus view).

The window as the frame: an aluminium frame, a wall panel, sill, fold-down table and a curtain.
Outside, rendered to a texture that the glass samples, with raindrops shaded on the glass for the rain carriage and a faint cabin reflection: countryside at night, passing lamps and cars (with bodies, not only headlights), towns, the tunnel with lamp sweeps, and platforms when arriving.
The train accelerates and brakes physically. The curtain and camera respond.
The curtain is an analytic drape, not a free cloth simulation.

It is cut at 1.5× the width, so it always keeps folds.
The heading is regular; folds vary in depth and drift further down; the hem flares; deep folds are darker (vertex AO).
It uses a woven procedural texture with stitched hems, sheen, and backlight from the outside texture.
Motion: a damped pendulum lean under acceleration, a tiny sway, and a small damped ripple where the pointer brushes it.
It can be dragged across the window, and drawing it lowers the ambience volume through a lowpass.
Every vertex stays in front of the frame plane, so it never clips.
Seamless boarding → cabin (a hard requirement). The last frame of the walk must be the cabin's first frame.

Share the builders: the platform, the window parts, the cabin lights and the materials, used by both scenes.
Use the same eye height, distance from the glass (0.7 m), FOV rule (62/56/48 by aspect) and window size formula (derived from the viewport).
Use the same post chain: bloom → output → FXAA → a grade pass with vignette and grain.
As you sit, fade the car's lights into the cabin's lights and environment.
Crossfade the two canvases only after the cabin reports it is ready. Verify with a pixel diff of the two frames at the same viewport; the target mean difference is 5/255 or less.
Performance and robustness rules (each learned the hard way):

Only one WebGL scene renders at a time. Keep the previous scene visible until the next one reports "ready" (never a black screen). Prefetch the next scene's code chunk during the preceding step.
"Ready" means renderer.compileAsync has finished for all scenes, every procedural texture is uploaded, and the first frame is drawn. Pre-draw once with everything that only appears later (tunnel, platform, rain) visible, so there is no mid-ride compile stall.
Never place two surfaces in the same plane (for example a door step and the floor). Offset by a few millimetres; z-fighting flickers.
Safari/Apple: half-float render targets without MSAA. Use FXAA when samples === 0. Use the same powerPreference for all scenes, because switching GPUs stalls.
Frame loop: cap at 60 fps. Keep a quality ladder (dpr 1.5 → 1.2 → 1 → no bloom → 30 fps) that drops two steps at once when far too slow. Never rebuild geometry on a quality step. No allocations per frame.
A debug overlay (?debug3d=1) shows GPU info, fps, cpu ms per frame, draw calls and quality step.
Sound (Web Audio, synthesised).

Ambience per carriage:
quiet cabin: soft room tone;
rain: rain on the window, rail clacks;
tunnel: brown noise, low hum;
night rail: distant rhythm.
Effects: ticket print, stamp or beep, chime, doors, station arrival.
A master volume, an effects volume and a mute control. Unlock on the first user gesture.
8. Internationalisation
src/i18n/{en,ko,ja,zh}/<area>.ts with typed keys; English is the source of keys. A missing key falls back to English and is caught by a test that fails on missing keys in ko.
Locale-aware formatting of durations ("1h 30m" / "1시간 30분" / "1時間30分" / "1小时30分钟"), dates, relative days and station names.
Korean copy must read natural, not translated (for example "오늘 밤 운행", "승강장에서", "탑승", "집중 흐림", "시간 더", "일찍 끝내기", "종착역이 다가와요").
The Japanese and Chinese copy must be complete. Check number and unit doubling ("{min}分" when {min} already contains 分).
9. Data safety
Every write goes through the pure ops and is saved atomically to localStorage, with a schema version and normalizeData on load.
Export and import JSON, with validation, from settings. Import never loses data silently: show a preview (counts) before replacing.
Timers survive reloads (elapsedSeconds + resumedAt). Reopening the app mid-station resumes correctly. Stale stations settle honestly.
10. Quality gates (run them; don't claim them)
npm run lint, npm run typecheck, npm test and npm run build are all green.
Unit tests (Vitest), at least 120 in total, including:
availability: merge, subtract, blocked, validation;
allocate: EDF, water-fill, recurring, Someday, conflict detection;
route: chunking, no crumbs, stop insertion, demand ordering, low-focus ordering;
planner invariants: closed, active and locked stations untouched;
every journey transition, including reopen after final and settleStale;
route diff labels;
arrival forecast;
rescue plan: each step type, "never importance 5", "never trim twice", and "applying it clears the conflict" in the 22-task case;
learning thresholds, similarity across languages, calibration;
quick add: 40+ phrases in ko, en, ja and zh;
stats and ticket face;
i18n key completeness;
normalizeData on old shapes.
Playwright e2e (Chromium; launch args --use-gl=swiftshader --enable-webgl --ignore-gpu-blocklist so WebGL works without a GPU):
Onboarding → add three tasks via quick add → Tonight shows the departure board.
Board → ticket machine → boarding (skip) → cabin → finish early → stop → depart → end journey → final ticket → archive shows it.
An overbooked day shows the rescue plan; "apply all" clears the conflict.
Reorder and lock on Route; the replan respects the lock.
Switch language to English, Japanese and Chinese: no missing keys, no layout overflow.
Reload mid-station: the timer resumes.
Viewports 390×844 and 1440×900: take a screenshot of every main screen, save it to artifacts/screens/, and look at each one yourself (open the PNG). Fix anything broken, overlapping or unreadable before ticking.
3D checks: each 3D scene renders without console errors in headless Chromium (swiftshader), the fallback path is exercised by disabling WebGL2 in a test, and the boarding → cabin pixel diff test passes (section 7).
Lighthouse-style sanity: no console errors on any page, and the manifest and service worker register.
11. Milestones (copy into PROGRESS.md; do them in order)
미완료
M0 Scaffold: Next static export, TS strict, Tailwind v4 tokens, fonts via @fontsource, Vitest, Playwright, lint, the Pages workflow, basePath.
미완료
M1 Core model plus availability, allocate, route and planner, with tests.
미완료
M2 Journey state machine, ops, route diff, arrival, stats, station names, with tests.
미완료
M3 Store plus the local repository; the Tasks, Service, Route and Lines screens (2D, functional, polished).
미완료
M4 Tonight scene (2D platform) with departure board, forecast, conflict notice and rescue plan (core + UI + tests).
미완료
M5 Journey ritual in 2D: ticket machine, doors, cabin with controls and tunnel, stops, paused, final ticket; archive wallet and stats.
미완료
M6 Quick add (four languages) plus the Feel sheet; learning (similarity, calibration, focus profile, history nudge) with settings toggles.
미완료
M7 i18n complete in ko, en, ja and zh; onboarding; settings (export/import/reset); glossary; PWA installable.
미완료
M8 Desktop layout pass (rail navigation, two columns) plus a responsive screenshot review at 390 and 1440.
미완료
M9 Web Audio ambience and effects.
미완료
M10 3D platform scene with fallback, performance rules and the debug overlay.
미완료
M11 3D cabin with window, outside world, rain on glass, tunnel and platforms; the curtain; reduced-motion static frame.
미완료
M12 3D boarding walk-in, the ticket-tap motion, and the seamless hand-over (pixel-diff test), with no black gaps.
미완료
M13 Full e2e suite green, a screenshot review of every screen at both sizes, a copy review of the voice in every language, and README (what it is, how to run, how to deploy, the architecture of src/core).
미완료
M14 (stretch, only if everything above is ticked) A share-a-ticket image export (canvas → PNG); a weekly review page; keyboard shortcuts on desktop.
12. Definition of Done
All of the following are true, and each was verified by a command or screenshot you produced:

Every milestone M0–M13 is ticked in PROGRESS.md with verification notes.
npm run lint && npm run typecheck && npm test && npm run build pass, with 120 or more unit tests.
The Playwright suite in section 10 passes, and the screenshots exist in artifacts/screens/ for both viewports.
The static out/ build works when served under /nocturne (serve it, and run the e2e smoke test against it).
No console errors on any route. WebGL2-off and reduced-motion paths both work.
The app is fully usable in Korean, and in English, Japanese and Chinese.
README and DECISIONS.md are complete.
13. Do not
Ask the user anything, or pause for confirmation.
Use external APIs, keys, accounts, analytics or runtime CDNs.
Ship placeholder or lorem text, fake seeded tasks, or TODOs in user-visible places.
Say "impossible" or "failed" to the traveller. Always give the next step.
Leave a black screen during any transition, or a flickering surface anywhere.
Simplify away the planner invariants, the rescue plan or the fallback paths to make tests pass.
