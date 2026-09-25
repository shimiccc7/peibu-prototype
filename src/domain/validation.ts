import type { AppState, ExecutionRecord, Mode, PlanChange, Profile, Task, WeekTemplate } from './types.js';
import { emptyState, saveProfile, validDate, validateTask } from './planner.js';

export const MAX_BACKUP_BYTES = 1_000_000;
function obj(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('資料格式錯誤。');
  return value as Record<string, unknown>;
}
function text(value: unknown, max = 2000): string {
  if (typeof value !== 'string' || value.length > max) throw new Error('文字欄位格式錯誤。'); return value;
}
function number(value: unknown, min = 0, max = 9999, integer = false): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) throw new Error('數字欄位格式錯誤。'); return value;
}
function nullable(value: unknown, max = 9999): number | null { return value === null ? null : number(value, 0, max); }
function flag(value: unknown): boolean { if (typeof value !== 'boolean') throw new Error('布林欄位格式錯誤。'); return value; }
function array(value: unknown, max = 10000): unknown[] {
  if (!Array.isArray(value) || value.length > max) throw new Error('清單格式或大小錯誤。'); return value;
}
function date(value: unknown): string { const result = text(value, 10); if (!validDate(result)) throw new Error('日期欄位格式錯誤。'); return result; }
function stamp(value: unknown): string {
  const result = text(value, 40); if (!/^\d{4}-\d\d-\d\dT/.test(result) || !Number.isFinite(Date.parse(result))) throw new Error('時間戳記無效。'); return result;
}
function mode(value: unknown): Mode { if (value !== 'normal' && value !== 'compact' && value !== 'rest') throw new Error('模式無效。'); return value; }
function id(value: unknown): string { const result = text(value, 100); if (!/^[A-Za-z0-9_-]+$/.test(result)) throw new Error('識別碼無效。'); return result; }
function task(value: unknown): Task {
  const v = obj(value);
  const category = text(v.category, 20);
  if (!['practice', 'school', 'life', 'lesson'].includes(category)) throw new Error('活動類型無效。');
  const t: Task = { id: id(v.id), date: date(v.date), start: text(v.start, 5), title: text(v.title, 100),
    category: category as Task['category'], minutes: number(v.minutes, 1, 240, true), compactMinutes: number(v.compactMinutes, 1, 240, true),
    flexible: flag(v.flexible), goal: text(v.goal, 500), note: text(v.note, 2000), target: nullable(v.target), unit: text(v.unit, 12), archived: flag(v.archived) };
  validateTask(t); return t;
}
function unique(ids: string[]): void { if (new Set(ids).size !== ids.length) throw new Error('資料含重複識別碼，未匯入。'); }
/** Strict, size-bounded versioned import. Historical HTML backups are intentionally incompatible. */
export function parseBackup(raw: string): AppState {
  if (new TextEncoder().encode(raw).byteLength > MAX_BACKUP_BYTES) throw new Error('備份超過1 MB；第一版請保留小規模資料。');
  let decoded: unknown; try { decoded = JSON.parse(raw); } catch { throw new Error('不是有效的JSON備份。'); }
  const v = obj(decoded);
  if (v.schemaVersion !== 1) throw new Error('不是陪步 v1 備份。舊版連假HTML備份尚不支援匯入。');
  const p = obj(v.profile);
  const profile: Profile = { childName: text(p.childName, 30), goal: text(p.goal, 200), fontScale: number(p.fontScale, 1, 1.2), dayStart: text(p.dayStart, 5), dayEnd: text(p.dayEnd, 5) };
  saveProfile(emptyState(), profile);
  const tasks = array(v.tasks).map(task); unique(tasks.map(t => t.id)); const taskIds = new Set(tasks.map(t => t.id));
  const modes: Record<string, Mode> = {};
  for (const [key, value] of Object.entries(obj(v.modes))) modes[date(key)] = mode(value);
  const records: ExecutionRecord[] = array(v.records).map(value => {
    const r = obj(value); const outcome = text(r.outcome, 10);
    if (!['done', 'help', 'rest'].includes(outcome)) throw new Error('紀錄狀態無效。');
    const snapshot = task(r.taskSnapshot); const taskId = id(r.taskId);
    if (taskId !== snapshot.id || !taskIds.has(taskId)) throw new Error('紀錄與活動關聯不一致。');
    return { id: id(r.id), taskId, at: stamp(r.at), outcome: outcome as ExecutionRecord['outcome'], taskSnapshot: snapshot,
      scheduledMinutes: number(r.scheduledMinutes, 0, 240, true), actualMinutes: nullable(r.actualMinutes, 1440), quantity: nullable(r.quantity),
      observation: text(r.observation), voidedAt: r.voidedAt === null ? null : stamp(r.voidedAt) };
  }); unique(records.map(r => r.id));
  const changes: PlanChange[] = array(v.changes).map(value => {
    const c = obj(value);
    return { id: id(c.id), date: date(c.date), at: stamp(c.at), before: mode(c.before), after: mode(c.after), undoneAt: c.undoneAt === null ? null : stamp(c.undoneAt),
      changes: array(c.changes).map(value => { const x = obj(value); return { taskId: id(x.taskId), title: text(x.title, 100), before: number(x.before, 0, 240, true), after: number(x.after, 0, 240, true) }; }) };
  }); unique(changes.map(c => c.id));
  const templates: WeekTemplate[] = array(v.templates, 100).map(value => {
    const t = obj(value); const modes = array(t.modes, 7).map(mode);
    if (modes.length !== 7) throw new Error('週模板需要7天的模式。');
    const name = text(t.name, 50); if (!name.trim()) throw new Error('模板名稱不能空白。');
    return { id: id(t.id), name, createdAt: stamp(t.createdAt), modes,
      items: array(t.items, 1000).map(value => { const i = obj(value); return { offset: number(i.offset, 0, 6, true), task: task(i.task) }; }) };
  }); unique(templates.map(t => t.id));
  return { schemaVersion: 1, revision: number(v.revision, 0, Number.MAX_SAFE_INTEGER, true), profile, tasks, modes, records, changes, templates };
}
