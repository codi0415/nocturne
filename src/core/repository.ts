import { normalizeData, type NocturneData } from "./types";

export interface DataRepository { load(): NocturneData; save(data: NocturneData): void; subscribe(listener: (data: NocturneData) => void): () => void; }
const KEY = "nocturne-data-v1";
export function createLocalRepository(storage: Pick<Storage, "getItem" | "setItem">): DataRepository {
  const listeners = new Set<(data: NocturneData) => void>();
  return {
    load() { try { const raw = storage.getItem(KEY); return normalizeData(raw ? JSON.parse(raw) : null, new Date().toISOString()); } catch { return normalizeData(null, new Date().toISOString()); } },
    save(data) { const serialized = JSON.stringify(normalizeData(data, new Date().toISOString())); storage.setItem(KEY, serialized); listeners.forEach(listener => listener(data)); },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  };
}
export function previewImport(raw: string) { const data = normalizeData(JSON.parse(raw)); return { data, counts: { tasks: data.tasks.length, stations: data.sessions.length, tickets: data.tickets.length, lines: data.lines.length } }; }
