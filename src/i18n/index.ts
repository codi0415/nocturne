import { en, type MessageKey } from "./en/common";
import { ko } from "./ko/common";
import { ja } from "./ja/common";
import { zh } from "./zh/common";
import type { Locale } from "@/core/types";

const dictionaries = { en, ko, ja, zh };
export const t = (locale: Locale, key: MessageKey) => dictionaries[locale]?.[key] ?? en[key];
export function formatDuration(locale: Locale, minutes: number) { const hours = Math.floor(minutes / 60); const mins = minutes % 60; if (locale === "ko") return `${hours ? `${hours}시간 ` : ""}${mins ? `${mins}분` : ""}`.trim(); if (locale === "ja") return `${hours ? `${hours}時間` : ""}${mins ? `${mins}分` : ""}`; if (locale === "zh") return `${hours ? `${hours}小时` : ""}${mins ? `${mins}分钟` : ""}`; return `${hours ? `${hours}h ` : ""}${mins ? `${mins}m` : ""}`.trim(); }
export function formatDate(locale: Locale, date: string) { return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : locale === "ja" ? "ja-JP" : locale === "zh" ? "zh-CN" : "en-US", { month: "short", day: "numeric", weekday: "short" }).format(new Date(`${date}T12:00:00`)); }
export type { MessageKey };
