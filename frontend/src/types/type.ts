export interface LogItem {
  id: string;
  time: string;
  level: "start" | "navigating" | "action" | "waiting" | "success" | "end" | "error" | "INFO" | "WARN" | "EXEC" | "SUCCESS" | string;
  message: string;
  taskId?: string;
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

// ─── inline.app 訂位表單狀態 ─────────────────────────────────────────────
export type InlineGender = "小姐" | "先生" | "其他";
// "midday" / "afternoon" / "evening"（粗略時段）或 "HH:MM"（部分餐廳如屋馬燒肉的精確時段）
export type InlineSession = "midday" | "afternoon" | "evening" | (string & {});
export type InlinePurpose = "birthday" | "date" | "anniversary" | "family" | "friends" | "business" | "";

export interface InlineBookingForm {
  restaurant_key: string;  // e.g. "islandbuffet"
  branch_key: string;      // e.g. "kaohsiung_hanshin"
  target_date: string;     // YYYY-MM-DD
  session: InlineSession;
  adults: string;          // "1"~"7"
  kids: string;            // "0"~"5"
  last_name: string;
  first_name: string;
  gender: InlineGender;
  phone: string;           // 09xxxxxxxx
  email: string;
  purpose: InlinePurpose;
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
  id: number | string;
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

// ─── 日誌系統與任務狀態 (Logs & Task Stats) ────────────────────────────────────
export type LogLevelFilter = "INFO" | "WARN" | "EXEC" | "SUCCESS";

export interface LogEntry {
  id: string;
  time: string;
  level: LogLevelFilter | string;
  message: string;
  taskId?: string;
}

export interface TaskOption {
  id: string;
  name: string;
  status: "RUNNING" | "IDLE" | "ERROR" | "SUCCESS";
}

export interface TaskStats {
  successRate24h: number;
  running: number;
  completed: number;
  error: number;
  waiting: number;
}

export interface BrowserPreviewState {
  status: "RUNNING" | "IDLE" | "PAUSED";
  url: string;
  stepDescription: string;
  confidence?: number;
}
