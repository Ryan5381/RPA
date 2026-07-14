import React, { useState } from "react";
import { useLogsData } from "@/hooks/useLogsData";
import { LogTerminal } from "./LogTerminal";
import { LivePreviewCard } from "./LivePreviewCard";
import { TaskStatusSummaryCard } from "./TaskStatusSummaryCard";
import type { LogLevelFilter } from "@/types/type";

export const Logs: React.FC = () => {
  const [selectedTaskId, setSelectedTaskId] = useState<string>("ALL");
  const [levelFilters, setLevelFilters] = useState<Record<LogLevelFilter, boolean>>({
    INFO: true,
    WARN: true,
    EXEC: true,
    SUCCESS: true,
  });

  // 透過自訂 Hook (結合 TanStack Query & 即時日誌) 取得任務、日誌與統計摘要
  const {
    tasks,
    isLoadingTasks,
    stats,
    isLoadingStats,
    logs,
    isLoadingLogs,
    clearLogs,
    refetchAll,
  } = useLogsData(selectedTaskId);

  // 切換日誌等級過濾
  const handleToggleLevelFilter = (level: LogLevelFilter) => {
    setLevelFilters((prev) => ({
      ...prev,
      [level]: !prev[level],
    }));
  };

  // 根據目前選擇的任務，動態設定右上方「瀏覽器即時預覽」的文案與目標網址
  const getPreviewConfig = () => {
    const currentTask = tasks.find((t) => t.id === selectedTaskId);
    if (selectedTaskId === "ALL" || !currentTask) {
      return {
        status: "RUNNING" as const,
        stepText: "監控系統全域日誌中...\n(即時同步資料表)",
        url: "http://localhost:5173/dashboard",
      };
    }
    const statusStr = currentTask.status === "SUCCESS" || currentTask.status === "IDLE" ? "IDLE" : "RUNNING";
    return {
      status: statusStr as any,
      stepText:
        currentTask.status === "RUNNING"
          ? `正在執行任務流程:\n${currentTask.name}`
          : `任務狀態: ${currentTask.status}\n等待指令中...`,
      url: currentTask.name.startsWith("http")
        ? currentTask.name
        : `https://rpa.engine/tasks/${currentTask.id}`,
    };
  };

  const previewConfig = getPreviewConfig();

  return (
    <div className="w-full min-w-0">
      {/* 左右分欄或堆疊佈局 (完美還原用戶 Mockup 且完整展開) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full min-w-0">
        {/* 左側：系統日誌終端區 (LogTerminal) 佔據 8/12 欄位 */}
        <div className="lg:col-span-8 min-w-0">
          <LogTerminal
            logs={logs}
            tasks={tasks}
            selectedTaskId={selectedTaskId}
            onSelectTask={setSelectedTaskId}
            levelFilters={levelFilters}
            onToggleLevelFilter={handleToggleLevelFilter}
            onClear={clearLogs}
            isLoading={isLoadingLogs || isLoadingTasks}
          />
        </div>

        {/* 右側：上下堆疊即時預覽與任務狀態摘要 佔據 4/12 欄位 */}
        <div className="lg:col-span-4 flex flex-col gap-6 min-w-0">
          {/* 上方：瀏覽器即時預覽 (LivePreviewCard) */}
          <div className="min-w-0">
            <LivePreviewCard
              status={previewConfig.status}
              stepText={previewConfig.stepText}
              url={previewConfig.url}
              onRefresh={refetchAll}
            />
          </div>

          {/* 下方：任務狀態摘要 (TaskStatusSummaryCard) */}
          <div className="min-w-0">
            <TaskStatusSummaryCard
              stats={stats}
              isLoading={isLoadingStats}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
