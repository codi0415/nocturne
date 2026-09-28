import { stopMinutes, serviceIntervals } from "./availability";
import { timeOf } from "./date";
import { stationName } from "./stations";
import type { Allocation } from "./allocate";
import type { DateKey, FocusLevel, NocturneData, StudySession, Task } from "./types";

export function chunkWork(minutes: number, min = 15, max = 50): number[] {
  if (minutes < min) return [];
  const count = Math.ceil(minutes / max);
  const base = Math.floor(minutes / count);
  const chunks = Array.from({ length: count }, () => base);
  for (let i = 0; i < minutes - base * count; i++) chunks[i]++;
  if (chunks.at(-1)! < min && chunks.length > 1) { const crumb = chunks.pop()!; chunks[chunks.length - 1] += crumb; }
  return chunks;
}

export function taskDemand(task: Task) { return task.difficulty * 2 + (6 - task.interest) + task.importance * 3; }
export function orderTasks(tasks: Task[], focus: FocusLevel): Task[] {
  return [...tasks].sort((a, b) => {
    const deadline = (a.deadline ?? "9999-99-99").localeCompare(b.deadline ?? "9999-99-99");
    if (deadline) return deadline;
    const demand = taskDemand(b) - taskDemand(a);
    return focus === "low" ? -demand : demand;
  });
}

export function buildRoute(data: NocturneData, date: DateKey, allocations: Allocation[], focus: FocusLevel): StudySession[] {
  const taskMap = new Map(data.tasks.map(task => [task.id, task]));
  const tonight = allocations.filter(item => item.date === date);
  const tasks = orderTasks(tonight.map(item => taskMap.get(item.taskId)).filter(Boolean) as Task[], focus);
  const allocationMap = new Map(tonight.map(item => [item.taskId, item.minutes]));
  const intervals = serviceIntervals(data.windows, date);
  const sessions: StudySession[] = [];
  let intervalIndex = 0;
  let cursor = intervals[0]?.start ?? 0;
  for (const task of tasks) {
    const cap = focus === "low" ? Math.min(30, task.maxSessionMinutes) : task.maxSessionMinutes;
    for (const workMinutes of chunkWork(allocationMap.get(task.id) ?? 0, task.minSessionMinutes, cap)) {
      let interval = intervals[intervalIndex];
      while (interval && cursor + workMinutes > interval.end) { interval = intervals[++intervalIndex]; cursor = interval?.start ?? 0; }
      if (!interval) break;
      const start = cursor;
      const end = cursor + workMinutes;
      const sequence = sessions.length;
      sessions.push({ id: `${date}-${task.id}-${sequence}`, taskId: task.id, date, sequence, stationName: stationName(sequence, "en"), plannedStart: `${date}T${timeOf(start)}:00`, plannedEnd: `${date}T${timeOf(end)}:00`, plannedMinutes: workMinutes, workMinutes, completedMinutes: 0, creditedMinutes: 0, status: "planned", locked: false, actualStart: null, actualEnd: null, elapsedSeconds: 0, resumedAt: null, focusBefore: null, focusAfter: null, endedBy: null, extendedMinutes: 0 });
      cursor = end + stopMinutes(workMinutes, data.profile.shortStops);
    }
  }
  return sessions;
}

export type DiffLabel = "new" | "earlier" | "delayed" | "transfer" | "another-day";
export interface RouteDiff { sessionId: string; label: DiffLabel; minutes?: number; }
export function diffRoutes(before: StudySession[], after: StudySession[]): RouteDiff[] {
  const oldByTask = new Map<string, StudySession[]>();
  before.forEach(session => oldByTask.set(session.taskId, [...(oldByTask.get(session.taskId) ?? []), session]));
  return after.map(session => {
    const candidates = oldByTask.get(session.taskId) ?? [];
    const old = candidates.shift();
    if (!old) return { sessionId: session.id, label: candidates.length ? "transfer" : "new" };
    const delta = Math.round((new Date(session.plannedStart).getTime() - new Date(old.plannedStart).getTime()) / 60000);
    return { sessionId: session.id, label: delta < 0 ? "earlier" : delta > 0 ? "delayed" : "new", minutes: Math.abs(delta) };
  });
}
