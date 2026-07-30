import React, { useState } from "react";
import { useLogsData } from "@/hooks/useLogsData";
import { LogTerminal } from "./LogTerminal";
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
  } = useLogsData(selectedTaskId);

  // 切換日誌等級過濾
  const handleToggleLevelFilter = (level: LogLevelFilter) => {
    setLevelFilters((prev) => ({
      ...prev,
      [level]: !prev[level],
    }));
  };

  return (
    <div className="w-full min-w-0">
      {/* 左右分欄或堆疊佈局 */}
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

        {/* 右側：任務狀態摘要 佔據 4/12 欄位 */}
        <div className="lg:col-span-4 flex flex-col gap-6 min-w-0">
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

