import type { AppState } from '../domain/types.js';
import { parseBackup } from '../domain/validation.js';
export const STORAGE_KEY = 'peibu.prototype.v1';
export interface KeyValueStore { getItem(key: string): string | null; setItem(key: string, value: string): void }
export interface LoadResult { state: AppState; warning: string; raw: string | null }
/** Compare-before-write prevents silent cross-tab overwrite; corrupt data is never replaced. */
export class LocalRepository {
  private baseRaw: string | null = null;
  private blocked = false;
  constructor(private readonly store: KeyValueStore) {}
  load(fallback: () => AppState): LoadResult {
    try {
      this.baseRaw = this.store.getItem(STORAGE_KEY);
      return { state: this.baseRaw === null ? fallback() : parseBackup(this.baseRaw), warning: '', raw: this.baseRaw };
    } catch (error) {
      this.blocked = true;
      return { state: fallback(), warning: `無法讀取原有資料，已保留原檔；本頁僅暫存，請先備份再處理。${error instanceof Error ? error.message : ''}`, raw: this.baseRaw };
    }
  }
  save(state: AppState): void {
    if (this.blocked) throw new Error('資料未寫入。請先匯出本頁備份，再重新載入或處理原資料。');
    const raw = JSON.stringify(state);
    // Validate our own writes as well as imported documents.
    parseBackup(raw);
    if (this.store.getItem(STORAGE_KEY) !== this.baseRaw) {
      this.blocked = true;
      throw new Error('其他分頁已更新資料。本頁沒有覆寫它；請匯出本頁備份後重新載入。');
    }
    this.store.setItem(STORAGE_KEY, raw); this.baseRaw = raw;
  }
}
