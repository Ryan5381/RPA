export interface LogItem {
  id: string;
  time: string;
  level: "start" | "navigating" | "action" | "waiting" | "success" | "end" | "error" | "INFO";
  message: string;
}

// ─── Workflow 表單狀態 ────────────────────────────────────────────────────────
export interface WorkflowFormState {
  platform: string;
  idNumber: string;
  name: string;
  password: string;
  specialtyA: string;
  specialtyB: string;
  slotA: string;
  slotB: string;
  lineNotify: boolean;
}

// ─── 預約偏好順位 ─────────────────────────────────────────────────────────────
export interface Preference {
  id: string;
  date: string;
  time: string;
  label: string;
}

// ─── 優先序列任務 (Queue) ─────────────────────────────────────────────────────
export interface QueueTask {
  id: string; // TSK-0001
  name: string; // 任務名稱
  iconType: string; // 對應 ICON_MAP key
  scheduledAt: string; // 預約日期 YYYY-MM-DD
  priority: "HIGH" | "MED" | "LOW";
  status: "RUNNING" | "QUEUED" | "SUCCESS" | "FAILED";
  config?: {
    target?: string;
    account?: string;
    notify?: boolean;
  };
}

// ─── 執行中任務 (Process) ────────────────────────────────────────────────────
export interface Process {
  id: number;
  title: string;
  iconType: string;
  category: string;
  account: string;
  status: string;
  progress: number;
  stepLabel: string;
  details: { label: string; value: string }[];
  footerLabel: string;
  footerValue: string;
  footerType: string;
  logs?: string[];
}
