import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { supabase } from "@/lib/supabase";
import type { LogEntry, TaskOption, TaskStats } from "@/types/type";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getFormattedTime = (offsetSeconds = 0) => {
  const d = new Date(Date.now() + offsetSeconds * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

// ─── 資料轉換與 Supabase 查詢通用輔助函式 ──────────────────────────────────────
export const formatLogEntry = (row: any): LogEntry => {
  let timeStr = row.time || getFormattedTime(0);
  if (row.created_at) {
    const dateObj = new Date(row.created_at);
    timeStr = dateObj.toTimeString().split(" ")[0]; // HH:mm:ss
  }
  return {
    id: row.id ? String(row.id) : `log-${Math.random()}`,
    time: timeStr,
    level: row.level || "INFO",
    message: row.message || "",
    taskId: row.task_id ? String(row.task_id) : undefined,
  };
};

export const formatTaskOption = (row: any): TaskOption => {
  return {
    id: String(row.id || row.task_id || "unknown"),
    name: row.name || row.task_type || `任務-${row.id}`,
    status: (row.status ? row.status.toUpperCase() : "IDLE") as any,
  };
};

export const fetchLogTasks = async (): Promise<TaskOption[]> => {
  try {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    if (data && data.length > 0) {
      const mapped = data.map(formatTaskOption);
      return [{ id: "ALL", name: "所有任務", status: "RUNNING" }, ...mapped];
    }
  } catch (err) {
    console.warn("[utils] Supabase 查詢 tasks 失敗:", err);
  }
  return [{ id: "ALL", name: "所有任務", status: "RUNNING" }];
};

export const fetchTaskStats = async (): Promise<TaskStats> => {
  try {
    const { data, error } = await supabase.from("tasks").select("status");
    if (error) throw error;
    if (data) {
      const total = data.length;
      const running = data.filter((t: any) =>
        ["running", "pending", "執行中"].includes(String(t.status || "").toLowerCase())
      ).length;
      const completed = data.filter((t: any) =>
        ["completed", "success", "已完成", "成功"].includes(String(t.status || "").toLowerCase())
      ).length;
      const errorCnt = data.filter((t: any) =>
        ["error", "failed", "錯誤", "失敗"].includes(String(t.status || "").toLowerCase())
      ).length;
      const waiting = data.filter((t: any) =>
        ["waiting", "queued", "等待中"].includes(String(t.status || "").toLowerCase())
      ).length;
      const successRate = total > 0 ? Number(((completed / total) * 100).toFixed(1)) : 100;
      return { successRate24h: successRate, running, completed, error: errorCnt, waiting };
    }
  } catch (err) {
    console.warn("[utils] Supabase 統計 tasks 失敗:", err);
  }
  return {
    successRate24h: 0,
    running: 0,
    completed: 0,
    error: 0,
    waiting: 0,
  };
};

export const fetchTaskLogs = async (taskId?: string): Promise<LogEntry[]> => {
  try {
    let query = supabase
      .from("execution_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (taskId && taskId !== "ALL") {
      query = query.eq("task_id", taskId);
    }
    const { data, error } = await query;
    if (error) throw error;
    if (data && data.length > 0) {
      const sorted = data.reverse();
      return sorted.map(formatLogEntry);
    }
  } catch (err) {
    console.warn("[utils] Supabase 讀取 execution_logs 失敗:", err);
  }
  return [];
};
