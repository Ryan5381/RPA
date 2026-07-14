import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { LogEntry, TaskOption, TaskStats } from "@/types/type";
import { supabase } from "@/lib/supabase";
import {
  getFormattedTime,
  formatLogEntry,
  fetchLogTasks,
  fetchTaskStats,
  fetchTaskLogs,
} from "@/lib/utils";

export const useLogsData = (selectedTaskId: string = "ALL") => {
  const queryClient = useQueryClient();
  const [localLogs, setLocalLogs] = useState<LogEntry[]>([]);

  // 1. 使用 TanStack Query 取得任務下拉選單
  const tasksQuery = useQuery<TaskOption[]>({
    queryKey: ["logTasks"],
    queryFn: fetchLogTasks,
    staleTime: 1000 * 30, // 30秒
  });

  // 2. 使用 TanStack Query 取得任務狀態摘要統計
  const statsQuery = useQuery<TaskStats>({
    queryKey: ["taskStats"],
    queryFn: fetchTaskStats,
    refetchInterval: 1000 * 15, // 每 15 秒更新一次
  });

  // 3. 使用 TanStack Query 取得歷史與現有日誌
  const logsQuery = useQuery<LogEntry[]>({
    queryKey: ["taskLogs", selectedTaskId],
    queryFn: () => fetchTaskLogs(selectedTaskId),
    refetchInterval: 1000 * 5, // 每 5 秒同步一次後端日誌
  });

  // 當 API 撈取或切換任務後，初始化或同步 localLogs
  useEffect(() => {
    if (logsQuery.data) {
      setLocalLogs(logsQuery.data);
    }
  }, [logsQuery.data]);

  // 4. 訂閱 Supabase Realtime 即時日誌串流
  useEffect(() => {
    let isMounted = true;
    const channelName =
      selectedTaskId && selectedTaskId !== "ALL"
        ? `realtime_logs_${selectedTaskId}`
        : "realtime_logs_all";

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "execution_logs",
          filter:
            selectedTaskId && selectedTaskId !== "ALL"
              ? `task_id=eq.${selectedTaskId}`
              : undefined,
        },
        (payload) => {
          if (!isMounted || !payload.new) return;
          const newLog = formatLogEntry(payload.new);
          setLocalLogs((prev) => {
            const updated = [...prev, newLog];
            return updated.length > 200 ? updated.slice(-200) : updated;
          });
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [selectedTaskId]);

  // 清除畫面上的日誌
  const clearLogs = () => {
    setLocalLogs([
      {
        id: `clear-${Date.now()}`,
        time: getFormattedTime(0),
        level: "INFO",
        message: "日誌已清空，正在持續監聽最新系統與後端事件...",
        taskId: selectedTaskId,
      },
    ]);
  };

  // 重新整理所有查詢
  const refetchAll = () => {
    queryClient.invalidateQueries({ queryKey: ["logTasks"] });
    queryClient.invalidateQueries({ queryKey: ["taskStats"] });
    queryClient.invalidateQueries({ queryKey: ["taskLogs", selectedTaskId] });
  };

  return {
    tasks: tasksQuery.data || [{ id: "ALL", name: "所有任務", status: "RUNNING" }],
    isLoadingTasks: tasksQuery.isLoading,
    stats: statsQuery.data || {
      successRate24h: 0,
      running: 0,
      completed: 0,
      error: 0,
      waiting: 0,
    },
    isLoadingStats: statsQuery.isLoading,
    logs: localLogs.length > 0 ? localLogs : logsQuery.data || [],
    isLoadingLogs: logsQuery.isLoading,
    clearLogs,
    refetchAll,
  };
};
