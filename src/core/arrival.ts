import { allocate } from "./allocate";
import type { DateKey, NocturneData } from "./types";

export interface ArrivalForecast { taskId: string; arrival: DateKey | null; deadline: DateKey | null; neededMinutes: number; plannedMinutes: number; onTime: boolean | null; }
export function arrivalForecasts(data: NocturneData, today: DateKey): ArrivalForecast[] {
  const result = allocate(data, today);
  return data.tasks.filter(task => task.status === "active" || task.status === "inbox").map(task => {
    const pieces = result.allocations.filter(item => item.taskId === task.id);
    const arrival = pieces.length ? pieces.map(item => item.date).sort().at(-1)! : null;
    return { taskId: task.id, arrival, deadline: task.deadline, neededMinutes: task.remainingMinutes, plannedMinutes: pieces.reduce((sum, item) => sum + item.minutes, 0), onTime: task.deadline ? !!arrival && arrival <= task.deadline : null };
  });
}
