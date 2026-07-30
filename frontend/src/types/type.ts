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
  table_type: string;      // 用餐桌型，如「一般」「吧台板前」；僅部分分店有此欄位，留空即用預設
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
  taskType: string; // 後端 task_type 原始值，如 "thsr_booking"，決定編輯面板要顯示哪種表單
  iconType: string; // 對應 ICON_MAP key
  scheduledAt: string; // 排程觸發時間：機器人幾點要開始執行這個任務（對應後端 scheduled_at），沒設定時退回顯示建立時間，供編輯面板/排序使用
  scheduleLabel: string; // 排程觸發時間的顯示用文字：沒有真的設定排程就顯示「立即執行」，不會出現建立時間這種誤導性的值
  targetDate: string; // 實際訂位/訂票目標日期：這筆任務訂的是哪一天（來自 config，依任務類型而異）
  priority: "HIGH" | "MED" | "LOW";
  status: "RUNNING" | "QUEUED" | "SUCCESS" | "FAILED";
  // 實際內容依 taskType 而異（各腳本讀取的欄位不同，如 from/to/date 或 hospital/deptName），
  // 這裡故意保持寬鬆型別，交由各自的表單元件與 QueueEditSheet 負責解讀
  config?: Record<string, any>;
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
