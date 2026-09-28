import { addDays, dateKey } from "./date";
import type { DateKey, Line, Level, Recurrence } from "./types";

export interface QuickAddResult { title: string; deadline: DateKey | null; duration: number | null; importance: Level | null; recurrence: Recurrence | null; lineId: string | null; unsure: string[]; }
const weekdays: Record<string, number> = { 일: 0, 日: 0, sun: 0, sunday: 0, 월: 1, 月: 1, mon: 1, monday: 1, 화: 2, 火: 2, tue: 2, tuesday: 2, 수: 3, 水: 3, wed: 3, wednesday: 3, 목: 4, 木: 4, thu: 4, thursday: 4, 금: 5, 金: 5, fri: 5, friday: 5, 토: 6, 土: 6, sat: 6, saturday: 6 };
function nextWeekday(today: DateKey, target: number, following = false) { const current = new Date(`${today}T12:00:00`).getDay(); let diff = (target - current + 7) % 7; if (diff === 0 || following) diff += following ? 7 : 0; return addDays(today, diff); }
function deadlineFrom(text: string, today: DateKey): DateKey | null {
  if (/(오늘|today|今日|今天)/i.test(text)) return today;
  if (/(모레|day after tomorrow|后天|後日)/i.test(text)) return addDays(today, 2);
  if (/(내일|tomorrow|明日|明天)/i.test(text)) return addDays(today, 1);
  const monthDay = text.match(/(\d{1,2})\s*(?:월|月)[\s ]*(\d{1,2})\s*(?:일|日)?/);
  if (monthDay) return `${new Date(`${today}T12:00:00`).getFullYear()}-${monthDay[1].padStart(2, "0")}-${monthDay[2].padStart(2, "0")}` as DateKey;
  const byDay = text.match(/(?:by|이번\s*주|다음\s*주|next)\s*(월|화|수|목|금|토|일|monday|tuesday|wednesday|thursday|friday|saturday|sunday|月|火|水|木|金|土|日)/i);
  if (byDay) return nextWeekday(today, weekdays[byDay[1].toLowerCase()], /다음|next/i.test(byDay[0]));
  return null;
}
function durationFrom(text: string): number | null {
  const decimalHours = text.match(/(\d+(?:\.\d+)?)\s*(?:시간|hours?|h|時間|小时|小時)/i);
  if (decimalHours) return Math.round(Number(decimalHours[1]) * 60);
  const chinese = text.match(/([一二两兩三四五六七八九十])个?小[时時]/); if (chinese) return ({ 一: 1, 二: 2, 两: 2, 兩: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 }[chinese[1]] ?? 1) * 60;
  const minutes = text.match(/(\d+)\s*(?:분|minutes?|mins?|m|分)/i); return minutes ? Number(minutes[1]) : null;
}
function recurrenceFrom(text: string): Recurrence | null {
  if (/(매일|every day|daily|毎日|每天)/i.test(text)) return { freq: "daily" };
  const weekly = text.match(/(?:매주|every week|毎週|每周)\s*([월화수목금토일月火水木金土日\s,]+)/i);
  if (weekly) { const days = [...weekly[1]].map(char => weekdays[char]).filter(value => value !== undefined); return days.length ? { freq: "weekly", days: [...new Set(days)] } : null; }
  return null;
}
export function parseQuickAdd(input: string, now: string, lines: Line[] = []): QuickAddResult {
  const today = dateKey(now); const deadline = deadlineFrom(input, today); const duration = durationFrom(input); const recurrence = recurrenceFrom(input);
  const importance: Level | null = /(매우\s*중요|very important|最重要|非常重要)/i.test(input) ? 5 : /(중요|important|急|重要)/i.test(input) ? 4 : null;
  const line = lines.find(item => input.toLocaleLowerCase().includes(item.title.toLocaleLowerCase()));
  let title = input.replace(/\d+(?:\.\d+)?\s*(?:시간|hours?|h|時間|小时|小時|분|minutes?|mins?|m|分)/gi, "").replace(/(오늘|내일|모레|today|tomorrow|day after tomorrow|明日|明天|今日|今天|后天|後日|중요|important|毎日|每天|매일|every day)/gi, "").replace(/\s+/g, " ").trim();
  if (!title) title = input.trim();
  const unsure = [!deadline && !recurrence ? "deadline" : "", !duration ? "duration" : "", !importance ? "importance" : ""].filter(Boolean);
  return { title, deadline, duration, importance, recurrence, lineId: line?.id ?? null, unsure };
}
