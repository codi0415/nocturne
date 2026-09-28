import { allocate } from "./allocate";
import { buildRoute } from "./route";
import type { DateKey, FocusLevel, NocturneData, ReplanReason, RouteChange, StudySession } from "./types";

export interface ReplanResult { data: NocturneData; change: RouteChange; }
const closed = (session: StudySession) => ["done", "partial", "skipped", "active"].includes(session.status) || session.locked;

export function replan(data: NocturneData, date: DateKey, now: string, reason: ReplanReason = "edit", focus: FocusLevel = "steady"): ReplanResult {
  const allocation = allocate(data, date, { keepTodayPlan: false });
  const rebuilt = buildRoute(data, date, allocation.allocations, focus);
  const existingToday = data.sessions.filter(session => session.date === date);
  const preserved = existingToday.filter(closed);
  const preserveIds = new Set(preserved.map(session => session.taskId));
  const future = rebuilt.filter(session => !preserveIds.has(session.taskId));
  const combined = [...preserved, ...future].sort((a, b) => a.sequence - b.sequence).map((session, sequence) => ({ ...session, sequence }));
  const messages = future.length ? [{ key: focus === "low" ? "route.lighterFirst" : "route.updated", params: { task: data.tasks.find(task => task.id === future[0]?.taskId)?.title ?? "Tonight" } }] : [];
  const change: RouteChange = { at: now, reason, messages };
  return { data: { ...data, sessions: [...data.sessions.filter(session => session.date !== date), ...combined] }, change };
}
