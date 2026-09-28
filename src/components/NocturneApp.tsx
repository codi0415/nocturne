"use client";
import { useEffect, useMemo, useState } from "react";
import { useNocturne } from "@/store/useNocturne";
import { NightScene } from "./NightScene";
import { useAudio } from "./useAudio";
import { t, formatDate, formatDuration, type MessageKey } from "@/i18n";
import { allocate } from "@/core/allocate";
import { arrivalForecasts } from "@/core/arrival";
import { rescuePlan } from "@/core/rescue";
import { parseQuickAdd } from "@/core/quickadd";
import { feelSuggestion } from "@/core/learning";
import { archiveStats, ticketFace } from "@/core/stats";
import { stationName } from "@/core/stations";
import { previewImport } from "@/core/repository";
import {
  type CarriageId,
  type DateKey,
  type FocusLevel,
  type Locale,
  type NocturneData,
  type Task,
} from "@/core/types";
import { WebMCPBridge } from "./WebMCPBridge";

const nowIso = () => new Date().toISOString();
const todayKey = (): DateKey => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}` as DateKey;
};
const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const timeOnly = (iso: string) => (iso ? iso.slice(11, 16) : "--:--");

function Icon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    tonight: (
      <>
        <path d="M4 12h16M7 12v7m10-7v7M9 8h6l2 4H7l2-4Z" />
      </>
    ),
    tasks: (
      <>
        <path d="M6 4h12v16H6z" />
        <path d="M9 8h6M9 12h6M9 16h4" />
      </>
    ),
    route: (
      <>
        <circle cx="7" cy="5" r="2" />
        <circle cx="17" cy="19" r="2" />
        <path d="M7 7v5c0 2 2 3 4 3h2c2 0 4 1 4 3v-1" />
      </>
    ),
    archive: (
      <>
        <path d="M4 7h16v13H4zM3 4h18v3H3z" />
        <path d="M9 11h6" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2" />
      </>
    ),
    lines: (
      <>
        <path d="M5 18c3-6 4-12 8-12 3 0 3 5 6 3" />
        <circle cx="5" cy="18" r="2" />
        <circle cx="19" cy="9" r="2" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

export function NocturneApp() {
  const store = useNocturne();
  useEffect(() => {
    store.hydrate();
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register(`${base}/sw.js`).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!store.hydrated)
    return (
      <div className="onboarding">
        <div className="lamp-dot" aria-label="Loading" />
      </div>
    );
  if (!store.data.profile.onboardedAt) return <Onboarding />;
  return (
    <div className="app">
      <WebMCPBridge />
      <div className="shell">
        <Rail />
        <main className="main">
          {store.screen === "tonight" && <Tonight />}
          {store.screen === "tasks" && <Tasks />}
          {store.screen === "route" && <Route />}
          {store.screen === "archive" && <Archive />}
          {store.screen === "settings" && <Settings />}
          {store.screen === "lines" && <Lines />}
          {store.screen === "service" && <Service />}
        </main>
      </div>
      <BottomNav />
      <button
        className="quick-fab"
        aria-label={t(store.data.profile.locale, "quickAdd")}
        onClick={() => store.setQuickOpen(true)}
      >
        ＋
      </button>
      {store.quickOpen && (
        <QuickAdd onClose={() => store.setQuickOpen(false)} />
      )}
      {store.data.journeys.some(
        (j) => j.date === todayKey() && !j.completedAt,
      ) && <JourneyOverlay />}
    </div>
  );
}

const navItems: {
  id: "tonight" | "tasks" | "route" | "archive" | "settings";
  key: MessageKey;
}[] = [
  { id: "tonight", key: "tonight" },
  { id: "tasks", key: "tasks" },
  { id: "route", key: "route" },
  { id: "archive", key: "archive" },
  { id: "settings", key: "settings" },
];
function Rail() {
  const { screen, setScreen, setQuickOpen, data } = useNocturne();
  const l = data.profile.locale;
  return (
    <aside className="rail">
      <div className="brand">NOCTURNE</div>
      <nav className="rail-nav" aria-label="Main navigation">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-button ${screen === item.id ? "active" : ""}`}
            onClick={() => setScreen(item.id)}
          >
            <Icon name={item.id} />
            <span>{t(l, item.key)}</span>
          </button>
        ))}
        <button
          className={`nav-button ${screen === "lines" ? "active" : ""}`}
          onClick={() => setScreen("lines")}
        >
          <Icon name="lines" />
          <span>{t(l, "lines")}</span>
        </button>
      </nav>
      <div className="rail-bottom stack">
        <button className="button primary" onClick={() => setQuickOpen(true)}>
          ＋ {t(l, "quickAdd")}
        </button>
        <button className="button ghost" onClick={() => setScreen("service")}>
          {t(l, "service")}
        </button>
        <span className="eyebrow">{t(l, "allLocal")}</span>
      </div>
    </aside>
  );
}
function BottomNav() {
  const { screen, setScreen, data } = useNocturne();
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {navItems.map((item) => (
        <button
          key={item.id}
          className={`nav-button ${screen === item.id ? "active" : ""}`}
          onClick={() => setScreen(item.id)}
        >
          <Icon name={item.id} />
          <span>{t(data.profile.locale, item.key)}</span>
        </button>
      ))}
    </nav>
  );
}

function Onboarding() {
  const complete = useNocturne((s) => s.completeOnboarding);
  const addTask = useNocturne((s) => s.addTask);
  const [step, setStep] = useState(0);
  const [locale, setLocale] = useState<Locale>("ko");
  const [name, setName] = useState("");
  const [start, setStart] = useState("19:00");
  const [end, setEnd] = useState("23:00");
  const [entries, setEntries] = useState(["", ""]);
  const [carriage, setCarriage] = useState<CarriageId>("rain");
  const [sound, setSound] = useState(true);
  const l = locale;
  const finish = () => {
    complete(name.trim(), locale, start, end, carriage, sound);
    const today = todayKey(),
      now = nowIso();
    entries.filter(Boolean).forEach((entry, index) => {
      const parsed = parseQuickAdd(entry, now, []);
      const minutes = parsed.duration ?? 45;
      addTask(
        {
          id: uid("task"),
          title: parsed.title || entry,
          description: "",
          deadline: parsed.deadline,
          estimatedMinutes: minutes,
          userEstimatedMinutes: null,
          remainingMinutes: minutes,
          interest: 3,
          difficulty: 3,
          importance: parsed.importance ?? 3,
          splittable: true,
          minSessionMinutes: 15,
          maxSessionMinutes: 50,
          recurrence: parsed.recurrence,
          status: "active",
          lineId: null,
          createdAt: now,
          updatedAt: now,
          completedAt: null,
        },
        today,
        now,
      );
    });
  };
  return (
    <div className="onboarding">
      <section className="onboarding-card card screen-enter">
        <div className="onboarding-progress">
          {[0, 1, 2, 3].map((i) => (
            <span className={i <= step ? "active" : ""} key={i} />
          ))}
        </div>
        {step === 0 && (
          <>
            <span className="eyebrow">NOCTURNE · 01</span>
            <h1 className="onboarding-title serif">{t(l, "welcome")}</h1>
            <p className="muted">{t(l, "welcomeNote")}</p>
            <div className="language-grid">
              {(["ko", "en", "ja", "zh"] as Locale[]).map((code) => (
                <button
                  className={`choice ${locale === code ? "selected" : ""}`}
                  key={code}
                  onClick={() => setLocale(code)}
                >
                  <span className="eyebrow">{code.toUpperCase()}</span>
                  <br />
                  {code === "ko"
                    ? "한국어"
                    : code === "en"
                      ? "English"
                      : code === "ja"
                        ? "日本語"
                        : "中文"}
                </button>
              ))}
            </div>
            <div className="field" style={{ marginTop: 18 }}>
              <label>{t(l, "name")}</label>
              <input
                className="input"
                aria-label={t(l, "name")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t(l, "namePlaceholder")}
              />
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <span className="eyebrow">02 · {t(l, "service")}</span>
            <h1 className="onboarding-title serif">{t(l, "serviceSetup")}</h1>
            <div className="time-grid">
              <div className="field">
                <label>{t(l, "start")}</label>
                <input
                  className="input mono"
                  aria-label={t(l, "start")}
                  type="time"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </div>
              <div className="field">
                <label>{t(l, "end")}</label>
                <input
                  className="input mono"
                  aria-label={t(l, "end")}
                  type="time"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </div>
            </div>
            <p className="muted">
              {t(l, "weekday")} · {start}—{end}
            </p>
          </>
        )}
        {step === 2 && (
          <>
            <span className="eyebrow">03 · {t(l, "tasks")}</span>
            <h1 className="onboarding-title serif">{t(l, "tasksSetup")}</h1>
            <div className="stack">
              {entries.map((value, i) => (
                <input
                  key={i}
                  className="input"
                  aria-label={`${t(l, "tasks")} ${i + 1}`}
                  value={value}
                  onChange={(e) =>
                    setEntries(
                      entries.map((v, j) => (j === i ? e.target.value : v)),
                    )
                  }
                  placeholder={
                    i === 0
                      ? t(l, "quickPlaceholder")
                      : l === "ko"
                        ? "영어 단어 매일 30분"
                        : "Read notes every day 30 minutes"
                  }
                />
              ))}
            </div>
            <p className="muted">{t(l, "skip")}</p>
          </>
        )}
        {step === 3 && (
          <>
            <span className="eyebrow">04 · CABIN</span>
            <h1 className="onboarding-title serif">{t(l, "carriageSetup")}</h1>
            <div className="carriage-grid">
              {(["quiet", "rain", "tunnel", "moon"] as CarriageId[]).map(
                (id) => (
                  <button
                    key={id}
                    className={`choice ${carriage === id ? "selected" : ""}`}
                    onClick={() => setCarriage(id)}
                  >
                    <span className="eyebrow">{id}</span>
                    <br />
                    {t(l, id)}
                  </button>
                ),
              )}
            </div>
            <div className="switch-row">
              <span>{t(l, "sound")}</span>
              <button
                className={`switch ${sound ? "on" : ""}`}
                onClick={() => setSound(!sound)}
                aria-pressed={sound}
              >
                <span />
              </button>
            </div>
          </>
        )}
        <div className="button-row" style={{ marginTop: 28 }}>
          {step > 0 && (
            <button className="button" onClick={() => setStep(step - 1)}>
              {t(l, "cancel")}
            </button>
          )}
          <button
            className="button primary"
            onClick={() => (step < 3 ? setStep(step + 1) : finish())}
          >
            {step < 3 ? t(l, "next") : t(l, "done")}
          </button>
        </div>
      </section>
    </div>
  );
}

function Tonight() {
  const { data, coachOpen, dismissCoach, setScreen, board, continueService } =
    useNocturne();
  const today = todayKey(),
    l = data.profile.locale;
  const sessions = data.sessions
    .filter((s) => s.date === today && ["planned", "active"].includes(s.status))
    .sort((a, b) => a.sequence - b.sequence);
  const allocation = useMemo(() => allocate(data, today), [data, today]);
  const conflict = allocation.conflicts[0];
  const forecasts = arrivalForecasts(data, today);
  const first = sessions[0];
  const journey = data.journeys.find((j) => j.date === today);
  const [focus, setFocus] = useState<FocusLevel>("steady");
  const [carriage, setCarriage] = useState<CarriageId>(
    data.profile.preferredCarriage,
  );
  const [boarding, setBoarding] = useState(false);
  const debug =
    typeof window !== "undefined" &&
    new URLSearchParams(location.search).has("debug3d");
  return (
    <section className="tonight">
      <NightScene scene="platform" carriage={carriage} debug={debug} />
      <div className="page screen-enter">
        {coachOpen && (
          <div className="coach glass">
            <span className="eyebrow">GUIDE</span>
            <p>{t(l, "coach")}</p>
            <button className="button small" onClick={dismissCoach}>
              {t(l, "dismiss")}
            </button>
          </div>
        )}
        <div>
          <span className="eyebrow">
            <span
              className="lamp-dot"
              style={{ display: "inline-block", marginRight: 8 }}
            />
            {formatDate(l, today)} · {t(l, "departure")}
          </span>
          <div className="hero-time mono">
            {first ? timeOnly(first.plannedStart) : "— —:— —"}
          </div>
          {first ? (
            <>
              <p className="eyebrow">
                {t(l, "nextStation")} · {stationName(first.sequence, l)}
              </p>
              <h1 className="hero-next serif">
                {data.tasks.find((task) => task.id === first.taskId)?.title}
              </h1>
              <div className="departure-actions">
                <button
                  className="button primary"
                  onClick={() => setBoarding(true)}
                >
                  {t(l, "board")}
                </button>
                <div className="forecast-chip">
                  {forecasts.every((f) => f.onTime !== false)
                    ? t(l, "makeIt")
                    : t(l, "notYet")}
                </div>
              </div>
            </>
          ) : (
            <div className="empty" style={{ maxWidth: 560, textAlign: "left" }}>
              <p>{data.windows.length ? t(l, "noTasks") : t(l, "noService")}</p>
              <button
                className="button"
                onClick={() =>
                  setScreen(data.windows.length ? "tasks" : "service")
                }
              >
                {data.windows.length ? t(l, "quickAdd") : t(l, "editService")}
              </button>
            </div>
          )}
          {journey?.phase === "final" && sessions.length > 0 && (
            <button className="button" onClick={() => continueService(today)}>
              {t(l, "keepGoing")}
            </button>
          )}
        </div>
        <div>
          {conflict && <Rescue conflict={conflict} />}
          <div className="board-panel glass">
            <div className="board-head">
              <span>TIME</span>
              <span>STATION</span>
              <span>TASK</span>
              <span>STATUS</span>
            </div>
            {sessions.slice(0, 8).map((session, index) => (
              <div className="board-row" key={session.id}>
                <span className="mono">{timeOnly(session.plannedStart)}</span>
                <span className="station-name">{stationName(index, l)}</span>
                <span className="board-task">
                  {data.tasks.find((task) => task.id === session.taskId)?.title}
                </span>
                <span className="status">{t(l, "onTime")}</span>
              </div>
            ))}
            {!sessions.length && (
              <div className="empty" style={{ margin: "8px 0" }}>
                {t(l, "emptyRoute")}
              </div>
            )}
          </div>
        </div>
      </div>
      {boarding && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={t(l, "signalCheck")}
          onKeyDown={(e) => {
            if (e.key === "Escape") setBoarding(false);
          }}
        >
          <div className="sheet">
            <div className="sheet-head">
              <h2>{t(l, "signalCheck")}</h2>
              <button
                className="icon-button"
                onClick={() => setBoarding(false)}
                aria-label={t(l, "close")}
              >
                ×
              </button>
            </div>
            <div className="language-grid">
              {(["low", "steady", "sharp"] as FocusLevel[]).map((level) => (
                <button
                  key={level}
                  className={`choice ${focus === level ? "selected" : ""}`}
                  onClick={() => setFocus(level)}
                >
                  {t(l, level)}
                </button>
              ))}
            </div>
            <h3>{t(l, "chooseCarriage")}</h3>
            <div className="carriage-grid">
              {(["quiet", "rain", "tunnel", "moon"] as CarriageId[]).map(
                (id) => (
                  <button
                    key={id}
                    className={`choice ${carriage === id ? "selected" : ""}`}
                    onClick={() => setCarriage(id)}
                  >
                    {t(l, id)}
                  </button>
                ),
              )}
            </div>
            <button
              className="button primary"
              style={{ marginTop: 18 }}
              onClick={() => {
                board(today, nowIso(), focus, carriage);
                setBoarding(false);
              }}
            >
              {t(l, "takeTicket")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function Rescue({
  conflict,
}: {
  conflict: ReturnType<typeof allocate>["conflicts"][number];
}) {
  const { data, applyRescue } = useNocturne();
  const l = data.profile.locale,
    today = todayKey();
  const plan = rescuePlan(data, conflict, today);
  const labels: Record<string, MessageKey> = {
    "shorter-stops": "shorterStops",
    "more-time": "moreTime",
    trim: "trim",
    "move-deadline": "moveDeadline",
  };
  return (
    <div className="card conflict-card" style={{ marginBottom: 14 }}>
      <span className="eyebrow">SIGNAL CHANGE</span>
      <h2 className="serif" style={{ fontSize: "2rem", margin: "6px 0" }}>
        {t(l, "rescueTitle")}
      </h2>
      {plan.steps.map((step, index) => (
        <div className="rescue-step" key={`${step.kind}-${index}`}>
          <div>
            <b>{t(l, labels[step.kind])}</b>
            <div className="row-meta">+ {formatDuration(l, step.gain)}</div>
          </div>
          <button
            className="button small"
            onClick={() => applyRescue([step], today, nowIso())}
          >
            {t(l, "apply")}
          </button>
        </div>
      ))}
      <div className="button-row" style={{ marginTop: 14 }}>
        <button
          className="button primary"
          onClick={() => applyRescue(plan.steps, today, nowIso())}
        >
          {t(l, "applyAll")}
        </button>
      </div>
      <div className="metric-grid">
        <div className="metric">
          <span>{t(l, "required")}</span>
          <b>{conflict.requiredMinutes}</b>
        </div>
        <div className="metric">
          <span>{t(l, "available")}</span>
          <b>{conflict.availableMinutes}</b>
        </div>
        <div className="metric">
          <span>{t(l, "shortfall")}</span>
          <b>{conflict.shortfallMinutes}</b>
        </div>
      </div>
    </div>
  );
}

function PageHeader({
  label,
  title,
  action,
}: {
  label: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        <span className="eyebrow">{label}</span>
        <h1 className="page-title serif">{title}</h1>
      </div>
      {action}
    </div>
  );
}
function Tasks() {
  const { data, setQuickOpen, finishTask, removeTask } = useNocturne();
  const l = data.profile.locale,
    today = todayKey();
  const active = data.tasks.filter((task) => task.status !== "archived");
  const groups = [
    { key: "today", items: active.filter((task) => task.deadline === today) },
    { key: "someday", items: active.filter((task) => !task.deadline) },
    {
      key: "later",
      items: active.filter((task) => task.deadline && task.deadline !== today),
    },
  ] as const;
  return (
    <div className="page screen-enter">
      <PageHeader
        label="STATIONS"
        title={t(l, "tasks")}
        action={
          <button className="button primary" onClick={() => setQuickOpen(true)}>
            ＋ {t(l, "quickAdd")}
          </button>
        }
      />
      <div className="content-two">
        <div className="stack">
          {groups.map((group) => (
            <section className="card" key={group.key}>
              <span className="eyebrow">{t(l, group.key)}</span>
              {group.items.length ? (
                group.items.map((task) => (
                  <div className="list-row" key={task.id}>
                    <div className="row-main">
                      <h3 className="row-title">{task.title}</h3>
                      <div className="row-meta">
                        {formatDuration(l, task.remainingMinutes)}{" "}
                        {t(l, "remaining")} ·{" "}
                        {task.deadline
                          ? formatDate(l, task.deadline)
                          : t(l, "dateNone")}
                      </div>
                    </div>
                    <div className="button-row">
                      <button
                        className="button small"
                        onClick={() => finishTask(task.id, today, nowIso())}
                      >
                        {t(l, "complete")}
                      </button>
                      <button
                        className="button small"
                        onClick={() => removeTask(task.id, today, nowIso())}
                      >
                        {t(l, "archive")}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty">{t(l, "noTaskYet")}</div>
              )}
            </section>
          ))}
        </div>
        <div className="card">
          <span className="eyebrow">{t(l, "arrivalForecast")}</span>
          {arrivalForecasts(data, today).map((item) => (
            <div className="list-row" key={item.taskId}>
              <span>
                {data.tasks.find((task) => task.id === item.taskId)?.title}
              </span>
              <span className={`pill ${item.onTime === false ? "signal" : ""}`}>
                {item.arrival ? formatDate(l, item.arrival) : "—"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Route() {
  const { data, reorder, lock, skipSession, optimize } = useNocturne();
  const l = data.profile.locale,
    today = todayKey();
  const sessions = data.sessions
    .filter((s) => s.date === today)
    .sort((a, b) => a.sequence - b.sequence);
  return (
    <div className="page screen-enter">
      <PageHeader
        label="LINE TONIGHT"
        title={t(l, "route")}
        action={
          <button className="button" onClick={() => optimize(today, nowIso())}>
            {t(l, "optimize")}
          </button>
        }
      />
      <p className="muted">{t(l, "routeNote")}</p>
      <div className="card route-line">
        {sessions.length ? (
          sessions.map((session, index) => (
            <div
              className={`station-row ${session.locked ? "locked" : ""}`}
              key={session.id}
            >
              <div className="station-time">
                {timeOnly(session.plannedStart)}—{timeOnly(session.plannedEnd)}
              </div>
              <div className="station-name">{stationName(index, l)}</div>
              <h3>
                {data.tasks.find((task) => task.id === session.taskId)?.title}
              </h3>
              <div className="station-actions">
                <button
                  onClick={() => reorder(session.id, -1, nowIso())}
                  disabled={index === 0 || session.locked}
                >
                  {t(l, "moveUp")}
                </button>
                <button
                  onClick={() => reorder(session.id, 1, nowIso())}
                  disabled={index === sessions.length - 1 || session.locked}
                >
                  {t(l, "moveDown")}
                </button>
                <button onClick={() => lock(session.id)}>
                  {t(l, session.locked ? "unlock" : "lock")}
                </button>
                <button onClick={() => skipSession(session.id, nowIso())}>
                  {t(l, "skip")}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="empty">{t(l, "emptyRoute")}</div>
        )}
      </div>
    </div>
  );
}

function QuickAdd({ onClose }: { onClose: () => void }) {
  const { data, addTask } = useNocturne();
  const l = data.profile.locale;
  const [input, setInput] = useState("");
  const parsed = parseQuickAdd(input, nowIso(), data.lines);
  const feel = feelSuggestion(parsed.title, data.tasks);
  const [interest, setInterest] = useState(feel?.interest ?? 3);
  const [difficulty, setDifficulty] = useState(feel?.difficulty ?? 3);
  const [importance, setImportance] = useState(parsed.importance ?? 3);
  const submit = () => {
    if (!input.trim()) return;
    const now = nowIso(),
      today = todayKey(),
      minutes = parsed.duration ?? 45;
    addTask(
      {
        id: uid("task"),
        title: parsed.title,
        description: "",
        deadline: parsed.deadline,
        estimatedMinutes: minutes,
        userEstimatedMinutes: null,
        remainingMinutes: minutes,
        interest: interest as Task["interest"],
        difficulty: difficulty as Task["difficulty"],
        importance: importance as Task["importance"],
        splittable: true,
        minSessionMinutes: 15,
        maxSessionMinutes: 50,
        recurrence: parsed.recurrence,
        status: "active",
        lineId: parsed.lineId,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
      },
      today,
      now,
    );
    onClose();
  };
  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={t(l, "quickAdd")}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="sheet">
        <div className="sheet-head">
          <h2>{t(l, "quickAdd")}</h2>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label={t(l, "close")}
          >
            ×
          </button>
        </div>
        <div className="stack">
          <input
            autoFocus
            className="input"
            aria-label={t(l, "quickAdd")}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t(l, "quickPlaceholder")}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
          />
          <div className="quick-preview">
            <span className="eyebrow">{t(l, "preview")}</span>
            <dl>
              <dt>{t(l, "taskTitle")}</dt>
              <dd>{parsed.title || "—"}</dd>
              <dt>{t(l, "deadline")}</dt>
              <dd className={!parsed.deadline ? "unsure" : ""}>
                {parsed.deadline
                  ? formatDate(l, parsed.deadline)
                  : t(l, "unsure")}
              </dd>
              <dt>{t(l, "minutes")}</dt>
              <dd className={!parsed.duration ? "unsure" : ""}>
                {parsed.duration
                  ? formatDuration(l, parsed.duration)
                  : t(l, "unsure")}
              </dd>
            </dl>
          </div>
          {(
            [
              ["interest", interest, setInterest],
              ["difficulty", difficulty, setDifficulty],
              ["importance", importance, setImportance],
            ] as [MessageKey, number, (n: number) => void][]
          ).map(([key, value, setter]) => (
            <div className="field" key={key}>
              <label>{t(l, key)}</label>
              <div className="level-grid">
                {[1, 2, 3, 4, 5].map((level) => (
                  <button
                    key={level}
                    className={`level-button ${value === level ? "selected" : ""}`}
                    onClick={() => setter(level)}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button
            className="button primary"
            onClick={submit}
            disabled={!input.trim()}
          >
            {t(l, "add")}
          </button>
        </div>
      </div>
    </div>
  );
}

function JourneyOverlay() {
  const {
    data,
    arrive,
    finishEarly,
    needMore,
    lowFocus,
    depart,
    extendStop,
    endJourney,
    issueTicket,
  } = useNocturne();
  const l = data.profile.locale,
    today = todayKey();
  const journey = data.journeys.find((j) => j.date === today && !j.completedAt);
  const active = data.sessions.find(
    (s) => s.date === today && s.status === "active",
  );
  const next = data.sessions
    .filter((s) => s.date === today && s.status === "planned")
    .sort((a, b) => a.sequence - b.sequence)[0];
  const task = data.tasks.find((task) => task.id === (active ?? next)?.taskId);
  const { start, stop, effect } = useAudio();
  const [seconds, setSeconds] = useState(
    active
      ? Math.max(0, active.plannedMinutes * 60 - active.elapsedSeconds)
      : 0,
  );
  const [controls, setControls] = useState(true);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [active]);
  if (!journey) return null;
  const finish = () => {
    endJourney(today, nowIso());
    issueTicket(today, nowIso());
    stop();
  };
  return (
    <section className="journey-overlay">
      <NightScene
        scene={
          journey.phase === "cabin" && journey.selectedCarriage === "tunnel"
            ? "tunnel"
            : "cabin"
        }
        carriage={journey.selectedCarriage}
      />
      <div className="journey-content" onClick={() => setControls(true)}>
        {journey.phase === "boarding" && (
          <div className="ritual-card glass screen-enter">
            <span className="eyebrow">
              PLATFORM {journey.platform} · CAR {journey.car}
            </span>
            <h1 className="focus-title serif">{t(l, "tapTicket")}</h1>
            <TicketCard data={data} provisional />
            <button
              className="button primary"
              style={{ marginTop: 24 }}
              onClick={() => {
                effect("beep");
                start(journey.selectedCarriage);
                arrive(today, nowIso());
              }}
            >
              {t(l, "board")}
            </button>
          </div>
        )}
        {journey.phase === "cabin" && (
          <>
            <div>
              <span className="eyebrow">
                {stationName(active?.sequence ?? 0, l)} · {t(l, "focused")}
              </span>
              <h1 className="focus-title serif">{task?.title}</h1>
              <div className="countdown">
                {String(Math.floor(seconds / 60)).padStart(2, "0")}:
                {String(seconds % 60).padStart(2, "0")}
              </div>
            </div>
            <div
              className="journey-controls"
              style={{ opacity: controls ? 1 : undefined }}
            >
              <button
                className="button"
                onClick={() => finishEarly(today, nowIso(), false)}
              >
                {t(l, "finishEarly")}
              </button>
              <button
                className="button"
                onClick={() => needMore(today, nowIso(), 10)}
              >
                +10
              </button>
              <button
                className="button"
                onClick={() => needMore(today, nowIso(), 15)}
              >
                +15
              </button>
              <button
                className="button"
                onClick={() => lowFocus(today, nowIso())}
              >
                {t(l, "lowFocus")}
              </button>
              <button className="button danger" onClick={finish}>
                {t(l, "endJourney")}
              </button>
            </div>
          </>
        )}
        {journey.phase === "stop" && (
          <div className="ritual-card glass">
            <span className="eyebrow">{t(l, "stationStop")}</span>
            <h1 className="focus-title serif">
              {stationName(next?.sequence ?? 0, l)}
            </h1>
            <p>{task?.title}</p>
            <div className="button-row" style={{ justifyContent: "center" }}>
              <button
                className="button primary"
                onClick={() => {
                  effect("chime");
                  depart(today, nowIso());
                  arrive(today, nowIso());
                }}
              >
                {t(l, "departNow")}
              </button>
              <button className="button" onClick={() => extendStop(today, 5)}>
                {t(l, "extend")}
              </button>
              <button className="button danger" onClick={finish}>
                {t(l, "endJourney")}
              </button>
            </div>
          </div>
        )}
        {journey.phase === "final" && (
          <div className="ritual-card glass">
            <span className="eyebrow">FINAL STATION</span>
            <h1 className="focus-title serif">{t(l, "finalStation")}</h1>
            <TicketCard data={data} />
            <button
              className="button primary"
              style={{ marginTop: 20 }}
              onClick={() => {
                issueTicket(today, nowIso());
                endJourney(today, nowIso());
              }}
            >
              {t(l, "archive")}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function TicketCard({
  data,
  provisional = false,
  ticketId,
}: {
  data: NocturneData;
  provisional?: boolean;
  ticketId?: string;
}) {
  const l = data.profile.locale;
  const journey = data.journeys.at(-1);
  const ticket = ticketId
    ? data.tickets.find((item) => item.id === ticketId)
    : data.tickets.find((item) => item.journeyId === journey?.id);
  const face = ticket ? ticketFace(data, ticket.id) : null;
  return (
    <div className="ticket">
      <div className="ticket-band" />
      <div className="ticket-grid">
        <div>
          <span className="eyebrow" style={{ color: "#5a4535" }}>
            NOCTURNE · NIGHT SERVICE
          </span>
          <h2 className="serif" style={{ fontSize: "2rem", margin: "8px 0" }}>
            {data.profile.name || t(l, "greeting")}
          </h2>
          <div className="ticket-serial">
            {face?.serial ?? (provisional ? "BOARDING PASS" : "—")}
          </div>
          <div className="barcode" />
        </div>
        <div>
          <div className="eyebrow" style={{ color: "#5a4535" }}>
            PLATFORM
          </div>
          <b className="mono">{journey?.platform ?? face?.platform}</b>
          <div className="eyebrow" style={{ color: "#5a4535", marginTop: 12 }}>
            CAR · SEAT
          </div>
          <b className="mono">
            {journey?.car ?? face?.car} · {journey?.seat ?? face?.seat}
          </b>
        </div>
      </div>
    </div>
  );
}

function Archive() {
  const { data } = useNocturne();
  const l = data.profile.locale,
    stats = archiveStats(data, todayKey());
  return (
    <div className="page screen-enter">
      <PageHeader label="TICKET WALLET" title={t(l, "archive")} />
      <div className="stat-grid" style={{ marginBottom: 22 }}>
        <div className="stat-card">
          <span className="eyebrow">{t(l, "streak")}</span>
          <b>{stats.streak}</b>
        </div>
        <div className="stat-card">
          <span className="eyebrow">{t(l, "focusedHours")}</span>
          <b>{(stats.focusedMinutes / 60).toFixed(1)}</b>
        </div>
        <div className="stat-card">
          <span className="eyebrow">{t(l, "stations")}</span>
          <b>{stats.completedStations}</b>
        </div>
      </div>
      <div className="card" style={{ marginBottom: 22 }}>
        <span className="eyebrow">7 NIGHTS</span>
        <div className="bars">
          {stats.focusByDay.map((day) => (
            <div
              key={day.date}
              className="bar"
              style={{ height: `${Math.max(4, Math.min(100, day.minutes))}%` }}
            >
              <span>{day.date.slice(8)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="wallet-grid">
        {data.tickets.length ? (
          data.tickets.map((ticket) => (
            <TicketCard key={ticket.id} data={data} ticketId={ticket.id} />
          ))
        ) : (
          <div className="empty">{t(l, "noTickets")}</div>
        )}
      </div>
    </div>
  );
}

function Service() {
  const { data, updateData, optimize } = useNocturne();
  const l = data.profile.locale;
  const recurring = data.windows.find(
    (w) => w.recurring && w.kind === "available",
  );
  const [start, setStart] = useState(recurring?.startTime ?? "19:00");
  const [end, setEnd] = useState(recurring?.endTime ?? "23:00");
  const save = () => {
    const others = data.windows.filter(
      (w) => !(w.recurring && w.kind === "available"),
    );
    const windows = [
      ...others,
      ...[1, 2, 3, 4, 5].map((dayOfWeek) => ({
        id: `weekday-${dayOfWeek}`,
        dayOfWeek,
        specificDate: null,
        startTime: start,
        endTime: end,
        recurring: true,
        enabled: true,
        kind: "available" as const,
      })),
    ];
    updateData({ ...data, windows });
    optimize(todayKey(), nowIso());
  };
  return (
    <div className="page screen-enter">
      <PageHeader label="TIMETABLE" title={t(l, "service")} />
      <section className="card" style={{ maxWidth: 700 }}>
        <span className="eyebrow">{t(l, "serviceEditor")}</span>
        <h2>{t(l, "weekday")}</h2>
        <div className="time-grid">
          <div className="field">
            <label>{t(l, "start")}</label>
            <input
              className="input mono"
              aria-label={t(l, "start")}
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>
          <div className="field">
            <label>{t(l, "end")}</label>
            <input
              className="input mono"
              aria-label={t(l, "end")}
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>
        </div>
        <button
          className="button primary"
          style={{ marginTop: 20 }}
          onClick={save}
        >
          {t(l, "save")}
        </button>
      </section>
    </div>
  );
}

function Lines() {
  const { data, updateData } = useNocturne();
  const l = data.profile.locale;
  const [title, setTitle] = useState("");
  const add = () => {
    if (!title.trim()) return;
    updateData({
      ...data,
      lines: [
        ...data.lines,
        {
          id: uid("line"),
          title: title.trim(),
          description: "",
          targetDate: null,
          createdAt: nowIso(),
        },
      ],
    });
    setTitle("");
  };
  return (
    <div className="page screen-enter">
      <PageHeader label="PROJECT LINES" title={t(l, "lines")} />
      <div className="grid-2">
        <div className="card">
          <div className="field">
            <label>{t(l, "lineName")}</label>
            <input
              className="input"
              aria-label={t(l, "lineName")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <button
            className="button primary"
            style={{ marginTop: 14 }}
            onClick={add}
          >
            {t(l, "addLine")}
          </button>
        </div>
        <div className="stack">
          {data.lines.length ? (
            data.lines.map((line) => (
              <div className="card" key={line.id}>
                <span className="eyebrow">LINE</span>
                <h2>{line.title}</h2>
                <div className="route-line">
                  {data.tasks
                    .filter((task) => task.lineId === line.id)
                    .map((task) => (
                      <div className="station-row" key={task.id}>
                        {task.title}
                      </div>
                    ))}
                </div>
              </div>
            ))
          ) : (
            <div className="empty">{t(l, "noLines")}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Settings() {
  const { data, updateData, reset } = useNocturne();
  const l = data.profile.locale;
  const [help, setHelp] = useState(false);
  const [importData, setImportData] = useState<{
    data: NocturneData;
    counts: Record<string, number>;
  } | null>(null);
  const profile = data.profile;
  const patch = (values: Partial<typeof profile>) =>
    updateData({ ...data, profile: { ...profile, ...values } });
  const download = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nocturne-${todayKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const readFile = (file?: File) => {
    if (!file) return;
    file.text().then((text) => {
      try {
        setImportData(previewImport(text));
      } catch {
        setImportData(null);
        alert(t(l, "invalidImport"));
      }
    });
  };
  return (
    <div className="page screen-enter">
      <PageHeader label="PREFERENCES" title={t(l, "settings")} />
      <div className="grid-2">
        <section className="card stack">
          <div className="field">
            <label>{t(l, "name")}</label>
            <input
              className="input"
              aria-label={t(l, "name")}
              value={profile.name}
              onChange={(e) => patch({ name: e.target.value })}
            />
          </div>
          <div className="field">
            <label>{t(l, "language")}</label>
            <select
              className="select"
              aria-label={t(l, "language")}
              value={l}
              onChange={(e) => patch({ locale: e.target.value as Locale })}
            >
              <option value="ko">한국어</option>
              <option value="en">English</option>
              <option value="ja">日本語</option>
              <option value="zh">中文</option>
            </select>
          </div>
          {(
            [
              ["autoTunnel", "autoTunnel"],
              ["shortStops", "shortStops"],
              ["learning", "learnFromSessions"],
              ["sound", "soundEnabled"],
            ] as [MessageKey, keyof typeof profile][]
          ).map(([key, field]) => (
            <div className="switch-row" key={key}>
              <span>{t(l, key)}</span>
              <button
                className={`switch ${profile[field] ? "on" : ""}`}
                aria-label={t(l, key)}
                aria-pressed={!!profile[field]}
                onClick={() => patch({ [field]: !profile[field] })}
              >
                <span />
              </button>
            </div>
          ))}
        </section>
        <section className="card stack">
          <span className="eyebrow">{t(l, "data")}</span>
          <button className="button" onClick={download}>
            {t(l, "export")}
          </button>
          <label className="button" style={{ textAlign: "center" }}>
            {t(l, "import")}
            <input
              type="file"
              accept="application/json"
              hidden
              onChange={(e) => readFile(e.target.files?.[0])}
            />
          </label>
          <button className="button" onClick={() => setHelp(true)}>
            {t(l, "glossary")}
          </button>
          <button
            className="button"
            onClick={() =>
              alert(
                l === "ko"
                  ? "브라우저 메뉴에서 홈 화면에 추가를 선택하세요."
                  : "Choose Add to Home Screen in your browser menu.",
              )
            }
          >
            {t(l, "install")}
          </button>
          <button
            className="button danger"
            onClick={() => {
              if (confirm(t(l, "resetConfirm"))) reset();
            }}
          >
            {t(l, "reset")}
          </button>
          <span className="eyebrow">{t(l, "allLocal")}</span>
        </section>
      </div>
      {help && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="sheet">
            <div className="sheet-head">
              <h2>{t(l, "glossary")}</h2>
              <button className="icon-button" onClick={() => setHelp(false)}>
                ×
              </button>
            </div>
            <p style={{ lineHeight: 2 }}>{t(l, "glossaryBody")}</p>
          </div>
        </div>
      )}
      {importData && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="sheet">
            <div className="sheet-head">
              <h2>{t(l, "importPreview")}</h2>
              <button
                className="icon-button"
                onClick={() => setImportData(null)}
              >
                ×
              </button>
            </div>
            {Object.entries(importData.counts).map(([key, value]) => (
              <div className="list-row" key={key}>
                <span>{key}</span>
                <b className="mono">{value}</b>
              </div>
            ))}
            <button
              className="button primary"
              style={{ marginTop: 18 }}
              onClick={() => {
                updateData(importData.data);
                setImportData(null);
              }}
            >
              {t(l, "replaceData")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
