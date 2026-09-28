import { dayOfWeek, minuteOf } from "./date";
import type { DateKey, Interval, StudyWindow } from "./types";

export function mergeIntervals(intervals: Interval[]): Interval[] {
  const sorted = intervals.filter(item => item.end > item.start).sort((a, b) => a.start - b.start);
  return sorted.reduce<Interval[]>((all, item) => {
    const last = all.at(-1);
    if (last && item.start <= last.end) last.end = Math.max(last.end, item.end);
    else all.push({ ...item });
    return all;
  }, []);
}

export function subtractIntervals(available: Interval[], blocked: Interval[]): Interval[] {
  let result = mergeIntervals(available);
  for (const cut of mergeIntervals(blocked)) result = result.flatMap(interval => {
    if (cut.end <= interval.start || cut.start >= interval.end) return [interval];
    const parts: Interval[] = [];
    if (cut.start > interval.start) parts.push({ start: interval.start, end: Math.min(cut.start, interval.end) });
    if (cut.end < interval.end) parts.push({ start: Math.max(cut.end, interval.start), end: interval.end });
    return parts;
  });
  return result.filter(item => item.end - item.start >= 15);
}

function applies(window: StudyWindow, date: DateKey) {
  if (!window.enabled) return false;
  if (window.specificDate) return window.specificDate === date;
  return window.dayOfWeek === dayOfWeek(date);
}

export function serviceIntervals(windows: StudyWindow[], date: DateKey): Interval[] {
  const chosen = windows.filter(window => applies(window, date));
  const available = chosen.filter(window => window.kind === "available").map(window => ({ start: minuteOf(window.startTime), end: minuteOf(window.endTime) }));
  const blocked = chosen.filter(window => window.kind === "blocked").map(window => ({ start: minuteOf(window.startTime), end: minuteOf(window.endTime) }));
  return subtractIntervals(mergeIntervals(available), blocked);
}

export function stopMinutes(workMinutes: number, shortStops = false) { return workMinutes >= 45 ? (shortStops ? 5 : 10) : (shortStops ? 3 : 5); }

export function capacityOf(intervals: Interval[], shortStops = false, sessionMinutes = 50): number {
  return intervals.reduce((total, interval) => {
    let cursor = interval.start;
    let work = 0;
    while (cursor + 15 <= interval.end) {
      const chunk = Math.min(sessionMinutes, interval.end - cursor);
      if (chunk < 15) break;
      work += chunk;
      cursor += chunk;
      if (cursor < interval.end) cursor += stopMinutes(chunk, shortStops);
    }
    return total + work;
  }, 0);
}

export function validateWindows(windows: StudyWindow[]): string[] {
  const errors: string[] = [];
  for (const window of windows) if (minuteOf(window.endTime) <= minuteOf(window.startTime)) errors.push(`window:${window.id}:end-after-start`);
  const groups = new Map<string, StudyWindow[]>();
  for (const window of windows.filter(item => item.enabled && item.kind === "available")) {
    const key = window.specificDate ?? `day-${window.dayOfWeek}`;
    groups.set(key, [...(groups.get(key) ?? []), window]);
  }
  for (const [key, group] of groups) {
    const sorted = group.sort((a, b) => minuteOf(a.startTime) - minuteOf(b.startTime));
    for (let i = 1; i < sorted.length; i++) if (minuteOf(sorted[i].startTime) < minuteOf(sorted[i - 1].endTime)) errors.push(`window:${key}:overlap`);
  }
  return [...new Set(errors)];
}
