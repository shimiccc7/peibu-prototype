import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, applyMode, applyTemplate, archiveTask, conflicts, dayTasks, effectiveTask, emptyState, latestRecord, localDate, monday, previewMode, recordOutcome, saveProfile, saveTask, saveTemplate, undoMode, validDate, voidRecord } from '../dist/assets/domain/planner.js';
import { demoState } from '../dist/assets/domain/demo.js';
import { parseBackup } from '../dist/assets/domain/validation.js';
const date = '2026-09-25';
function fixture() { return demoState(date); }
function first(state) { return state.tasks.find(t => t.date === date && t.flexible); }
function compact(state) { return applyMode(state, previewMode(state, date, 'compact')); }

test('demo uses a real seven-day week and entirely fictional profile', () => {
  const s = fixture(); assert.equal(s.tasks.length, 42); assert.equal(new Set(s.tasks.map(t => t.date)).size, 7); assert.equal(s.profile.childName, '小禾');
});
test('mode preview is read-only', () => {
  const s = fixture(); const before = JSON.stringify(s); const p = previewMode(s, date, 'compact');
  assert.equal(p.changes.length, 3); assert.equal(JSON.stringify(s), before);
});
test('compact keeps stable task identifiers', () => {
  const s = fixture(); const ids = dayTasks(s, date).map(r => r.task.id); assert.deepEqual(dayTasks(compact(s), date).map(r => r.task.id), ids);
});
test('a completed 15-minute plan remains a 15-minute snapshot after compact mode', () => {
  let s = fixture(); const task = first(s); s = recordOutcome(s, task.id, 'done', 9, null, '獨立起拍'); const snapshot = structuredClone(s.records[0]);
  s = compact(s); const row = effectiveTask(s, task);
  assert.equal(row.status, 'done'); assert.equal(row.minutes, 15); assert.equal(row.record.actualMinutes, 9); assert.deepEqual(s.records[0], snapshot);
});
test('completed compact task does not become normal-duration completion', () => {
  let s = compact(fixture()); const task = first(s); s = recordOutcome(s, task.id, 'done', null, null, '');
  s = applyMode(s, previewMode(s, date, 'normal')); assert.equal(effectiveTask(s, task).minutes, 8); assert.equal(s.records[0].actualMinutes, null);
});
test('rest mode does not cancel protected classes, meals or mandatory homework', () => {
  let s = fixture(); s = applyMode(s, previewMode(s, date, 'rest'));
  const rows = dayTasks(s, date); assert.ok(rows.filter(r => !r.task.flexible).every(r => r.minutes === r.task.minutes && r.status === 'pending'));
  assert.ok(rows.filter(r => r.task.flexible).every(r => r.status === 'mode-rest' && r.minutes === 0));
});
test('mode undo preserves records created after the mode change', () => {
  let s = compact(fixture()); const task = first(s); s = recordOutcome(s, task.id, 'done', 7, null, ''); const records = structuredClone(s.records);
  s = undoMode(s, date); assert.equal(s.modes[date], 'normal'); assert.deepEqual(s.records, records); assert.equal(effectiveTask(s, task).minutes, 8);
});
test('stale mode proposals are rejected', () => {
  let s = fixture(); const p = previewMode(s, date, 'compact'); s = recordOutcome(s, first(s).id, 'help', null, null, ''); assert.throws(() => applyMode(s, p), /資料已變更/);
});
test('same-mode application is a no-op', () => { const s = fixture(); assert.equal(applyMode(s, previewMode(s, date, 'normal')), s); });
test('mode changes on one date do not affect another', () => { const s = compact(fixture()); assert.equal(dayTasks(s, addDays(date, 1))[0].minutes, 15); });
test('repeated completion is rejected', () => { let s = fixture(); const task = first(s); s = recordOutcome(s, task.id, 'done', null, null, ''); assert.throws(() => recordOutcome(s, task.id, 'done', null, null, ''), /重複/); });
test('completion does not infer actual time or amount', () => { const s = fixture(); const n = recordOutcome(s, first(s).id, 'done', null, null, ''); assert.equal(n.records[0].actualMinutes, null); assert.equal(n.records[0].quantity, null); });
test('needs-help keeps activity available and stores observation', () => { const s = fixture(); const task = first(s); const n = recordOutcome(s, task.id, 'help', 4, null, '需要確認指法'); assert.equal(effectiveTask(n, task).status, 'help'); assert.equal(n.records[0].observation, '需要確認指法'); });
test('correction retains audit content and reopens the task', () => { let s = fixture(); const task = first(s); s = recordOutcome(s, task.id, 'done', 4, null, '原觀察'); s = voidRecord(s, s.records[0].id); assert.equal(s.records.length, 1); assert.equal(s.records[0].observation, '原觀察'); assert.ok(s.records[0].voidedAt); assert.equal(effectiveTask(s, task).status, 'pending'); });
test('resting task cannot be reported as done without reactivating its mode', () => { const s = fixture(); const n = applyMode(s, previewMode(s, date, 'rest')); assert.throws(() => recordOutcome(n, first(s).id, 'done', 2, null, ''), /請先調整模式/); });
test('completed tasks cannot be edited, rescheduled or archived accidentally', () => { let s = fixture(); const task = first(s); s = recordOutcome(s, task.id, 'done', null, null, ''); assert.throws(() => saveTask(s, { ...task, date: addDays(date, 1) }), /快照/); assert.throws(() => archiveTask(s, task.id), /不直接刪除/); });
test('editing a pending task retains identity', () => { const s = fixture(); const task = first(s); const n = saveTask(s, { ...task, title: '新目標', date: addDays(date, 1) }); assert.equal(n.tasks.length, s.tasks.length); assert.equal(n.tasks.find(t => t.title === '新目標').id, task.id); });
test('cancel one occurrence does not cancel the recurring subject', () => { const s = fixture(); const t = first(s); const n = archiveTask(s, t.id); assert.equal(dayTasks(n, date).length, 5); assert.equal(dayTasks(n, addDays(date, 1)).length, 6); });
test('invalid duration or protected flexibility is rejected', () => { const s = fixture(); const t = first(s); assert.throws(() => saveTask(s, { ...t, minutes: 0 })); assert.throws(() => saveTask(s, { ...t, compactMinutes: 30 })); assert.throws(() => saveTask(s, { ...t, category: 'life', flexible: true })); assert.throws(() => saveTask(s, { ...t, start: '23:59', minutes: 15 })); });
test('invalid actual time is rejected', () => { const s = fixture(); assert.throws(() => recordOutcome(s, first(s).id, 'done', -1, null, '')); assert.throws(() => recordOutcome(s, first(s).id, 'done', NaN, null, '')); });
test('nested conflicts are reported rather than auto-resolved', () => { const s = fixture(); const t = first(s); const n = saveTask(s, { ...t, start: '09:55' }); assert.ok(conflicts(n, date).some(x => x.includes('重疊'))); assert.equal(n.tasks.find(x => x.id === t.id).start, '09:55'); });
test('outside family availability generates an explicit warning', () => { const s = fixture(); const n = saveTask(s, { ...first(s), start: '06:00' }); assert.ok(conflicts(n, date).some(x => x.includes('超出'))); });
test('templates clone plans with fresh IDs and do not clone facts', () => { let s = fixture(); s = recordOutcome(s, first(s).id, 'done', null, null, ''); s = saveTemplate(s, date, '示範週'); const before = structuredClone(s.records); const n = applyTemplate(s, s.templates[0].id, '2026-09-28'); const clones = n.tasks.filter(t => t.date >= '2026-09-28'); assert.equal(clones.length, 42); assert.ok(clones.every(t => !s.tasks.some(old => old.id === t.id))); assert.deepEqual(n.records, before); assert.equal(dayTasks(n, '2026-09-28')[0].status, 'pending'); });
test('templates refuse existing weeks and dates that are not Monday', () => { const s = saveTemplate(fixture(), date, '週模板'); assert.throws(() => applyTemplate(s, s.templates[0].id, monday(date)), /已有/); assert.throws(() => applyTemplate(s, s.templates[0].id, date), /星期一/); });
test('blank templates cannot be saved', () => { assert.throws(() => saveTemplate(emptyState(), date, '空白'), /沒有/); });
test('calendar arithmetic is local date based, supports leap years and week boundaries', () => { assert.equal(monday('2026-09-27'), '2026-09-21'); assert.equal(addDays('2028-02-28', 1), '2028-02-29'); assert.equal(addDays('2026-12-31', 1), '2027-01-01'); assert.ok(validDate('2028-02-29')); assert.equal(validDate('2026-02-30'), false); assert.equal(validDate('abc'), false); assert.equal(localDate(new Date(2026, 0, 1, 0, 1)), '2026-01-01'); });
test('profile validates family boundaries and text limits', () => { const s = fixture(); assert.throws(() => saveProfile(s, { ...s.profile, dayStart: '22:00' })); assert.throws(() => saveProfile(s, { ...s.profile, childName: '' })); assert.equal(saveProfile(s, { ...s.profile, fontScale: 1.2 }).profile.fontScale, 1.2); });
test('completed imported state roundtrips without losing stable facts', () => { let s = fixture(); s = recordOutcome(s, first(s).id, 'done', 0, 0, '<script>not executable</script>'); s = compact(s); assert.deepEqual(parseBackup(JSON.stringify(s)), s); });
test('bad JSON, unknown version, oversized data and duplicate IDs are rejected', () => { assert.throws(() => parseBackup('not json')); assert.throws(() => parseBackup(JSON.stringify({ version: 1 })), /舊版/); assert.throws(() => parseBackup(' '.repeat(1_000_001)), /1 MB/); const s = fixture(); s.tasks.push(s.tasks[0]); assert.throws(() => parseBackup(JSON.stringify(s)), /重複/); });
test('orphan records and invalid numeric fields are rejected', () => { let s = fixture(); s = recordOutcome(s, first(s).id, 'done', 3, null, ''); s.records[0].taskId = 'missing'; assert.throws(() => parseBackup(JSON.stringify(s)), /關聯/); const x = fixture(); x.tasks[0].minutes = '15'; assert.throws(() => parseBackup(JSON.stringify(x)), /數字/); });
test('backup mode keys cannot inject object prototype properties', () => { const s = fixture(); const raw = JSON.stringify(s).replace('"modes":{}', '"modes":{"__proto__":"normal"}'); assert.throws(() => parseBackup(raw), /日期/); assert.equal({}.polluted, undefined); });
test('empty initial state can be imported and rendered', () => { assert.deepEqual(parseBackup(JSON.stringify(emptyState())), emptyState()); });
