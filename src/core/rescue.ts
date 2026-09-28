import { allocate } from "./allocate";
import { timeOf, minuteOf } from "./date";
import type { Conflict, DateKey, NocturneData } from "./types";

export type RescueStep = { kind: "shorter-stops" | "more-time" | "trim" | "move-deadline"; gain: number; details: Record<string, string | number> };
export interface RescuePlan { deadline: DateKey; shortfall: number; steps: RescueStep[]; left: number; }
export function rescuePlan(data: NocturneData, conflict: Conflict, today: DateKey): RescuePlan {
  let left = conflict.shortfallMinutes; const steps: RescueStep[] = [];
  if (!data.profile.shortStops && left > 0) { const gain = Math.min(left, Math.max(10, Math.round(conflict.availableMinutes * .06))); steps.push({ kind: "shorter-stops", gain, details: {} }); left -= gain; }
  if (left > 0) { const gain = Math.min(left, 180); steps.push({ kind: "more-time", gain, details: { date: today, minutes: Math.ceil(gain / 30) * 30 } }); left -= gain; }
  const trimmable = data.tasks.filter(task => conflict.taskIds.includes(task.id) && task.importance < 5 && !task.trimmedMinutes).sort((a, b) => a.importance - b.importance);
  for (const task of trimmable) { if (left <= 0) break; const gain = Math.min(left, Math.floor(task.remainingMinutes * .25)); if (gain >= 5) { steps.push({ kind: "trim", gain, details: { taskId: task.id, minutes: gain } }); left -= gain; } }
  if (left > 0) { const task = trimmable[0] ?? data.tasks.filter(task => conflict.taskIds.includes(task.id)).sort((a, b) => a.importance - b.importance)[0]; if (task) { steps.push({ kind: "move-deadline", gain: left, details: { taskId: task.id, days: Math.min(7, Math.max(1, Math.ceil(left / 60))) } }); left = 0; } }
  return { deadline: conflict.deadline, shortfall: conflict.shortfallMinutes, steps, left };
}
export function applyRescue(data: NocturneData, steps: RescueStep[]): NocturneData {
  const next = structuredClone(data);
  for (const step of steps) {
    if (step.kind === "shorter-stops") next.profile.shortStops = true;
    if (step.kind === "more-time") { const date = String(step.details.date) as DateKey; const minutes = Number(step.details.minutes); const existing = next.windows.filter(item => item.specificDate === date && item.kind === "available").sort((a, b) => minuteOf(b.endTime) - minuteOf(a.endTime))[0]; if (existing) existing.endTime = timeOf(Math.min(1440, minuteOf(existing.endTime) + Math.min(90, minutes))); else next.windows.push({ id: `rescue-${date}`, dayOfWeek: null, specificDate: date, startTime: "19:00", endTime: timeOf(19 * 60 + Math.min(120, minutes)), recurring: false, enabled: true, kind: "available" }); }
    if (step.kind === "trim") next.tasks = next.tasks.map(task => task.id === step.details.taskId && task.importance < 5 && !task.trimmedMinutes ? { ...task, trimmedMinutes: Number(step.details.minutes), remainingMinutes: Math.max(0, task.remainingMinutes - Number(step.details.minutes)) } : task);
    if (step.kind === "move-deadline") next.tasks = next.tasks.map(task => task.id === step.details.taskId && task.deadline ? { ...task, deadline: new Date(new Date(`${task.deadline}T12:00:00`).getTime() + Number(step.details.days) * 86400000).toISOString().slice(0, 10) as DateKey } : task);
  }
  return next;
}
export function rescueClears(data: NocturneData, steps: RescueStep[], today: DateKey) { return allocate(applyRescue(data, steps), today).conflicts.length === 0; }
