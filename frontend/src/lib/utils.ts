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
  const typeMap: Record<string, string> = {
    flight_search:      "✈️ 機票搜尋",
    inline_booking:     "🍽️ 餐廳訂位",
    hospital_booking:   "🏥 醫院掛號",
    thsr_booking:       "🚄 高鐵訂票",
    tixcraft_booking:   "🎟️ 拓元搶票",
    badminton_booking:  "🏸 羽球訂場",
    concert_ticket:     "🎟️ 演唱會搶票",
  };

  const taskType = row.task_type || row.name || "";
  let baseName = typeMap[taskType] || taskType || `任務-${row.id}`;

  // 從 config 提取有意義的副標題
  const cfg = row.config || {};
  const subParts: string[] = [];

  if (taskType === "thsr_booking") {
    const from = cfg.from || "";
    const to   = cfg.to   || "";
    if (from && to) subParts.push(`${from}→${to}`);
    else if (from || to) subParts.push(from || to);
  } else if (taskType === "flight_search") {
    const origin = cfg.origin || cfg.from || "";
    const dest   = cfg.destination || cfg.to || "";
    if (origin && dest) subParts.push(`${origin}→${dest}`);
    if (cfg.depart_date) subParts.push(cfg.depart_date.slice(5)); // MM-DD
  } else if (taskType === "hospital_booking") {
    const hosp = cfg.hospital === "NTUH" ? "台大" : cfg.hospital === "CGMH" ? "長庚" : cfg.hospital || "";
    const dept = cfg.deptName || cfg.department || "";
    if (hosp) subParts.push(hosp);
    if (dept) subParts.push(dept);
  } else if (taskType === "tixcraft_booking" || taskType === "concert_ticket") {
    if (cfg.target_date) subParts.push(cfg.target_date.slice(5));
    if (cfg.target_area) subParts.push(cfg.target_area);
  } else if (taskType === "inline_booking") {
    if (cfg.restaurant_key) subParts.push(cfg.restaurant_key);
    if (cfg.target_date)    subParts.push(cfg.target_date.slice(5));
  }

  // 時間戳記（精確到秒以區分同分鐘內的多筆任務）
  let timeLabel = "";
  if (row.created_at) {
    const d = new Date(row.created_at);
    timeLabel = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
  } else if (row.id) {
    timeLabel = String(row.id).substring(0, 6);
  }

  const subLabel = subParts.length > 0 ? ` ${subParts.join(" ")}` : "";
  const fullName = timeLabel ? `${baseName}${subLabel} (${timeLabel})` : `${baseName}${subLabel}`;

  return {
    id:     String(row.id || row.task_id || "unknown"),
    name:   fullName,
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
