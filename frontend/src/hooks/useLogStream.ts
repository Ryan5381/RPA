import { useState, useEffect, useRef } from "react";
import mockLogs from "@/data/terminalLogs.json";
import type { LogItem } from "@/types/type";
import { getFormattedTime } from "@/lib/utils";

interface UseLogStreamOptions {
  maxItems?: number;
}

export const useLogStream = ({ maxItems = 150 }: UseLogStreamOptions = {}) => {
  const [logs, setLogs] = useState<LogItem[]>(() => {
    const offsets = [-18, -17, -13, -11, -8, -3, -1, 0];
    return mockLogs.initialLogs.map((item, idx) => ({
      id: `init-${idx}`,
      time: getFormattedTime(offsets[idx] !== undefined ? offsets[idx] : 0),
      level: item.level as LogItem["level"],
      message: item.message,
    }));
  });
  const currentSimIndexRef = useRef(0);

  // 模擬即時日誌追加與記憶體上限防護
  useEffect(() => {
    const interval = setInterval(() => {
      const queue = mockLogs.simulationLogs;
      const idx = currentSimIndexRef.current;

      const nextLogItem = queue[idx];
      const newLog: LogItem = {
        id: `sim-${Date.now()}-${idx}`,
        time: getFormattedTime(0),
        level: nextLogItem.level as LogItem["level"],
        message: nextLogItem.message,
      };

      setLogs((prev) => {
        const updated = [...prev, newLog];
        // 記憶體防護：只保留最新的 maxItems 筆日誌
        return updated.length > maxItems ? updated.slice(-maxItems) : updated;
      });

      // 循環輪播模擬數據
      currentSimIndexRef.current = (idx + 1) % queue.length;
    }, 4000);

    return () => clearInterval(interval);
  }, [maxItems]);

  const clearLogs = () => {
    setLogs([
      {
        id: `clear-${Date.now()}`,
        time: getFormattedTime(0),
        level: "INFO",
        message: "Terminal logs cleared. Live monitoring active...",
      },
    ]);
  };

  return {
    logs,
    clearLogs,
    getFormattedTime,
  };
};
