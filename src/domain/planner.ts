import type { AppState, EffectiveTask, ExecutionRecord, Mode, ModeProposal, Outcome, Profile, Task, WeekTemplate } from './types.js';

export const MODE_LABEL: Record<Mode, string> = { normal: '一般', compact: '精簡', rest: '休息' };
export const CATEGORY_LABEL = { practice: '自主練習', school: '學校作業', life: '生活留白', lesson: '固定課程' };
export const OUTCOME_LABEL = { done: '已完成', help: '需要幫忙', rest: '已調整休息' };
export function uid(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  // randomUUID requires a secure context; getRandomValues also works in local preview contexts.
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40; bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const h = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function validDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const d = new Date(`${date}T12:00:00`);
  return Number.isFinite(d.getTime()) && localDate(d) === date && date >= '2000-01-01' && date <= '2100-12-31';
}
export function addDays(date: string, days: number): string {
  if (!validDate(date) || !Number.isInteger(days)) throw new Error('日期無效。');
  const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate() + days); return localDate(d);
}
export function monday(date: string): string {
  const day = new Date(`${date}T12:00:00`).getDay(); return addDays(date, -(day === 0 ? 6 : day - 1));
}
export function timeToMinutes(time: string): number {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('時間格式無效。');
  const [h, m] = time.split(':').map(Number); return h! * 60 + m!;
}
export function endTime(start: string, minutes: number): string {
  const t = timeToMinutes(start) + minutes;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}
export function emptyState(): AppState {
  return { schemaVersion: 1, revision: 0, profile: { childName: '小禾', goal: '把一個小樂句接順', fontScale: 1, dayStart: '07:30', dayEnd: '21:00' }, tasks: [], modes: {}, records: [], changes: [], templates: [] };
}
export function modeFor(state: AppState, date: string): Mode { return state.modes[date] ?? 'normal'; }
export function latestRecord(state: AppState, taskId: string): ExecutionRecord | undefined {
  return [...state.records].reverse().find(r => r.taskId === taskId && !r.voidedAt);
}
export function effectiveTask(state: AppState, task: Task, mode = modeFor(state, task.date)): EffectiveTask {
  const record = latestRecord(state, task.id);
  // Actual facts keep the schedule snapshot from when they were recorded.
  if (record && (record.outcome === 'done' || record.outcome === 'rest')) {
    return { task: record.taskSnapshot, minutes: record.scheduledMinutes, status: record.outcome, record };
  }
  const minutes = !task.flexible || mode === 'normal' ? task.minutes : mode === 'compact' ? task.compactMinutes : 0;
  return { task, minutes, status: minutes === 0 ? 'mode-rest' : record?.outcome === 'help' ? 'help' : 'pending', record };
}
export function dayTasks(state: AppState, date: string, mode = modeFor(state, date)): EffectiveTask[] {
  return state.tasks.filter(t => !t.archived && t.date === date)
    .map(t => effectiveTask(state, t, mode)).sort((a, b) => a.task.start.localeCompare(b.task.start) || a.task.id.localeCompare(b.task.id));
}
export function conflicts(state: AppState, date: string, mode = modeFor(state, date)): string[] {
  const tasks = dayTasks(state, date, mode).filter(t => t.status !== 'rest' && t.status !== 'mode-rest');
  const result: string[] = [];
  for (let i = 0; i < tasks.length; i++) {
    const a = tasks[i]!; const start = timeToMinutes(a.task.start); const end = start + a.minutes;
    if (start < timeToMinutes(state.profile.dayStart) || end > timeToMinutes(state.profile.dayEnd)) {
      result.push(`「${a.task.title}」超出 ${state.profile.dayStart}–${state.profile.dayEnd} 的家庭可用時段。`);
    }
    for (let j = i + 1; j < tasks.length; j++) {
      const b = tasks[j]!;
      if (timeToMinutes(b.task.start) < end) result.push(`「${a.task.title}」與「${b.task.title}」時間重疊。`);
    }
  }
  return result;
}
export function previewMode(state: AppState, date: string, after: Mode): ModeProposal {
  if (!validDate(date) || !['normal', 'compact', 'rest'].includes(after)) throw new Error('方案設定無效。');
  const tasks = dayTasks(state, date);
  const changes = tasks.flatMap(row => {
    const next = effectiveTask(state, row.task, after);
    return row.minutes !== next.minutes ? [{ taskId: row.task.id, title: row.task.title, before: row.minutes, after: next.minutes }] : [];
  });
  return { baseRevision: state.revision, date, before: modeFor(state, date), after, changes,
    protectedCount: tasks.filter(t => !t.task.flexible).length,
    completedCount: tasks.filter(t => t.status === 'done' || t.status === 'rest').length };
}
export function applyMode(state: AppState, proposal: ModeProposal): AppState {
  if (state.revision !== proposal.baseRevision) throw new Error('資料已變更，請重新檢查方案預覽。');
  // Recompute changes rather than trusting a UI-supplied mutation payload.
  const verified = previewMode(state, proposal.date, proposal.after);
  if (verified.before === verified.after) return state;
  return { ...state, revision: state.revision + 1, modes: { ...state.modes, [proposal.date]: verified.after },
    changes: [...state.changes, { id: uid(), date: proposal.date, at: new Date().toISOString(), before: verified.before, after: verified.after, changes: verified.changes, undoneAt: null }] };
}
export function undoMode(state: AppState, date: string): AppState {
  const last = [...state.changes].reverse().find(c => c.date === date && !c.undoneAt);
  if (!last) throw new Error('這一天沒有可撤銷的模式調整。');
  if (modeFor(state, date) !== last.after) throw new Error('方案已變動，無法直接撤銷。');
  return { ...state, revision: state.revision + 1, modes: { ...state.modes, [date]: last.before },
    changes: state.changes.map(c => c.id === last.id ? { ...c, undoneAt: new Date().toISOString() } : c) };
}
export function validateTask(task: Task): void {
  if (!task.id || !validDate(task.date) || !task.title.trim() || task.title.length > 100) throw new Error('請填寫有效日期與100字以內的活動名稱。');
  if (!['practice', 'school', 'life', 'lesson'].includes(task.category)) throw new Error('活動類型無效。');
  const start = timeToMinutes(task.start);
  if (!Number.isInteger(task.minutes) || task.minutes < 1 || task.minutes > 240 || start + task.minutes > 1440) throw new Error('活動需為1–240分鐘，且不可跨日。');
  if (!Number.isInteger(task.compactMinutes) || task.compactMinutes < 1 || task.compactMinutes > task.minutes) throw new Error('精簡時間需為1分鐘以上，且不可大於一般時間。');
  if (['lesson', 'life'].includes(task.category) && task.flexible) throw new Error('固定課程與生活留白必須受到保護，不隨模式縮減。');
  if (task.target !== null && (!Number.isFinite(task.target) || task.target < 0 || task.target > 9999)) throw new Error('份量需介於0–9999，未知請留白。');
  if (task.unit.length > 12 || task.goal.length > 500 || task.note.length > 2000) throw new Error('文字超過可儲存長度。');
}
export function saveTask(state: AppState, task: Task): AppState {
  validateTask(task);
  const old = state.tasks.find(t => t.id === task.id);
  const last = latestRecord(state, task.id);
  if (old && last && ['done', 'rest'].includes(last.outcome)) throw new Error('已完成或已休息的活動已保存快照；請先在回看中更正紀錄。');
  return { ...state, revision: state.revision + 1, tasks: old ? state.tasks.map(t => t.id === task.id ? { ...task } : t) : [...state.tasks, { ...task }] };
}
export function archiveTask(state: AppState, taskId: string): AppState {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) throw new Error('找不到活動。');
  const last = latestRecord(state, taskId);
  if (last && ['done', 'rest'].includes(last.outcome)) throw new Error('已完成活動不直接刪除，請在回看中更正。');
  return { ...state, revision: state.revision + 1, tasks: state.tasks.map(t => t.id === taskId ? { ...t, archived: true } : t) };
}
export function recordOutcome(state: AppState, taskId: string, outcome: Outcome, actualMinutes: number | null, quantity: number | null, observation: string): AppState {
  const task = state.tasks.find(t => t.id === taskId && !t.archived);
  if (!task) throw new Error('活動不存在。');
  const row = effectiveTask(state, task);
  if (row.status === 'done' || row.status === 'rest') throw new Error('這一段已留下紀錄，不能重複完成。');
  if (!['done', 'help', 'rest'].includes(outcome)) throw new Error('紀錄狀態無效。');
  if (row.status === 'mode-rest' && outcome !== 'rest') throw new Error('此段目前休息，請先調整模式再記錄完成。');
  if (actualMinutes !== null && (!Number.isFinite(actualMinutes) || actualMinutes < 0 || actualMinutes > 1440)) throw new Error('實際分鐘請填0–1440，未計時可留白。');
  if (quantity !== null && (!Number.isFinite(quantity) || quantity < 0 || quantity > 9999)) throw new Error('實際份量請填0–9999，未知可留白。');
  if (observation.length > 2000) throw new Error('觀察文字過長。');
  const record: ExecutionRecord = { id: uid(), taskId, at: new Date().toISOString(), outcome,
    taskSnapshot: { ...task }, scheduledMinutes: row.minutes, actualMinutes, quantity,
    observation: observation.trim(), voidedAt: null };
  return { ...state, revision: state.revision + 1, records: [...state.records, record] };
}
export function voidRecord(state: AppState, id: string): AppState {
  const record = state.records.find(r => r.id === id);
  if (!record || record.voidedAt) throw new Error('找不到可更正的紀錄。');
  return { ...state, revision: state.revision + 1, records: state.records.map(r => r.id === id ? { ...r, voidedAt: new Date().toISOString() } : r) };
}
export function saveProfile(state: AppState, profile: Profile): AppState {
  if (!profile.childName.trim() || profile.childName.length > 30 || profile.goal.length > 200) throw new Error('暱稱需為1–30字，目標最多200字。');
  if (![1, 1.1, 1.2].includes(profile.fontScale) || timeToMinutes(profile.dayStart) >= timeToMinutes(profile.dayEnd)) throw new Error('請檢查字體大小與可用時間。');
  return { ...state, revision: state.revision + 1, profile: { ...profile } };
}
export function saveTemplate(state: AppState, date: string, name: string): AppState {
  if (!name.trim() || name.length > 50) throw new Error('模板名稱需為1–50字。');
  const start = monday(date); const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const items = state.tasks.filter(t => !t.archived && days.includes(t.date)).map(t => ({ offset: days.indexOf(t.date), task: { ...t } }));
  if (!items.length) throw new Error('這一週沒有可儲存的活動。');
  const template: WeekTemplate = { id: uid(), name: name.trim(), createdAt: new Date().toISOString(), items, modes: days.map(d => modeFor(state, d)) };
  return { ...state, revision: state.revision + 1, templates: [...state.templates, template] };
}
export function applyTemplate(state: AppState, templateId: string, start: string): AppState {
  if (!validDate(start) || monday(start) !== start) throw new Error('請選擇目標週的星期一。');
  const template = state.templates.find(t => t.id === templateId);
  if (!template) throw new Error('找不到模板。');
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  if (state.tasks.some(t => !t.archived && days.includes(t.date)) || state.records.some(r => days.includes(r.taskSnapshot.date))) throw new Error('目標週已有活動或紀錄，為避免覆寫，請選空白的一週。');
  const tasks = template.items.map(item => ({ ...item.task, id: uid(), date: addDays(start, item.offset), archived: false }));
  tasks.forEach(validateTask);
  return { ...state, revision: state.revision + 1, tasks: [...state.tasks, ...tasks], modes: { ...state.modes, ...Object.fromEntries(days.map((d, i) => [d, template.modes[i] ?? 'normal'])) } };
}
