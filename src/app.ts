import type { AppState, Category, Mode, Outcome, Task } from './domain/types.js';
import { addDays, applyMode, applyTemplate, archiveTask, CATEGORY_LABEL, effectiveTask, localDate, MODE_LABEL, monday, previewMode, recordOutcome, saveProfile, saveTask, saveTemplate, uid, undoMode, validDate, voidRecord } from './domain/planner.js';
import { demoState } from './domain/demo.js';
import { MAX_BACKUP_BYTES, parseBackup } from './domain/validation.js';
import { LocalRepository } from './infrastructure/storage.js';
import { e, fullDate, icon, shortDate } from './ui/html.js';
import { renderApp } from './ui/views.js';
import type { View } from './ui/views.js';

const root = document.querySelector<HTMLDivElement>('#app')!;
const storage = (() => { try { return window.localStorage; } catch { return { getItem(): never { throw new Error('瀏覽器拒絕本機保存。'); }, setItem(): never { throw new Error('瀏覽器拒絕本機保存。'); } }; } })();
const repository = new LocalRepository(storage);
const loaded = repository.load(() => demoState());
let state = loaded.state;
let warning = loaded.warning;
let date = localDate();
let view: View = 'today';
let child = false;
let modalSubmit: ((form: FormData) => void) | null = null;
let toastTimer = 0;
if (!warning && loaded.raw === null) { try { repository.save(state); } catch (error) { warning = message(error); } }
function message(error: unknown): string { return error instanceof Error ? error.message : '無法完成操作，資料未被覆寫。'; }
function render(): void {
  const focusedId = document.activeElement?.id;
  document.documentElement.style.fontSize = `${16 * state.profile.fontScale}px`;
  root.innerHTML = renderApp({ state, date, view, child, warning, rawAvailable: loaded.raw !== null });
  if (focusedId) document.getElementById(focusedId)?.focus({ preventScroll: true });
}
function toast(text: string): void {
  clearTimeout(toastTimer); const el = document.getElementById('toast');
  if (el) { el.textContent = text; el.classList.add('visible'); toastTimer = window.setTimeout(() => el.classList.remove('visible'), 4500); }
}
function commit(next: AppState, success = '已儲存'): void {
  state = next;
  try { repository.save(state); warning = ''; } catch (error) { warning = message(error); }
  render(); toast(warning ? '本頁已更新，但未保存。請匯出備份。' : success);
}
function closeDialog(): void { document.querySelector<HTMLDialogElement>('#modal')?.close(); document.getElementById('dialog-root')?.replaceChildren(); modalSubmit = null; }
function openDialog(title: string, content: string, submit?: (form: FormData) => void, confirm = '確認'): void {
  closeDialog(); modalSubmit = submit ?? null;
  document.getElementById('dialog-root')!.innerHTML = `<dialog id="modal" aria-labelledby="modal-title"><div class="modal-heading"><h2 id="modal-title">${e(title)}</h2><button class="icon-btn" data-action="close-dialog" aria-label="關閉對話框">${icon('close')}</button></div><form id="modal-form"><div class="modal-body">${content}<p id="modal-error" class="form-error" role="alert"></p></div><div class="modal-footer"><button class="btn btn-secondary" type="button" data-action="close-dialog">取消</button>${submit ? `<button class="btn btn-primary" type="submit">${e(confirm)}</button>` : ''}</div></form></dialog>`;
  const dialog = document.querySelector<HTMLDialogElement>('#modal')!;
  dialog.addEventListener('cancel', () => { modalSubmit = null; });
  dialog.showModal();
}
function formText(form: FormData, name: string): string { return String(form.get(name) ?? '').trim(); }
function nullableNumber(form: FormData, name: string): number | null { const v = formText(form, name); return v === '' ? null : Number(v); }
function findTask(id: string): Task { const task = state.tasks.find(t => t.id === id); if (!task) throw new Error('找不到活動。'); return task; }
function download(name: string, data: string, mime = 'application/json'): void {
  const url = URL.createObjectURL(new Blob([data], { type: mime }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportBackup(): void { download(`peibu-backup-${localDate()}-${Date.now()}.json`, JSON.stringify(state)); }
function editTask(id?: string): void {
  const task = id ? findTask(id) : { id: uid(), date, start: '16:00', title: '', category: 'practice' as Category, minutes: 15, compactMinutes: 8, flexible: true, goal: '', note: '', target: null, unit: '', archived: false };
  openDialog(id ? '調整這個安排' : '新增一個小步驟', `<div class="stack-form"><label>活動名稱<input name="title" maxlength="100" value="${e(task.title)}" placeholder="例如：練會一個接點" required></label><div class="form-grid"><label>日期<input type="date" name="date" min="2000-01-01" max="2100-12-31" value="${e(task.date)}" required></label><label>開始時間<input type="time" name="start" value="${e(task.start)}" required></label></div><div class="form-grid"><label>活動類型<select name="category" id="edit-category">${Object.entries(CATEGORY_LABEL).map(([key, label]) => `<option value="${key}" ${key === task.category ? 'selected' : ''}>${label}</option>`).join('')}</select></label><label>一般時間上限（分鐘）<input name="minutes" type="number" min="1" max="240" step="1" value="${task.minutes}" required></label></div><div class="flexible-options"><label class="checkbox-label"><input type="checkbox" name="flexible" id="edit-flexible" ${task.flexible ? 'checked' : ''} ${['life', 'lesson'].includes(task.category) ? 'disabled' : ''}>可隨步調縮減或休息</label><p class="small-note">固定課程與生活留白受到保護。必做作業建議不要勾選。</p></div><label>精簡模式的時間上限（分鐘）<input name="compactMinutes" type="number" min="1" max="240" step="1" value="${task.compactMinutes}" required></label><label>這一段，只要做到什麼？<textarea name="goal" rows="2" maxlength="500" placeholder="一個小而明確的目標">${e(task.goal)}</textarea></label><div class="form-grid"><label>預計份量（未知留白）<input name="target" type="number" min="0" max="9999" step="any" value="${task.target ?? ''}" placeholder="例如：2"></label><label>自訂單位<input name="unit" maxlength="12" value="${e(task.unit)}" placeholder="面、小節、次…"></label></div><label>老師提示／準備事項<textarea name="note" rows="2" maxlength="2000">${e(task.note)}</textarea></label>${id ? `<button type="button" class="text-btn danger" data-action="archive" data-id="${e(id)}">取消這一次活動（保留歷史）</button>` : ''}</div>`, form => {
    const category = formText(form, 'category') as Category;
    const nextTask: Task = { ...task, title: formText(form, 'title'), date: formText(form, 'date'), start: formText(form, 'start'),
      category, minutes: Number(formText(form, 'minutes')), compactMinutes: Number(formText(form, 'compactMinutes')),
      flexible: !['life', 'lesson'].includes(category) && form.get('flexible') === 'on', goal: formText(form, 'goal'),
      note: formText(form, 'note'), target: nullableNumber(form, 'target'), unit: formText(form, 'unit') };
    const next = saveTask(state, nextTask); date = nextTask.date; closeDialog(); commit(next, '安排已更新；若有衝突，會顯示在日程旁。');
  }, '儲存安排');
}
function openRecord(id: string): void {
  const task = findTask(id); const row = effectiveTask(state, task);
  openDialog(child ? '這一小步，怎麼做？' : '留下這一小步', `<div class="practice-guide"><span class="eyebrow">${e(task.start)} · 最多 ${row.minutes} 分鐘</span><h3>${e(task.title)}</h3><p>${e(task.goal || '今天只處理一個小問題。')}</p>${task.note ? `<div class="teacher-note">${e(task.note)}</div>` : ''}</div><fieldset class="outcome-field"><legend>這次的狀態</legend><label><input type="radio" name="outcome" value="done" ${row.status === 'mode-rest' ? 'disabled' : 'checked'}>${icon('check')} 完成了</label><label><input type="radio" name="outcome" value="help" ${row.status === 'mode-rest' ? 'disabled' : ''}>${icon('info')} 需要幫忙</label><label><input type="radio" name="outcome" value="rest" ${row.status === 'mode-rest' ? 'checked' : ''}>${icon('cup')} 這次休息</label></fieldset><details class="record-details" ${child ? '' : 'open'}><summary>加一點觀察（選填）</summary><div class="stack-form"><label>發現了什麼？<textarea name="observation" rows="3" maxlength="2000" placeholder="例如：能自己起拍，但接下一句還要提醒。"></textarea></label><div class="form-grid"><label>實際時間（分鐘）<input name="actualMinutes" type="number" min="0" max="1440" step="any" placeholder="未計時請留白"></label><label>本次完成份量${task.unit ? `（${e(task.unit)}）` : ''}<input name="quantity" type="number" min="0" max="9999" step="any" placeholder="未知請留白"></label></div></div></details><p class="small-note">時間不會由「完成」自動推算。休息不搬到睡前補做。</p>`, form => {
    const next = recordOutcome(state, id, formText(form, 'outcome') as Outcome, nullableNumber(form, 'actualMinutes'), nullableNumber(form, 'quantity'), formText(form, 'observation'));
    closeDialog(); commit(next, '已記下這一小步，歷史不會被改方案覆蓋。');
  }, '記下這一步');
}
function modeDialog(mode: Mode): void {
  const proposal = previewMode(state, date, mode);
  if (proposal.before === proposal.after) { toast('目前已是這個模式。'); return; }
  openDialog(`改成${MODE_LABEL[mode]}步調？`, `<p class="modal-intro">${e(fullDate(date))}<br>只調整尚未完成、而且允許縮減的活動；不移動任何開始時間。</p><div class="change-preview">${proposal.changes.length ? proposal.changes.map(c => `<div><span>${e(c.title)}</span><strong>${c.before} 分 ${icon('arrow')} ${c.after ? `${c.after} 分` : '休息'}</strong></div>`).join('') : '<p>目前沒有活動需要變更；此模式會套用到當天之後新增的彈性安排。</p>'}</div><div class="info-banner">${icon('shield')} ${proposal.protectedCount}個保護時段、${proposal.completedCount}個已完成／已休息活動，維持原樣。</div><p class="small-note">仍可撤銷模式調整。已發生的紀錄永遠不會隨撤銷回退。</p>`, () => {
    const next = applyMode(state, proposal); closeDialog(); commit(next, '已調整步調，完成紀錄保持原樣。');
  }, '套用調整');
}
function templateDialog(id: string): void {
  const template = state.templates.find(t => t.id === id); if (!template) throw new Error('找不到模板。');
  openDialog('把這個模板，帶到新的一週', `<div class="stack-form"><div class="practice-guide"><span class="eyebrow">${template.items.length} 個活動 · 7天模式</span><h3>${e(template.name)}</h3><p>只複製安排。所有活動會使用新識別碼，完成紀錄仍留在原週。</p></div><label>目標週的星期一<input type="date" name="start" min="2000-01-01" max="2100-12-31" value="${addDays(monday(date), 7)}" required></label><p class="small-note">目標週只要已有活動或紀錄，就會阻止套用，不覆寫也不自動合併。</p></div>`, form => {
    const start = formText(form, 'start'); const next = applyTemplate(state, id, start);
    closeDialog(); date = start; view = 'today'; commit(next, '已建立新的一週，沒有複製完成紀錄。');
  }, '確認套用');
}
function handleAction(button: HTMLElement): void {
  const action = button.dataset.action; const id = button.dataset.id;
  switch (action) {
    case 'home': view = 'today'; render(); break;
    case 'navigate': view = button.dataset.view as View; render(); window.scrollTo(0, 0); break;
    case 'role': child = button.dataset.role === 'child'; render(); window.scrollTo(0, 0); break;
    case 'date': date = button.dataset.date!; render(); break;
    case 'today': date = localDate(); render(); break;
    case 'week': { const nextDate = addDays(date, Number(button.dataset.offset)); if (!validDate(nextDate)) throw new Error('日期超出範圍。'); date = nextDate; render(); break; }
    case 'add': editTask(); break;
    case 'edit': editTask(id); break;
    case 'record': openRecord(id!); break;
    case 'close-dialog': closeDialog(); break;
    case 'mode': modeDialog(button.dataset.mode as Mode); break;
    case 'undo-mode': commit(undoMode(state, date), '已撤銷模式調整；之後新增的紀錄仍保留。'); break;
    case 'archive': {
      const task = findTask(id!);
      openDialog('取消這一次活動？', `<p>只取消 ${e(shortDate(task.date))} 的「${e(task.title)}」，不修改其他日期，也不刪除歷史。</p>`, () => { const next = archiveTask(state, id!); closeDialog(); commit(next, '已取消這一次活動。'); }, '確認取消這一次'); break;
    }
    case 'void-record': openDialog('更正這筆紀錄？', '<p>原紀錄會保留，並標示「已更正」，不再計入統計。對應活動可能重新出現在待進行清單。</p>', () => { const next = voidRecord(state, id!); closeDialog(); commit(next, '已標示更正，原始內容仍保留。'); }, '確認更正'); break;
    case 'save-template': openDialog('儲存這週模板', `<div class="stack-form"><p>${e(shortDate(monday(date)))} — ${e(shortDate(addDays(monday(date), 6)))}，只保存安排，不複製完成狀態。</p><label>模板名稱<input name="name" maxlength="50" value="我的一週節奏" required></label></div>`, form => { const next = saveTemplate(state, date, formText(form, 'name')); closeDialog(); view = 'templates'; commit(next, '模板已保存，可帶入空白的一週。'); }, '儲存模板'); break;
    case 'apply-template': templateDialog(id!); break;
    case 'export': exportBackup(); toast('備份已交給瀏覽器下載。'); break;
    case 'export-raw': if (loaded.raw !== null) download('peibu-original-recovery.txt', loaded.raw, 'text/plain'); break;
    case 'import': document.getElementById('import-file')!.click(); break;
    case 'print': window.print(); break;
  }
}
document.addEventListener('click', event => {
  if (!(event.target instanceof Element)) return;
  const button = event.target.closest<HTMLElement>('[data-action]');
  if (!button) return;
  event.preventDefault();
  try { handleAction(button); } catch (error) { const el = document.getElementById('modal-error'); if (el) el.textContent = message(error); else toast(message(error)); }
});
document.addEventListener('submit', event => {
  if (!(event.target instanceof HTMLFormElement)) return; event.preventDefault();
  const form = new FormData(event.target);
  try {
    if (event.target.id === 'modal-form') modalSubmit?.(form);
    if (event.target.id === 'profile-form') {
      commit(saveProfile(state, { childName: formText(form, 'childName'), goal: formText(form, 'goal'), fontScale: Number(formText(form, 'fontScale')), dayStart: formText(form, 'dayStart'), dayEnd: formText(form, 'dayEnd') }), '家庭偏好已儲存。');
    }
  } catch (error) { const el = document.getElementById('modal-error'); if (el) el.textContent = message(error); else toast(message(error)); }
});
document.addEventListener('change', async event => {
  const input = event.target;
  try {
    if (input instanceof HTMLInputElement && input.id === 'date-picker' && validDate(input.value)) { date = input.value; render(); }
    if (input instanceof HTMLSelectElement && input.id === 'edit-category') {
      const checkbox = document.querySelector<HTMLInputElement>('#edit-flexible')!;
      checkbox.disabled = ['life', 'lesson'].includes(input.value); if (checkbox.disabled) checkbox.checked = false;
    }
    if (input instanceof HTMLInputElement && input.id === 'import-file') {
      const file = input.files?.[0]; input.value = ''; if (!file) return;
      if (file.size > MAX_BACKUP_BYTES) throw new Error('備份超過1 MB，未讀取也未覆寫資料。');
      const incoming = parseBackup(await file.text());
      openDialog('檢查備份，再匯入', `<div class="practice-guide"><h3>${e(incoming.profile.childName)}的備份</h3><p>${incoming.tasks.length}個活動 · ${incoming.records.length}筆紀錄 · ${incoming.templates.length}個模板</p></div><p>匯入會取代這個瀏覽器目前的陪步資料，不會合併。我們會先啟動目前資料的備份下載；請自行確認下載已保存。</p><p class="small-note">不同步至其他裝置，也不接受舊版連假HTML備份。</p>`, () => {
        exportBackup();
        const next = { ...incoming, revision: Math.max(state.revision + 1, incoming.revision) };
        closeDialog(); view = 'today'; date = incoming.tasks.find(t => !t.archived)?.date ?? localDate(); commit(next, '備份已匯入；原資料已交給瀏覽器下載。');
      }, '先備份目前資料，再匯入');
    }
  } catch (error) { toast(message(error)); }
});
// Warn when another tab changes the origin; do not silently replace a user's active form.
window.addEventListener('storage', event => {
  if (event.key === 'peibu.prototype.v1') { warning = '其他分頁有更新。下一次保存會檢查衝突；建議先匯出本頁備份，再重新載入。'; const el = document.querySelector('.save-badge'); if (el) { el.textContent = '其他分頁有更新'; el.classList.add('unsaved'); } }
});
window.addEventListener('beforeunload', event => { if (warning) { event.preventDefault(); } });
render();
// No analytics, network requests, microphone access, or calendar mutations in this prototype.
