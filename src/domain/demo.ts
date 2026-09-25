import { addDays, emptyState, localDate, monday, uid } from './planner.js';
import type { AppState, Category, Task } from './types.js';

/** Entirely fictional data. Uses the viewer's local week, not a particular family's dates. */
export function demoState(today = localDate()): AppState {
  const state = emptyState(); const start = monday(today);
  const item = (date: string, time: string, title: string, category: Category, minutes: number, compact: number, flexible: boolean, goal: string, target: number | null = null, unit = ''): Task => ({
    id: uid(), date, start: time, title, category, minutes, compactMinutes: compact, flexible, goal, target, unit,
    note: category === 'practice' ? '示範練法，不取代老師指示。只選一個卡點；已做好就提早結束。' : '', archived: false,
  });
  for (let i = 0; i < 7; i++) {
    const d = addDays(start, i);
    state.tasks.push(
      item(d, '09:00', '獨奏・接起小樂句', 'practice', 15, 8, true, '把老師圈選的一小段，接上前後各一小節。'),
      item(d, '10:00', '國語・今天的一小份', 'school', 20, 20, false, '先確認老師指定範圍，不知道的題目做記號。', 2, '面'),
      item(d, '12:00', '午餐與自由時間', 'life', 60, 60, false, '留白不是等待被排滿的時間。'),
      item(d, '14:00', i === 5 ? '親子外出・看看新事物' : '聯彈・找回自己的拍子', i === 5 ? 'lesson' : 'practice', i === 5 ? 90 : 12, i === 5 ? 90 : 8, i !== 5, i === 5 ? '這是示範活動，請自行修改時間與交通。' : '先拍休止，再彈一小句；沒有搭檔就標示尚未合練。'),
      item(d, '17:00', '英文・聽懂一句話', 'practice', 15, 8, true, '聽一句、一起說一次，留下最喜歡的詞。'),
      item(d, '20:30', '收書包・準備休息', 'life', 30, 30, false, '不把白天未做完的練習補到睡前。'),
    );
  }
  return state;
}
