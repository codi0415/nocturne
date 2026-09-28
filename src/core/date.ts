import type { DateKey } from "./types";

export const minuteOf = (time: string) => { const [h, m] = time.split(":").map(Number); return h * 60 + m; };
export const timeOf = (minute: number) => `${String(Math.floor(Math.max(0, minute) / 60)).padStart(2, "0")}:${String(Math.max(0, minute) % 60).padStart(2, "0")}`;
export const addDays = (key: DateKey, days: number): DateKey => { const date = new Date(`${key}T12:00:00`); date.setDate(date.getDate() + days); return date.toISOString().slice(0, 10) as DateKey; };
export const daysBetween = (from: DateKey, to: DateKey) => Math.round((new Date(`${to}T12:00:00`).getTime() - new Date(`${from}T12:00:00`).getTime()) / 86_400_000);
export const dayOfWeek = (key: DateKey) => new Date(`${key}T12:00:00`).getDay();
export const dateKey = (instant: string | Date): DateKey => (typeof instant === "string" ? instant : instant.toISOString()).slice(0, 10) as DateKey;
