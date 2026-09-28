import type { Locale } from "./types";

const names: Record<Locale, string[]> = {
  en: ["BLUE HOUR", "STILLWATER", "LANTERN", "FERNHILL", "SILVER BAY", "NORTHLIGHT", "CEDAR CROSS", "HALCYON", "MOONWELL", "ASHGROVE", "QUIET HARBOR", "EMBER", "WILLOW", "GLASS LAKE", "LAST LIGHT", "MIDNIGHT"],
  ko: ["어스름", "물비늘", "별뉘", "산마루", "윤슬", "샛별", "솔바람", "고요", "달무리", "들꽃", "나루", "불씨", "버들", "유리호수", "저문빛", "한밤"],
  ja: ["薄明", "静水", "灯火", "緑丘", "銀湾", "北光", "杉路", "凪", "月輪", "灰森", "静港", "残火", "柳", "硝子湖", "暮光", "真夜中"],
  zh: ["蓝时", "静水", "灯影", "青丘", "银湾", "北光", "杉路", "晴岚", "月环", "灰林", "静港", "余烬", "柳岸", "镜湖", "暮光", "午夜"],
};
export const stationName = (index: number, locale: Locale = "en") => names[locale][Math.max(0, index) % names[locale].length];
export const stationNames = names;
export function seededJourneyNumbers(date: string) { const seed = [...date].reduce((sum, char) => sum + char.charCodeAt(0), 0); return { platform: seed % 6 + 1, car: seed % 8 + 1, seat: `${(seed % 14) + 1}${seed % 2 ? "A" : "B"}` }; }
