"use client";
import { create } from "zustand";
import { emptyData, normalizeData, type CarriageId, type DateKey, type FocusLevel, type Locale, type NocturneData, type Task } from "@/core/types";
import { createLocalRepository } from "@/core/repository";
import * as ops from "@/core/ops";
import * as journey from "@/core/journey";
import { replan } from "@/core/planner";
import type { RescueStep } from "@/core/rescue";

type Screen = "tonight" | "tasks" | "route" | "archive" | "settings" | "lines" | "service";
interface NocturneStore {
  data: NocturneData; hydrated: boolean; screen: Screen; quickOpen: boolean; coachOpen: boolean;
  hydrate(): void; persist(next: NocturneData): void; setScreen(screen: Screen): void; setQuickOpen(open: boolean): void; dismissCoach(): void;
  completeOnboarding(name: string, locale: Locale, start: string, end: string, carriage: CarriageId, sound: boolean): void;
  addTask(task: Task, today: DateKey, now: string): void; editTask(id: string, patch: Partial<Task>, today: DateKey, now: string): void; finishTask(id: string, today: DateKey, now: string): void; removeTask(id: string, today: DateKey, now: string): void;
  optimize(today: DateKey, now: string, focus?: FocusLevel): void; reorder(sessionId: string, direction: -1 | 1, now: string): void; lock(sessionId: string): void; skipSession(sessionId: string, now: string): void;
  board(date: DateKey, now: string, focus: FocusLevel, carriage: CarriageId): void; arrive(date: DateKey, now: string): void; finishEarly(date: DateKey, now: string, whole?: boolean): void; needMore(date: DateKey, now: string, minutes: number): void; lowFocus(date: DateKey, now: string): void; depart(date: DateKey, now: string): void; extendStop(date: DateKey, minutes: number): void; endJourney(date: DateKey, now: string): void; issueTicket(date: DateKey, now: string): void; continueService(date: DateKey): void;
  applyRescue(steps: RescueStep[], today: DateKey, now: string): void; updateData(next: NocturneData): void; reset(): void;
}
const nowSeed = "2000-01-01T00:00:00.000Z";
const storageRepository = () => createLocalRepository(window.localStorage);
export const useNocturne = create<NocturneStore>((set, get) => ({
  data: emptyData(nowSeed), hydrated: false, screen: "tonight", quickOpen: false, coachOpen: true,
  hydrate() { if (typeof window === "undefined") return; const repo = storageRepository(); const data = repo.load(); set({ data, hydrated: true, coachOpen: localStorage.getItem("nocturne-coach") !== "dismissed" }); },
  persist(next) { const normalized = normalizeData(next, new Date().toISOString()); if (typeof window !== "undefined") storageRepository().save(normalized); set({ data: normalized }); },
  setScreen: screen => set({ screen }), setQuickOpen: quickOpen => set({ quickOpen }),
  dismissCoach() { if (typeof window !== "undefined") localStorage.setItem("nocturne-coach", "dismissed"); set({ coachOpen: false }); },
  completeOnboarding(name, locale, start, end, carriage, sound) { const now = new Date().toISOString(); const data = get().data; const windows = [1,2,3,4,5].map(dayOfWeek => ({ id: `weekday-${dayOfWeek}`, dayOfWeek, specificDate: null, startTime: start, endTime: end, recurring: true, enabled: true, kind: "available" as const })); get().persist({ ...data, profile: { ...data.profile, name, locale, preferredCarriage: carriage, soundEnabled: sound, onboardedAt: now }, windows }); },
  addTask(task, today, now) { get().persist(ops.addTask(get().data, task, today, now)); }, editTask(id, patch, today, now) { get().persist(ops.editTask(get().data, id, patch, today, now)); }, finishTask(id, today, now) { get().persist(ops.finishTask(get().data, id, today, now)); }, removeTask(id, today, now) { get().persist(ops.removeTask(get().data, id, today, now)); },
  optimize(today, now, focus = "steady") { get().persist(replan(get().data, today, now, "optimize", focus).data); }, reorder(id, direction, now) { get().persist(ops.reorder(get().data, id, direction, now)); }, lock(id) { get().persist(ops.lock(get().data, id)); }, skipSession(id, now) { get().persist(ops.skip(get().data, id, now)); },
  board(date, now, focus, carriage) { get().persist(journey.board(get().data, date, now, focus, carriage).data); }, arrive(date, now) { get().persist(journey.arrive(get().data, date, now).data); }, finishEarly(date, now, whole) { get().persist(journey.finishEarly(get().data, date, now, !!whole).data); }, needMore(date, now, min) { get().persist(journey.needMoreTime(get().data, date, now, min).data); }, lowFocus(date, now) { get().persist(journey.lowFocus(get().data, date, now).data); }, depart(date, now) { get().persist(journey.depart(get().data, date, now).data); }, extendStop(date, min) { get().persist(journey.extendStop(get().data, date, min).data); }, endJourney(date, now) { get().persist(journey.endJourney(get().data, date, now).data); }, issueTicket(date, now) { get().persist(journey.issueTicket(get().data, date, now).data); }, continueService(date) { get().persist(journey.continueService(get().data, date).data); },
  applyRescue(steps, today, now) { get().persist(ops.applyRescue(get().data, steps, today, now)); }, updateData(next) { get().persist(next); }, reset() { if (typeof window !== "undefined") localStorage.removeItem("nocturne-data-v1"); set({ data: emptyData(new Date().toISOString()), screen: "tonight" }); },
}));
