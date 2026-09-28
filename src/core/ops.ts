import { replan } from "./planner";
import type { DateKey, NocturneData, RouteChange, StudyWindow, Task } from "./types";
import type { RescueStep } from "./rescue";
import { applyRescue as applyRescueSteps } from "./rescue";

export function addTask(data: NocturneData, task: Task, today: DateKey, now: string) { return replan({ ...data, tasks: [...data.tasks, task] }, today, now, "task-change").data; }
export function editTask(data: NocturneData, taskId: string, patch: Partial<Task>, today: DateKey, now: string) { return replan({ ...data, tasks: data.tasks.map(task => task.id === taskId ? { ...task, ...patch, updatedAt: now } : task) }, today, now, "edit").data; }
export function finishTask(data: NocturneData, taskId: string, today: DateKey, now: string) { return editTask(data, taskId, { remainingMinutes: 0, status: "done", completedAt: now }, today, now); }
export function logTaskProgress(data: NocturneData, taskId: string, minutes: number, today: DateKey, now: string) { const task = data.tasks.find(item => item.id === taskId); return task ? editTask(data, taskId, { remainingMinutes: Math.max(0, task.remainingMinutes - minutes) }, today, now) : data; }
export function removeTask(data: NocturneData, taskId: string, today: DateKey, now: string) { return editTask(data, taskId, { status: "archived" }, today, now); }
export function reorder(data: NocturneData, sessionId: string, direction: -1 | 1, now: string) { const target = data.sessions.find(item => item.id === sessionId); if (!target || target.locked) return data; const ordered = data.sessions.filter(item => item.date === target.date).sort((a, b) => a.sequence - b.sequence); const index = ordered.findIndex(item => item.id === sessionId); const swap = ordered[index + direction]; if (!swap || swap.locked || swap.status !== "planned") return data; const change: RouteChange = { at: now, reason: "reorder", messages: [] }; return { ...data, sessions: data.sessions.map(item => item.id === target.id ? { ...item, sequence: swap.sequence } : item.id === swap.id ? { ...item, sequence: target.sequence } : item), journeys: data.journeys.map(journey => journey.date === target.date ? { ...journey, routeChanges: journey.routeChanges + 1, changeLog: [...journey.changeLog, change] } : journey) };
}
export function lock(data: NocturneData, sessionId: string) { return { ...data, sessions: data.sessions.map(item => item.id === sessionId ? { ...item, locked: !item.locked } : item) }; }
export function skip(data: NocturneData, sessionId: string, now: string) { return { ...data, sessions: data.sessions.map(item => item.id === sessionId ? { ...item, status: "skipped" as const, endedBy: "skipped" as const, actualEnd: now } : item) }; }
export function editWindows(data: NocturneData, windows: StudyWindow[], today: DateKey, now: string) { return replan({ ...data, windows }, today, now, "edit").data; }
export function applyRescue(data: NocturneData, steps: RescueStep[], today: DateKey, now: string) { return replan(applyRescueSteps(data, steps), today, now, "edit").data; }
