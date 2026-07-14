import React, { useState, useRef, useEffect } from "react";
import {
  Terminal as TerminalIcon,
  Trash2,
  Copy,
  Check,
  Pause,
  Play,
} from "lucide-react";
import type { LogEntry, TaskOption, LogLevelFilter } from "@/types/type";

interface LogTerminalProps {
  logs: LogEntry[];
  tasks: TaskOption[];
  selectedTaskId: string;
  onSelectTask: (taskId: string) => void;
  levelFilters: Record<LogLevelFilter, boolean>;
  onToggleLevelFilter: (level: LogLevelFilter) => void;
  onClear: () => void;
  isLoading?: boolean;
}

const getLevelStyle = (level: string) => {
  const upper = level.toUpperCase();
  switch (upper) {
    case "INFO":
    case "NAVIGATING":
      return "text-cyan-400 font-semibold";
    case "WARN":
    case "WAITING":
      return "text-amber-400 font-semibold";
    case "EXEC":
    case "ACTION":
    case "START":
    case "END":
      return "text-indigo-400 font-semibold";
    case "SUCCESS":
      return "text-emerald-400 font-bold";
    case "ERROR":
      return "text-rose-400 font-bold";
    default:
      return "text-slate-400 font-semibold";
  }
};

export const LogTerminal: React.FC<LogTerminalProps> = ({
  logs,
  tasks,
  selectedTaskId,
  onSelectTask,
  levelFilters,
  onToggleLevelFilter,
  onClear,
  isLoading = false,
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 根據 Checkbox 過濾日誌
  const filteredLogs = logs.filter((log) => {
    const levelUpper = log.level.toUpperCase() as LogLevelFilter;
    if (levelUpper === "INFO" && !levelFilters.INFO) return false;
    if (levelUpper === "WARN" && !levelFilters.WARN) return false;
    if (levelUpper === "EXEC" && !levelFilters.EXEC) return false;
    if (levelUpper === "SUCCESS" && !levelFilters.SUCCESS) return false;
    return true;
  });

  // 自動捲動到底部
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [filteredLogs, autoScroll]);

  // 偵測手動向上滾動時暫停自動捲動
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 40;
    if (autoScroll && !isAtBottom) {
      setAutoScroll(false);
    } else if (!autoScroll && isAtBottom) {
      setAutoScroll(true);
    }
  };

  // 複製目前篩選的所有日誌到剪貼簿
  const handleCopy = async () => {
    if (filteredLogs.length === 0) return;
    const logText = filteredLogs
      .map((l) => `[${l.time}] [${l.level}] ${l.message}`)
      .join("\n");
    try {
      await navigator.clipboard.writeText(logText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("複製日誌失敗:", err);
    }
  };

  return (
    <div className="w-full bg-[#030712]/95 border border-slate-800/80 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl relative">
      {/* ── 頂部工具列 (符合 Mockup 的篩選與按鈕) ── */}
      <div className="bg-[#080e1c]/90 border-b border-slate-800/80 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none">
        {/* 左側：標題與任務選擇下拉選單 */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-2 text-slate-200 font-bold tracking-wider text-sm md:text-base whitespace-nowrap shrink-0">
            <TerminalIcon className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="whitespace-nowrap">系統日誌</span>
          </div>

          <select
            value={selectedTaskId}
            onChange={(e) => onSelectTask(e.target.value)}
            className="bg-slate-900/90 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs md:text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors cursor-pointer min-w-[140px] max-w-[240px] truncate shrink-0"
          >
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.name}
              </option>
            ))}
          </select>
        </div>

        {/* 右側：日誌等級過濾 Checkbox 與工具按鈕 */}
        <div className="flex items-center justify-between sm:justify-end gap-3 md:gap-4 flex-wrap shrink-0">
          {/* 中間：日誌等級過濾 Checkbox (INFO, WARN, EXEC, SUCCESS) */}
          <div className="flex items-center gap-3 md:gap-4 flex-wrap text-xs md:text-sm font-mono shrink-0">
            {(["INFO", "WARN", "EXEC", "SUCCESS"] as LogLevelFilter[]).map(
              (level) => {
                const isChecked = levelFilters[level];
                const colorClass =
                  level === "INFO"
                    ? "text-cyan-400 border-cyan-500/50"
                    : level === "WARN"
                      ? "text-amber-400 border-amber-500/50"
                      : level === "EXEC"
                        ? "text-indigo-400 border-indigo-500/50"
                        : "text-emerald-400 border-emerald-500/50";

                return (
                  <label
                    key={level}
                    className="flex items-center gap-1.5 cursor-pointer select-none group whitespace-nowrap"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggleLevelFilter(level)}
                      className="hidden"
                    />
                    <span
                      className={`w-4 h-4 rounded flex items-center justify-center border transition-all duration-150 shrink-0 ${
                        isChecked
                          ? `bg-slate-800 ${colorClass}`
                          : "bg-slate-950 border-slate-800 text-transparent"
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3 stroke-3" />}
                    </span>
                    <span
                      className={`font-semibold tracking-wider transition-colors whitespace-nowrap ${
                        isChecked ? getLevelStyle(level) : "text-slate-500"
                      }`}
                    >
                      {level}
                    </span>
                  </label>
                );
              },
            )}
          </div>

          {/* 右側工具按鈕：自動滾動、複製、清除 */}
          <div className="flex items-center gap-1.5 shrink-0 ml-auto sm:ml-0">
            {/* 自動滾動開關 */}
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 font-mono transition-all cursor-pointer ${
                autoScroll
                  ? "border-cyan-500/30 bg-cyan-950/30 text-cyan-400"
                  : "border-slate-800 bg-slate-900/50 text-slate-500 hover:text-slate-300"
              }`}
              title={
                autoScroll
                  ? "自動捲動開啟中 (點擊暫停)"
                  : "自動捲動已暫停 (點擊開啟)"
              }
            >
              {autoScroll ? (
                <Play className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Pause className="w-3.5 h-3.5" />
              )}
            </button>

            {/* 複製 */}
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/50 hover:bg-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
              title="複製篩選日誌"
            >
              {isCopied ? (
                <Check className="w-4 h-4 text-emerald-400 animate-scale-in" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>

            {/* 清除 */}
            <button
              onClick={onClear}
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/50 hover:bg-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
              title="清除日誌"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 發光背景渲染效果 */}
      <div className="absolute top-20 left-1/4 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-1/4 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* ── 終端機主體 (Monospace Log 顯示區) ── */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{ height: "540px", maxHeight: "540px", overflowY: "scroll" }}
        className="p-4 md:p-6 bg-[#02050e] font-mono text-xs md:text-sm space-y-2 relative"
      >
        {isLoading ? (
          <div className="text-slate-500 py-6 animate-pulse">
            [SYS] 正在透過後端及 TanStack Query 同步系統日誌資料...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-slate-500 py-6 italic">
            目前篩選條件或任務 ID 下無符合的日誌紀錄...
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-2.5 leading-relaxed break-all hover:bg-slate-900/30 px-2 py-0.5 rounded transition-colors"
            >
              <span className="text-slate-500 shrink-0 select-none">
                [{log.time}]
              </span>
              <span
                className={`shrink-0 select-none ${getLevelStyle(log.level)}`}
              >
                [{log.level}]
              </span>
              <span className="text-slate-300">{log.message}</span>
            </div>
          ))
        )}

        {/* 閃爍游標提示行 */}
        <div className="flex items-center text-slate-500 select-none pt-2">
          <span className="mr-2 text-cyan-400 font-semibold">[IDLE]</span>
          <span className="text-slate-400">
            Listening for event stream & background executions
          </span>
          <span className="ml-1.5 inline-block w-1.5 h-3.5 bg-cyan-400 animate-[pulse_1s_infinite]" />
        </div>

        <div ref={terminalEndRef} />
      </div>
    </div>
  );
};
