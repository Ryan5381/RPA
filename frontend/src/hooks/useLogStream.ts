import { useState, useEffect } from "react";
import type { LogItem } from "@/types/type";
import { getFormattedTime, formatLogEntry } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface UseLogStreamOptions {
  maxItems?: number;
  taskId?: string; // 可選：若指定 task_id，僅監聽特定任務的日誌；不指定則監聽所有日誌
}

export const useLogStream = ({ maxItems = 150, taskId }: UseLogStreamOptions = {}) => {
  const [logs, setLogs] = useState<LogItem[]>([
    {
      id: "init-ready",
      time: getFormattedTime(0),
      level: "INFO",
      message: "系統日誌串流已連接 (Supabase Realtime Ready)...",
    },
  ]);

  useEffect(() => {
    let isMounted = true;

    // 1. 載入最近的歷史紀錄
    const fetchHistoryLogs = async () => {
      try {
        let query = supabase
          .from("execution_logs")
          .select("*")
          .limit(maxItems);

        if (taskId) {
          query = query.eq("task_id", taskId);
        }

        const { data, error } = await query;
        console.log("[useLogStream] 歷史日誌查詢結果:", { data, error });

        if (error) {
          console.error("[useLogStream] 載入歷史日誌失敗:", error.message);
          return;
        }

        if (isMounted && data) {
          if (data.length > 0) {
            const formatted = data.map(formatLogEntry);
            setLogs(formatted);
          } else {
            console.log("[useLogStream] 目前 execution_logs 表格無資料");
          }
        }
      } catch (err) {
        console.error("[useLogStream] Fetch logs error:", err);
      }
    };

    fetchHistoryLogs();

    // 2. 訂閱 Supabase Realtime 新增事件 (INSERT)
    console.log("[useLogStream] 正在訂閱 Supabase Realtime 頻道...");
    const channel = supabase
      .channel(taskId ? `execution_logs_task_${taskId}` : "execution_logs_all")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "execution_logs",
          filter: taskId ? `task_id=eq.${taskId}` : undefined,
        },
        (payload) => {
          console.log("[useLogStream] 收到 Realtime 即時新增事件:", payload);
          if (!isMounted) return;
          const newLog = formatLogEntry(payload.new);
          setLogs((prev) => {
            const updated = [...prev, newLog];
            return updated.length > maxItems
              ? updated.slice(-maxItems)
              : updated;
          });
        }
      )
      .subscribe((status) => {
        console.log("[useLogStream] Realtime 訂閱狀態:", status);
      });

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [maxItems, taskId]);

  const clearLogs = () => {
    setLogs([
      {
        id: `clear-${Date.now()}`,
        time: getFormattedTime(0),
        level: "INFO",
        message: "日誌顯示畫面已清空，繼續監聽即時串流...",
      },
    ]);
  };

  return {
    logs,
    clearLogs,
    getFormattedTime,
  };
};
