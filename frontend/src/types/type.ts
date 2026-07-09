export interface LogItem {
  id: string;
  time: string;
  level: "INFO" | "WARN" | "EXEC" | "SUCCESS" | "ERROR";
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
