import { describe, expect, it } from "vitest";
import { emptyData, normalizeData, type DateKey, type NocturneData, type StudySession, type Task } from "./types";
import { capacityOf, mergeIntervals, serviceIntervals, subtractIntervals, validateWindows } from "./availability";
import { allocate, cumulativeEdfTest } from "./allocate";
import { buildRoute, chunkWork, diffRoutes, orderTasks } from "./route";
import { replan } from "./planner";
import { arrivalForecasts } from "./arrival";
import * as journey from "./journey";
import * as ops from "./ops";
import { applyRescue, rescuePlan } from "./rescue";
import { calibratedEstimate, feelSuggestion, focusProfile, similarTasks, taskSignature } from "./learning";
import { parseQuickAdd } from "./quickadd";
import { archiveStats, journeySummary, ticketFace } from "./stats";
import { stationName, seededJourneyNumbers } from "./stations";
import { en } from "@/i18n/en/common";
import { ko } from "@/i18n/ko/common";
import { ja } from "@/i18n/ja/common";
import { zh } from "@/i18n/zh/common";
import { formatDuration } from "@/i18n";

const TODAY = "2026-09-28" as DateKey;
const NOW = "2026-09-28T10:00:00.000Z";
function task(id: string, patch: Partial<Task> = {}): Task { return { id, title: `Task ${id}`, description: "", deadline: "2026-09-30", estimatedMinutes: 60, userEstimatedMinutes: 60, remainingMinutes: 60, interest: 3, difficulty: 3, importance: 3, splittable: true, minSessionMinutes: 15, maxSessionMinutes: 50, recurrence: null, status: "active", lineId: null, createdAt: NOW, updatedAt: NOW, completedAt: null, ...patch }; }
function data(tasks: Task[] = [task("a")]): NocturneData { const base = emptyData(NOW); return { ...base, profile: { ...base.profile, onboardedAt: NOW }, tasks, windows: Array.from({length:7},(_,dayOfWeek)=>({ id:`w${dayOfWeek}`,dayOfWeek,specificDate:null,startTime:"19:00",endTime:"23:00",recurring:true,enabled:true,kind:"available" as const })) }; }
function session(id="s", patch: Partial<StudySession> = {}): StudySession { return { id, taskId:"a", date:TODAY, sequence:0, stationName:"BLUE HOUR", plannedStart:`${TODAY}T19:00:00`,plannedEnd:`${TODAY}T19:30:00`,plannedMinutes:30,workMinutes:30,completedMinutes:0,creditedMinutes:0,status:"planned",locked:false,actualStart:null,actualEnd:null,elapsedSeconds:0,resumedAt:null,focusBefore:null,focusAfter:null,endedBy:null,extendedMinutes:0,...patch }; }

describe("availability",()=>{
  it("merges overlaps",()=>expect(mergeIntervals([{start:60,end:120},{start:100,end:180}])).toEqual([{start:60,end:180}]));
  it("merges touching intervals",()=>expect(mergeIntervals([{start:0,end:20},{start:20,end:40}])).toEqual([{start:0,end:40}]));
  it("sorts intervals",()=>expect(mergeIntervals([{start:50,end:80},{start:10,end:20}])[0].start).toBe(10));
  it("removes invalid intervals",()=>expect(mergeIntervals([{start:20,end:10}])).toEqual([]));
  it("subtracts middle",()=>expect(subtractIntervals([{start:0,end:100}],[{start:30,end:60}])).toEqual([{start:0,end:30},{start:60,end:100}]));
  it("drops fragments under fifteen",()=>expect(subtractIntervals([{start:0,end:50}],[{start:10,end:40}])).toEqual([]));
  it("blocked exception removes service",()=>{const d=data();d.windows.push({id:"b",dayOfWeek:null,specificDate:TODAY,startTime:"20:00",endTime:"21:00",recurring:false,enabled:true,kind:"blocked"});expect(serviceIntervals(d.windows,TODAY)).toEqual([{start:1140,end:1200},{start:1260,end:1380}])});
  it("capacity includes stops",()=>expect(capacityOf([{start:0,end:120}],false,50)).toBe(100));
  it("short stops increase capacity",()=>expect(capacityOf([{start:0,end:120}],true,50)).toBeGreaterThanOrEqual(capacityOf([{start:0,end:120}],false,50)));
  it("validates end after start",()=>expect(validateWindows([{id:"x",dayOfWeek:1,specificDate:null,startTime:"20:00",endTime:"19:00",recurring:true,enabled:true,kind:"available"}])).toContain("window:x:end-after-start"));
  it("validates overlap",()=>expect(validateWindows([{id:"x",dayOfWeek:1,specificDate:null,startTime:"19:00",endTime:"21:00",recurring:true,enabled:true,kind:"available"},{id:"y",dayOfWeek:1,specificDate:null,startTime:"20:00",endTime:"22:00",recurring:true,enabled:true,kind:"available"}]).some(e=>e.includes("overlap"))).toBe(true));
});

describe("allocation and routes",()=>{
  it("uses earliest deadline first",()=>{const d=data([task("late",{deadline:"2026-10-03"}),task("early",{deadline:"2026-09-29"})]);expect(allocate(d,TODAY).allocations[0].taskId).toBe("early")});
  it("detects conflict by cumulative EDF",()=>{const d=data([task("a",{remainingMinutes:2000,deadline:TODAY})]);expect(allocate(d,TODAY).conflicts[0].shortfallMinutes).toBeGreaterThan(0)});
  it("reserves daily recurring work",()=>{const d=data([task("a",{recurrence:{freq:"daily"}})]);expect(allocate(d,TODAY).allocations.length).toBeGreaterThan(1)});
  it("Someday stays in first week",()=>{const d=data([task("a",{deadline:null,remainingMinutes:500})]);expect(allocate(d,TODAY).allocations.every(a=>a.date<="2026-10-04")).toBe(true)});
  it("deadline day acts as buffer",()=>{const d=data([task("a",{deadline:"2026-09-29",remainingMinutes:300})]);expect(allocate(d,TODAY).allocations.some(a=>a.date==="2026-09-29")).toBe(true)});
  it("EDF test reports task ids",()=>{const d=data([task("a",{remainingMinutes:1000,deadline:TODAY})]);expect(cumulativeEdfTest(d,TODAY,{[TODAY]:10})[0].taskIds).toContain("a")});
  it.each([[15,[15]],[29,[29]],[30,[30]],[60,[30,30]],[61,[31,30]],[99,[50,49]],[100,[50,50]],[101,[34,34,33]],[14,[]]] as const)("chunks %i without crumbs",(minutes,expected)=>expect(chunkWork(minutes,15,50)).toEqual(expected));
  it("orders demanding work first when sharp",()=>{const hard=task("h",{difficulty:5,interest:1,deadline:null});const easy=task("e",{difficulty:1,interest:5,deadline:null});expect(orderTasks([easy,hard],"sharp")[0].id).toBe("h")});
  it("orders lighter work first on low focus",()=>{const hard=task("h",{difficulty:5,interest:1,deadline:null});const easy=task("e",{difficulty:1,interest:5,deadline:null});expect(orderTasks([hard,easy],"low")[0].id).toBe("e")});
  it("builds stops into clock times",()=>{const d=data();const sessions=buildRoute(d,TODAY,[{taskId:"a",date:TODAY,minutes:100}],"steady");expect(new Date(sessions[1].plannedStart).getTime()-new Date(sessions[0].plannedEnd).getTime()).toBe(10*60000)});
  it("route diff marks delay",()=>{const before=[session()];const after=[session("s2",{plannedStart:`${TODAY}T19:15:00`})];expect(diffRoutes(before,after)[0]).toMatchObject({label:"delayed",minutes:15})});
  it("route diff marks earlier",()=>{const before=[session()];const after=[session("s2",{plannedStart:`${TODAY}T18:45:00`})];expect(diffRoutes(before,after)[0].label).toBe("earlier")});
  it("route diff marks new",()=>expect(diffRoutes([], [session()])[0].label).toBe("new"));
  it("planner preserves done stations",()=>{const d={...data(),sessions:[session("done",{status:"done"})]};expect(replan(d,TODAY,NOW).data.sessions.find(s=>s.id==="done")?.status).toBe("done")});
  it("planner preserves active stations",()=>{const d={...data(),sessions:[session("active",{status:"active"})]};expect(replan(d,TODAY,NOW).data.sessions.some(s=>s.id==="active")).toBe(true)});
  it("planner preserves locked stations",()=>{const d={...data(),sessions:[session("locked",{locked:true})]};expect(replan(d,TODAY,NOW).data.sessions.some(s=>s.id==="locked")).toBe(true)});
  it("arrival includes arithmetic",()=>{const forecast=arrivalForecasts(data(),TODAY)[0];expect(forecast.neededMinutes).toBe(60);expect(forecast.plannedMinutes).toBeGreaterThan(0)});
});

describe("journey transitions and ops",()=>{
  const boarded=()=>journey.board({...data(),sessions:[session()]},TODAY,NOW,"steady","rain").data;
  it("boards",()=>expect(boarded().journeys[0].phase).toBe("boarding"));
  it("arrives in cabin",()=>expect(journey.arrive(boarded(),TODAY,NOW).data.journeys[0].phase).toBe("cabin"));
  it("marks station active",()=>expect(journey.arrive(boarded(),TODAY,NOW).data.sessions[0].status).toBe("active"));
  it("finishes early",()=>{const d=journey.arrive(boarded(),TODAY,NOW).data;expect(journey.finishEarly(d,TODAY,"2026-09-28T10:15:00Z").data.sessions[0].status).toBe("partial")});
  it("finishes whole task",()=>{const d=journey.arrive(boarded(),TODAY,NOW).data;expect(journey.finishEarly(d,TODAY,"2026-09-28T10:15:00Z",true).data.tasks[0].status).toBe("done")});
  it("adds more time",()=>{const d=journey.arrive(boarded(),TODAY,NOW).data;expect(journey.needMoreTime(d,TODAY,NOW,15).data.sessions[0].plannedMinutes).toBe(45)});
  it("low focus creates ten minute stop",()=>{const d=journey.arrive(boarded(),TODAY,NOW).data;const r=journey.lowFocus(d,TODAY,NOW).data.journeys[0];expect(new Date(r.stopEndsAt!).getTime()-new Date(NOW).getTime()).toBe(600000)});
  it("pauses and resumes",()=>{const p=journey.pause(boarded(),TODAY).data;expect(journey.resume(p,TODAY,NOW).data.journeys[0].phase).toBe("cabin")});
  it("reassesses focus",()=>expect(journey.reassessFocus(boarded(),TODAY,NOW,"sharp").data.journeys[0].focus).toBe("sharp"));
  it("ends journey",()=>expect(journey.endJourney(boarded(),TODAY,NOW).data.journeys[0].phase).toBe("final"));
  it("issues one ticket",()=>{const d=journey.issueTicket(boarded(),TODAY,NOW).data;expect(journey.issueTicket(d,TODAY,NOW).data.tickets).toHaveLength(1)});
  it("settles stale stations",()=>{const d={...data(),sessions:[session("old",{plannedEnd:"2020-01-01T10:00:00Z"})]};expect(journey.settleStale(d,NOW).sessions[0].endedBy).toBe("unreached")});
  it("reopens final service",()=>{const d=journey.endJourney(boarded(),TODAY,NOW).data;expect(journey.continueService(d,TODAY).data.journeys[0].phase).toBe("boarding")});
  it("locked route does not reorder",()=>{const d={...data(),sessions:[session("a",{locked:true}),session("b",{sequence:1})]};expect(ops.reorder(d,"a",1,NOW)).toBe(d)});
  it("archive remove keeps task",()=>expect(ops.removeTask(data(),"a",TODAY,NOW).tasks[0].status).toBe("archived"));
});

describe("rescue, learning and stats",()=>{
  it("offers remedies in order",()=>{const d=data([task("a",{remainingMinutes:1000,deadline:TODAY})]);const c=allocate(d,TODAY).conflicts[0];expect(rescuePlan(d,c,TODAY).steps[0].kind).toBe("shorter-stops")});
  it("never trims importance five",()=>{const d=data([task("a",{remainingMinutes:1000,deadline:TODAY,importance:5})]);const c=allocate(d,TODAY).conflicts[0];expect(rescuePlan(d,c,TODAY).steps.some(s=>s.kind==="trim")).toBe(false)});
  it("never trims twice",()=>{const d=data([task("a",{remainingMinutes:1000,deadline:TODAY,trimmedMinutes:20})]);const c=allocate(d,TODAY).conflicts[0];expect(rescuePlan(d,c,TODAY).steps.some(s=>s.kind==="trim")).toBe(false)});
  it("applies short stops",()=>expect(applyRescue(data(),[{kind:"shorter-stops",gain:10,details:{}}]).profile.shortStops).toBe(true));
  it("applies extra time",()=>expect(applyRescue(data(),[{kind:"more-time",gain:60,details:{date:TODAY,minutes:60}}]).windows.some(w=>w.specificDate===TODAY)).toBe(true));
  it("applies trim",()=>expect(applyRescue(data(),[{kind:"trim",gain:10,details:{taskId:"a",minutes:10}}]).tasks[0].remainingMinutes).toBe(50));
  it("applies deadline move",()=>expect(applyRescue(data(),[{kind:"move-deadline",gain:60,details:{taskId:"a",days:2}}]).tasks[0].deadline).toBe("2026-10-02"));
  it.each([["수학 문제집","math:problems"],["Math problem set","math:problems"],["数学問題","math:problems"],["数学题","math:problems"],["수학 개념 정리","math:concept"]])("classifies %s",(title,signature)=>expect(taskSignature(title)).toBe(signature));
  it("matches across languages",()=>expect(similarTasks({title:"수학 문제집"},[task("m",{title:"Math problem set"})])).toHaveLength(1));
  it("requires three tasks for feel",()=>expect(feelSuggestion("수학 문제집",[task("1",{title:"Math problem set",status:"done"})])).toBeNull());
  it("suggests feel after threshold",()=>expect(feelSuggestion("수학 문제집",[1,2,3].map(i=>task(String(i),{title:"Math problem set",status:"done",interest:4,difficulty:2})))?.interest).toBe(4));
  it("calibrates estimate",()=>{const tasks=[1,2,3].map(i=>task(String(i),{title:"Math problem set",status:"done"}));const d={...data(tasks),sessions:tasks.map((x,i)=>session(String(i),{taskId:x.id,completedMinutes:90,status:"done"}))};expect(calibratedEstimate("수학 문제집",tasks,d)).toBe(1.5)});
  it("focus profile waits for data",()=>expect(focusProfile(data())).toBeNull());
  it("summarizes journey",()=>{const d=journey.board({...data(),sessions:[session("s",{status:"done",creditedMinutes:20})]},TODAY,NOW,"steady","rain").data;expect(journeySummary(d,d.journeys[0].id).focusedMinutes).toBe(20)});
  it("archive stats total",()=>expect(archiveStats({...data(),sessions:[session("s",{status:"done",creditedMinutes:20})]},TODAY).focusedMinutes).toBe(20));
  it("ticket face prints serial",()=>{const d=journey.issueTicket(boardedData(),TODAY,NOW).data;expect(ticketFace(d,d.tickets[0].id).serial).toContain("20260928")});
});
function boardedData(){return journey.board({...data(),sessions:[session()]},TODAY,NOW,"steady","rain").data}

const phrases: [string, Partial<{duration:number; deadline:DateKey; recurrence:string}>][] = [
  ["수학 문제집 오늘 90분",{duration:90,deadline:TODAY}],["영어 단어 내일 30분",{duration:30,deadline:"2026-09-29"}],["과학 모레 2시간",{duration:120,deadline:"2026-09-30"}],["독서 1.5h",{duration:90}],["국어 매일 20분",{duration:20,recurrence:"daily"}],["역사 매주 월수금 45분",{duration:45,recurrence:"weekly"}],["발표 9월 30일 2시간",{duration:120,deadline:"2026-09-30"}],["중요 화학 정리 오늘 60분",{duration:60,deadline:TODAY}],["Math problems today 90 minutes",{duration:90,deadline:TODAY}],["English vocab tomorrow 30m",{duration:30,deadline:"2026-09-29"}],["Science day after tomorrow 2 hours",{duration:120,deadline:"2026-09-30"}],["Read notes 1.5h",{duration:90}],["Review every day 20 minutes",{duration:20,recurrence:"daily"}],["Math by Friday 45 min",{duration:45}],["Important essay tomorrow 2h",{duration:120,deadline:"2026-09-29"}],["Physics problems today 60m",{duration:60,deadline:TODAY}],["数学問題 今日 90分",{duration:90,deadline:TODAY}],["英語 明日 30分",{duration:30,deadline:"2026-09-29"}],["科学 後日 2時間",{duration:120,deadline:"2026-09-30"}],["読書 1.5h",{duration:90}],["単語 毎日 20分",{duration:20,recurrence:"daily"}],["数学 毎週 月水金 45分",{duration:45,recurrence:"weekly"}],["重要 レポート 明日 2時間",{duration:120,deadline:"2026-09-29"}],["物理 今日 60分",{duration:60,deadline:TODAY}],["数学题 今天 90分钟",{duration:90,deadline:TODAY}],["英语 明天 30分钟",{duration:30,deadline:"2026-09-29"}],["科学 后天 两个小时",{duration:120,deadline:"2026-09-30"}],["阅读 1.5h",{duration:90}],["单词 每天 20分钟",{duration:20,recurrence:"daily"}],["数学 每周 月水金 45分钟",{duration:45,recurrence:"weekly"}],["重要 报告 明天 两个小时",{duration:120,deadline:"2026-09-29"}],["物理 今天 60分钟",{duration:60,deadline:TODAY}],["화학 오늘 15분",{duration:15,deadline:TODAY}],["생물 내일 25분",{duration:25,deadline:"2026-09-29"}],["Geometry today 40m",{duration:40,deadline:TODAY}],["Essay tomorrow 75 minutes",{duration:75,deadline:"2026-09-29"}],["現代文 今日 40分",{duration:40,deadline:TODAY}],["作文 明日 75分",{duration:75,deadline:"2026-09-29"}],["语文 今天 40分钟",{duration:40,deadline:TODAY}],["作文 明天 75分钟",{duration:75,deadline:"2026-09-29"}],["수학 3시간",{duration:180}],["Math 3 hours",{duration:180}],["数学 3時間",{duration:180}],["数学 三个小时",{duration:180}]
];
describe("quick add four languages",()=>{it.each(phrases)("parses %s",(phrase,expected)=>{const result=parseQuickAdd(phrase,NOW);if(expected.duration)expect(result.duration).toBe(expected.duration);if(expected.deadline)expect(result.deadline).toBe(expected.deadline);if(expected.recurrence)expect(result.recurrence?.freq).toBe(expected.recurrence)})});

describe("i18n and normalization",()=>{
  it.each(Object.keys(en) as (keyof typeof en)[])("all locales include %s",key=>{expect(ko[key]).toBeTruthy();expect(ja[key]).toBeTruthy();expect(zh[key]).toBeTruthy()});
  it.each([["en",90,"1h 30m"],["ko",90,"1시간 30분"],["ja",90,"1時間30分"],["zh",90,"1小时30分钟"]] as const)("formats %s duration without doubled units",(locale,minutes,expected)=>expect(formatDuration(locale,minutes)).toBe(expected));
  it("normalizes null",()=>expect(normalizeData(null,NOW).tasks).toEqual([]));
  it("fills old task fields",()=>{const normalized=normalizeData({tasks:[{id:"old",title:"Old"}]},NOW);expect(normalized.tasks[0].remainingMinutes).toBe(30)});
  it("never throws on primitives",()=>expect(()=>normalizeData("old",NOW)).not.toThrow());
  it.each(Array.from({length:16},(_,i)=>i))("localizes station %i",index=>{expect(stationName(index,"ko")).not.toBe(stationName(index,"en"));expect(stationName(index,"ja")).toBeTruthy();expect(stationName(index,"zh")).toBeTruthy()});
  it("seeds journey numbers deterministically",()=>expect(seededJourneyNumbers(TODAY)).toEqual(seededJourneyNumbers(TODAY)));
});
