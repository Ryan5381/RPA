// ─── Queue 頁面相關工具函式 ────────────────────────────────────────────────────

export type Priority = "HIGH" | "MED" | "LOW";
export type TaskStatus = "RUNNING" | "QUEUED" | "SUCCESS" | "FAILED";

/** 優先度 Badge 樣式 */
export const getPriorityStyle = (priority: Priority) => {
  switch (priority) {
    case "HIGH":
      return "bg-red-950/80 text-red-400 border-red-500/40 shadow-[0_0_8px_rgba(248,113,113,0.2)]";
    case "MED":
      return "bg-amber-950/80 text-amber-400 border-amber-500/40 shadow-[0_0_8px_rgba(251,191,36,0.2)]";
    case "LOW":
      return "bg-slate-800/80 text-slate-400 border-slate-600/40";
  }
};

/** 任務狀態 Badge 樣式 */
export const getStatusStyle = (status: TaskStatus) => {
  switch (status) {
    case "RUNNING":
      return "bg-cyan-950/80 text-cyan-400 border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.2)]";
    case "QUEUED":
      return "bg-slate-800/80 text-slate-300 border-slate-600/40";
    case "SUCCESS":
      return "bg-emerald-950/80 text-emerald-400 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]";
    case "FAILED":
      return "bg-rose-950/80 text-rose-400 border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.2)]";
  }
};

/** 任務是否可重試（失敗才能重試） */
export const isRetryable = (status: TaskStatus) => status === "FAILED";

/** 任務是否可取消（執行中或排隊中才能取消） */
export const isCancellable = (status: TaskStatus) =>
  status === "RUNNING" || status === "QUEUED";

// ─── 排序權重 ─────────────────────────────────────────────────────────────────

const PRIORITY_WEIGHT: Record<Priority, number> = { HIGH: 0, MED: 1, LOW: 2 };
const STATUS_WEIGHT: Record<TaskStatus, number> = {
  RUNNING: 0,
  QUEUED: 1,
  FAILED: 2,
  SUCCESS: 3,
};

/**
 * 三層排序：
 *  1. Priority（HIGH → MED → LOW）
 *  2. Status（RUNNING → QUEUED → FAILED → SUCCESS）
 *  3. scheduledAt（越早越前面）
 */
export const sortTasks = <T extends { priority: Priority; status: TaskStatus; scheduledAt: string }>(
  tasks: T[]
): T[] =>
  [...tasks].sort((a, b) => {
    const pDiff = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
    if (pDiff !== 0) return pDiff;

    const sDiff = STATUS_WEIGHT[a.status] - STATUS_WEIGHT[b.status];
    if (sDiff !== 0) return sDiff;

    return a.scheduledAt.localeCompare(b.scheduledAt);
  });

/** 點擊 badge 循環切換優先度：HIGH → MED → LOW → HIGH */
const PRIORITY_CYCLE: Record<Priority, Priority> = {
  HIGH: "MED",
  MED: "LOW",
  LOW: "HIGH",
};

export const cyclePriority = (current: Priority): Priority =>
  PRIORITY_CYCLE[current];
