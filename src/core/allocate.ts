import { addDays, dayOfWeek, daysBetween } from "./date";
import { capacityOf, serviceIntervals } from "./availability";
import type { Conflict, DateKey, NocturneData, Task } from "./types";

export interface Allocation { taskId: string; date: DateKey; minutes: number; }
export interface AllocationResult { allocations: Allocation[]; conflicts: Conflict[]; capacity: Record<string, number>; }

const active = (task: Task) => task.status === "active" || task.status === "inbox";

export function horizonDates(today: DateKey, tasks: Task[]): DateKey[] {
  const farthest = tasks.reduce((days, task) => task.deadline ? Math.max(days, daysBetween(today, task.deadline)) : days, 14);
  return Array.from({ length: Math.min(60, Math.max(14, farthest + 1)) }, (_, index) => addDays(today, index));
}

export function cumulativeEdfTest(data: NocturneData, today: DateKey, capacity: Record<string, number>): Conflict[] {
  const deadlines = [...new Set(data.tasks.filter(task => active(task) && task.deadline).map(task => task.deadline!))].sort();
  return deadlines.flatMap(deadline => {
    const due = data.tasks.filter(task => active(task) && task.deadline && task.deadline <= deadline);
    const requiredMinutes = due.reduce((sum, task) => sum + task.remainingMinutes, 0);
    const availableMinutes = Object.entries(capacity).filter(([date]) => date <= deadline).reduce((sum, [, minutes]) => sum + minutes, 0);
    return requiredMinutes > availableMinutes ? [{ deadline, requiredMinutes, availableMinutes, shortfallMinutes: requiredMinutes - availableMinutes, taskIds: due.map(task => task.id) }] : [];
  });
}

export function allocate(data: NocturneData, today: DateKey, option: { keepTodayPlan?: boolean } = {}): AllocationResult {
  const dates = horizonDates(today, data.tasks);
  const capacity = Object.fromEntries(dates.map(date => [date, capacityOf(serviceIntervals(data.windows, date), data.profile.shortStops)]));
  const used = Object.fromEntries(dates.map(date => [date, 0]));
  const allocations: Allocation[] = [];
  if (option.keepTodayPlan) for (const session of data.sessions.filter(session => session.date === today && session.status === "planned" && !session.locked)) used[today] += session.workMinutes;
  const tasks = data.tasks.filter(active).sort((a, b) => (a.deadline ?? "9999-99-99").localeCompare(b.deadline ?? "9999-99-99") || b.importance - a.importance);
  const recurring = tasks.filter(task => task.recurrence);
  for (const task of recurring) {
    for (const date of dates) {
      const occurs = task.recurrence?.freq === "daily" || (task.recurrence?.freq === "weekly" && task.recurrence.days.includes(dayOfWeek(date)));
      if (!occurs || used[date] >= capacity[date]) continue;
      const minutes = Math.min(task.remainingMinutes, Math.max(0, capacity[date] - used[date]), task.maxSessionMinutes);
      if (minutes >= 15) { allocations.push({ taskId: task.id, date, minutes }); used[date] += minutes; }
    }
  }
  for (const task of tasks.filter(task => !task.recurrence)) {
    let remaining = task.remainingMinutes;
    const allowed = dates.filter(date => task.deadline ? date <= task.deadline : daysBetween(today, date) <= 6);
    while (remaining >= 15) {
      const deadline = task.deadline;
      const beforeDeadline = deadline ? allowed.filter(date => date < deadline && capacity[date] - used[date] >= 15) : allowed.filter(date => capacity[date] - used[date] >= 15);
      const candidates = beforeDeadline.length ? beforeDeadline : allowed.filter(date => capacity[date] - used[date] >= 15);
      if (!candidates.length) break;
      candidates.sort((a, b) => (used[a] / Math.max(1, capacity[a]) + daysBetween(today, a) * .002) - (used[b] / Math.max(1, capacity[b]) + daysBetween(today, b) * .002));
      const date = candidates[0];
      const minutes = Math.min(remaining, capacity[date] - used[date], task.maxSessionMinutes);
      const adjusted = remaining - minutes > 0 && remaining - minutes < 15 ? Math.max(15, minutes - (15 - (remaining - minutes))) : minutes;
      if (adjusted < 15) break;
      allocations.push({ taskId: task.id, date, minutes: adjusted }); used[date] += adjusted; remaining -= adjusted;
    }
  }
  return { allocations, conflicts: cumulativeEdfTest(data, today, capacity), capacity };
}
