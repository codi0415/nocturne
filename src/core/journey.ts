import { seededJourneyNumbers } from "./stations";
import type { CarriageId, DateKey, FocusLevel, Journey, NocturneData, RouteChange, Ticket } from "./types";

export interface Transition { data: NocturneData; change?: RouteChange; }
const updateJourney = (data: NocturneData, journey: Journey): NocturneData => ({ ...data, journeys: [...data.journeys.filter(item => item.id !== journey.id), journey] });
const activeJourney = (data: NocturneData, date: DateKey) => data.journeys.find(item => item.date === date && !item.completedAt);
const nextPlanned = (data: NocturneData, date: DateKey) => data.sessions.filter(item => item.date === date && item.status === "planned").sort((a, b) => a.sequence - b.sequence)[0];

export function board(data: NocturneData, date: DateKey, now: string, focus: FocusLevel, carriage: CarriageId): Transition {
  const numbers = seededJourneyNumbers(date);
  const stations = data.sessions.filter(item => item.date === date && item.status === "planned");
  const journey: Journey = activeJourney(data, date) ?? { id: `journey-${date}`, date, phase: "boarding", ...numbers, plannedMinutes: stations.reduce((sum, station) => sum + station.plannedMinutes, 0), focusedMinutes: 0, stationsPlanned: stations.length, stationsCompleted: 0, routeChanges: 0, selectedCarriage: carriage, plannedDeparture: stations[0]?.plannedStart ?? now, plannedArrival: stations.at(-1)?.plannedEnd ?? now, startedAt: now, completedAt: null, stopEndsAt: null, focus, focusLog: [], changeLog: [] };
  journey.phase = "boarding"; journey.focus = focus; journey.selectedCarriage = carriage; journey.startedAt ??= now; journey.focusLog = [...journey.focusLog, { at: now, level: focus }];
  return { data: updateJourney(data, journey) };
}
export function arrive(data: NocturneData, date: DateKey, now: string): Transition {
  const journey = activeJourney(data, date); const station = nextPlanned(data, date); if (!journey || !station) return { data };
  const active = { ...station, status: "active" as const, actualStart: now, resumedAt: now };
  return { data: updateJourney({ ...data, sessions: data.sessions.map(item => item.id === active.id ? active : item) }, { ...journey, phase: "cabin" }) };
}
function closeStation(data: NocturneData, date: DateKey, now: string, mode: "complete" | "early" | "early-all", completed?: number): Transition {
  const journey = activeJourney(data, date); const station = data.sessions.find(item => item.date === date && item.status === "active"); if (!journey || !station) return { data };
  const minutes = completed ?? Math.min(station.workMinutes, Math.max(1, Math.round(station.elapsedSeconds / 60)));
  const task = data.tasks.find(item => item.id === station.taskId);
  const sessions = data.sessions.map(item => item.id === station.id ? { ...item, status: mode === "complete" ? "done" as const : "partial" as const, endedBy: mode, actualEnd: now, resumedAt: null, completedMinutes: minutes, creditedMinutes: minutes } : item);
  const tasks = data.tasks.map(item => item.id === task?.id ? { ...item, remainingMinutes: mode === "early-all" ? 0 : Math.max(0, item.remainingMinutes - minutes), status: mode === "early-all" ? "done" as const : item.status, completedAt: mode === "early-all" ? now : item.completedAt } : item);
  const more = sessions.some(item => item.date === date && item.status === "planned");
  return { data: updateJourney({ ...data, sessions, tasks }, { ...journey, phase: more ? "stop" : "final", focusedMinutes: journey.focusedMinutes + minutes, stationsCompleted: journey.stationsCompleted + 1, stopEndsAt: more ? new Date(new Date(now).getTime() + 5 * 60000).toISOString() : null }) };
}
export const finishEarly = (data: NocturneData, date: DateKey, now: string, wholeTask = false) => closeStation(data, date, now, wholeTask ? "early-all" : "early");
export const completeStation = (data: NocturneData, date: DateKey, now: string) => closeStation(data, date, now, "complete");
export function needMoreTime(data: NocturneData, date: DateKey, now: string, minutes: number): Transition { const station = data.sessions.find(item => item.date === date && item.status === "active"); if (!station) return { data }; const change: RouteChange = { at: now, reason: "more-time", messages: [{ key: "route.delay", params: { task: data.tasks.find(task => task.id === station.taskId)?.title ?? "station", min: minutes } }] }; return { data: { ...data, sessions: data.sessions.map(item => item.id === station.id ? { ...item, plannedMinutes: item.plannedMinutes + minutes, extendedMinutes: item.extendedMinutes + minutes } : item) }, change }; }
export function lowFocus(data: NocturneData, date: DateKey, now: string): Transition { const result = finishEarly(data, date, now); const journey = activeJourney(result.data, date); if (!journey) return result; return { data: updateJourney(result.data, { ...journey, phase: "stop", focus: "low", stopEndsAt: new Date(new Date(now).getTime() + 10 * 60000).toISOString(), focusLog: [...journey.focusLog, { at: now, level: "low" }] }), change: { at: now, reason: "low-focus", messages: [{ key: "route.lighterFirst" }] } }; }
export function pause(data: NocturneData, date: DateKey): Transition { const journey = activeJourney(data, date); return journey ? { data: updateJourney(data, { ...journey, phase: "paused" }) } : { data }; }
export function resume(data: NocturneData, date: DateKey, now: string): Transition { const journey = activeJourney(data, date); return journey ? { data: updateJourney(data, { ...journey, phase: "cabin" }), change: { at: now, reason: "service-resume", messages: [] } } : { data }; }
export function depart(data: NocturneData, date: DateKey, now: string): Transition { const journey = activeJourney(data, date); if (!journey) return { data }; return { data: updateJourney(data, { ...journey, phase: "cabin", stopEndsAt: null }), change: { at: now, reason: "depart", messages: [] } }; }
export function extendStop(data: NocturneData, date: DateKey, minutes: number): Transition { const journey = activeJourney(data, date); if (!journey?.stopEndsAt) return { data }; const base = new Date(journey.stopEndsAt).getTime(); return { data: updateJourney(data, { ...journey, stopEndsAt: new Date(base + minutes * 60000).toISOString() }) }; }
export function reassessFocus(data: NocturneData, date: DateKey, now: string, focus: FocusLevel): Transition { const journey = activeJourney(data, date); return journey ? { data: updateJourney(data, { ...journey, focus, focusLog: [...journey.focusLog, { at: now, level: focus }] }), change: { at: now, reason: "signal-change", messages: [] } } : { data }; }
export function endJourney(data: NocturneData, date: DateKey, now: string): Transition { const journey = activeJourney(data, date); return journey ? { data: updateJourney(data, { ...journey, phase: "final", completedAt: now }) } : { data }; }
export function issueTicket(data: NocturneData, date: DateKey, now: string): Transition { const journey = data.journeys.find(item => item.date === date); if (!journey || data.tickets.some(ticket => ticket.journeyId === journey.id)) return { data }; const ticket: Ticket = { id: `ticket-${journey.id}`, journeyId: journey.id, generatedAt: now, ticketStyle: journey.selectedCarriage, serial: `${date.replaceAll("-", "")}-${String(data.tickets.length + 1).padStart(4, "0")}` }; return { data: { ...data, tickets: [...data.tickets, ticket] } }; }
export function settleStale(data: NocturneData, now: string): NocturneData { return { ...data, sessions: data.sessions.map(session => session.status === "planned" && new Date(session.plannedEnd).getTime() < new Date(now).getTime() ? { ...session, status: "skipped" as const, endedBy: "unreached" as const, actualEnd: now } : session) }; }
export function continueService(data: NocturneData, date: DateKey): Transition { const journey = data.journeys.find(item => item.date === date); if (!journey || journey.phase !== "final") return { data }; return { data: updateJourney({ ...data, sessions: data.sessions.filter(item => !(item.date === date && item.endedBy === "unreached")) }, { ...journey, phase: "boarding", completedAt: null }) }; }
