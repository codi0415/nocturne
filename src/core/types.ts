export type DateKey = `${number}-${number}-${number}`;
export type FocusLevel = "low" | "steady" | "sharp";
export type Locale = "en" | "ko" | "ja" | "zh";
export type Level = 1 | 2 | 3 | 4 | 5;
export type TaskStatus = "inbox" | "active" | "done" | "archived";
export type Recurrence = { freq: "daily" } | { freq: "weekly"; days: number[] };
export type CarriageId = "quiet" | "rain" | "tunnel" | "moon";
export type JourneyPhase = "boarding" | "cabin" | "stop" | "paused" | "final";
export type SessionStatus = "planned" | "active" | "done" | "partial" | "skipped";
export type SessionEnd = "complete" | "early" | "early-all" | "low-focus" | "ended" | "removed" | "skipped" | "unreached";
export type ReplanReason = "initial" | "boarding" | "late-start" | "finish-early" | "more-time" | "low-focus" | "signal-change" | "skip" | "task-change" | "reorder" | "edit" | "optimize" | "service-resume" | "depart";

export interface Profile { id: string; name: string; timezone: string; createdAt: string; preferredCarriage: CarriageId; autoTunnel: boolean; locale: Locale; onboardedAt: string | null; learnFromSessions: boolean; autoAdjustEstimates: boolean; useFocusHistory: boolean; shortStops: boolean; soundEnabled?: boolean; }
export interface Task { id: string; title: string; description: string; deadline: DateKey | null; estimatedMinutes: number; userEstimatedMinutes: number | null; trimmedMinutes?: number; remainingMinutes: number; interest: Level; difficulty: Level; importance: Level; splittable: boolean; minSessionMinutes: number; maxSessionMinutes: number; recurrence: Recurrence | null; status: TaskStatus; lineId: string | null; createdAt: string; updatedAt: string; completedAt: string | null; }
export interface StudyWindow { id: string; dayOfWeek: number | null; specificDate: DateKey | null; startTime: string; endTime: string; recurring: boolean; enabled: boolean; kind: "available" | "blocked"; }
export interface StudySession { id: string; taskId: string; date: DateKey; sequence: number; stationName: string; plannedStart: string; plannedEnd: string; plannedMinutes: number; workMinutes: number; completedMinutes: number; creditedMinutes: number; status: SessionStatus; locked: boolean; actualStart: string | null; actualEnd: string | null; elapsedSeconds: number; resumedAt: string | null; focusBefore: FocusLevel | null; focusAfter: FocusLevel | null; endedBy: SessionEnd | null; extendedMinutes: number; }
export interface Line { id: string; title: string; description: string; targetDate: DateKey | null; createdAt: string; }
export interface RouteChange { at: string; reason: ReplanReason; messages: { key: string; params?: Record<string, string | number> }[]; }
export interface Journey { id: string; date: DateKey; phase: JourneyPhase; platform: number; car: number; seat: string; plannedMinutes: number; focusedMinutes: number; stationsPlanned: number; stationsCompleted: number; routeChanges: number; selectedCarriage: CarriageId; plannedDeparture: string; plannedArrival: string; startedAt: string | null; completedAt: string | null; stopEndsAt: string | null; focus: FocusLevel; focusLog: { at: string; level: FocusLevel }[]; changeLog: RouteChange[]; }
export interface Ticket { id: string; journeyId: string; generatedAt: string; ticketStyle: CarriageId; serial: string; }
export interface NocturneData { schemaVersion: number; profile: Profile; tasks: Task[]; windows: StudyWindow[]; sessions: StudySession[]; lines: Line[]; journeys: Journey[]; tickets: Ticket[]; }
export interface Interval { start: number; end: number; }
export interface Conflict { deadline: DateKey; requiredMinutes: number; availableMinutes: number; shortfallMinutes: number; taskIds: string[]; }

export const SCHEMA_VERSION = 1;
const iso = "2000-01-01T00:00:00.000Z";

export function emptyData(now = iso): NocturneData {
  return {
    schemaVersion: SCHEMA_VERSION,
    profile: { id: "local", name: "", timezone: "Asia/Seoul", createdAt: now, preferredCarriage: "rain", autoTunnel: true, locale: "ko", onboardedAt: null, learnFromSessions: true, autoAdjustEstimates: true, useFocusHistory: true, shortStops: false, soundEnabled: true },
    tasks: [], windows: [], sessions: [], lines: [], journeys: [], tickets: [],
  };
}

export function normalizeData(raw: unknown, now = iso): NocturneData {
  try {
    const value = raw && typeof raw === "object" ? raw as Partial<NocturneData> : {};
    const base = emptyData(now);
    const profile = value.profile && typeof value.profile === "object" ? { ...base.profile, ...value.profile } : base.profile;
    const tasks = Array.isArray(value.tasks) ? value.tasks.filter(Boolean).map((task, index) => Object.assign({
      id: `task-${index}`, title: "Untitled", description: "", deadline: null, estimatedMinutes: 30, userEstimatedMinutes: null, remainingMinutes: 30, interest: 3, difficulty: 3, importance: 3, splittable: true, minSessionMinutes: 15, maxSessionMinutes: 50, recurrence: null, status: "active", lineId: null, createdAt: now, updatedAt: now, completedAt: null,
    }, task)) as Task[] : [];
    const sessions = Array.isArray(value.sessions) ? value.sessions.filter(Boolean).map((session, index) => Object.assign({
      id: `session-${index}`, taskId: "", date: now.slice(0, 10) as DateKey, sequence: index, stationName: "BLUE HOUR", plannedStart: now, plannedEnd: now, plannedMinutes: 25, workMinutes: 25, completedMinutes: 0, creditedMinutes: 0, status: "planned", locked: false, actualStart: null, actualEnd: null, elapsedSeconds: 0, resumedAt: null, focusBefore: null, focusAfter: null, endedBy: null, extendedMinutes: 0,
    }, session)) as StudySession[] : [];
    return { ...base, ...value, schemaVersion: SCHEMA_VERSION, profile, tasks, sessions, windows: Array.isArray(value.windows) ? value.windows : [], lines: Array.isArray(value.lines) ? value.lines : [], journeys: Array.isArray(value.journeys) ? value.journeys : [], tickets: Array.isArray(value.tickets) ? value.tickets : [] };
  } catch { return emptyData(now); }
}
