/** UI-independent domain contracts. No child identity or cloud identifiers required. */
export type Mode = 'normal' | 'compact' | 'rest';
export type Category = 'practice' | 'school' | 'life' | 'lesson';
export type Outcome = 'done' | 'help' | 'rest';
export interface Profile { childName: string; goal: string; fontScale: number; dayStart: string; dayEnd: string }
export interface Task {
  id: string; date: string; start: string; title: string; category: Category;
  minutes: number; compactMinutes: number; flexible: boolean;
  goal: string; note: string; target: number | null; unit: string; archived: boolean;
}
export interface ExecutionRecord {
  id: string; taskId: string; at: string; outcome: Outcome;
  taskSnapshot: Task; scheduledMinutes: number;
  actualMinutes: number | null; quantity: number | null; observation: string;
  voidedAt: string | null;
}
export interface PlanChange {
  id: string; date: string; at: string; before: Mode; after: Mode;
  changes: { taskId: string; title: string; before: number; after: number }[];
  undoneAt: string | null;
}
export interface WeekTemplate {
  id: string; name: string; createdAt: string;
  items: { offset: number; task: Task }[];
  modes: Mode[];
}
export interface AppState {
  schemaVersion: 1; revision: number; profile: Profile; tasks: Task[];
  modes: Record<string, Mode>; records: ExecutionRecord[];
  changes: PlanChange[]; templates: WeekTemplate[];
}
export interface EffectiveTask { task: Task; minutes: number; status: 'pending' | 'done' | 'help' | 'rest' | 'mode-rest'; record?: ExecutionRecord }
export interface ModeProposal {
  baseRevision: number; date: string; before: Mode; after: Mode;
  changes: PlanChange['changes']; protectedCount: number; completedCount: number;
}
