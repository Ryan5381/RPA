import { useState } from "react";
import {
  FileTerminal,
  Play,
  Pause,
  RotateCcw,
  User,
  Terminal,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ICON_MAP } from "@/lib/icons";

interface Process {
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

interface AllProcessesModalProps {
  isOpen: boolean;
  onClose: (open: boolean) => void;
  processes: Process[];
}

export const AllProcessesModal = ({
  isOpen,
  onClose,
  processes,
}: AllProcessesModalProps) => {
  const [expandedLogs, setExpandedLogs] = useState<Record<number, boolean>>({});

  const toggleLogs = (id: number) => {
    setExpandedLogs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-6xl bg-slate-950/95 border-slate-800 text-slate-100 p-6 shadow-2xl backdrop-blur-xl">
        <DialogHeader className="mb-4">
          <DialogDescription className="flex items-center justify-start gap-3 text-xs font-mono text-slate-400">
            <FileTerminal className="w-5 h-5 text-cyan-400" />
            顯示所有 RPA 執行中的任務、排程與歷史記錄。
          </DialogDescription>
        </DialogHeader>

        {/* 任務排程清單 */}
        <div className="max-h-[65vh] overflow-y-auto space-y-4 pr-2">
          {processes.map((proc) => {
            const Icon = ICON_MAP[proc.iconType] || FileTerminal;
            const isLogOpen = !!expandedLogs[proc.id];

            return (
              <div
                key={proc.id}
                className={`p-5 rounded-xl border transition-all duration-300 flex flex-col gap-4 ${
                  proc.status === "RUNNING"
                    ? "bg-cyan-950/15 border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.03)]"
                    : proc.status === "SUCCESS"
                      ? "bg-emerald-950/5 border-emerald-500/15"
                      : "bg-slate-900/30 border-slate-800"
                }`}
              >
                {/* 第一排：標頭資訊與操作控制列 */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* 標題與分類 */}
                  <div className="flex items-center gap-3.5 min-w-[260px]">
                    <div
                      className={`p-2.5 rounded-lg ${
                        proc.status === "RUNNING"
                          ? "bg-cyan-950/50 text-cyan-400"
                          : proc.status === "SUCCESS"
                            ? "bg-emerald-950/50 text-emerald-400"
                            : "bg-slate-900 text-slate-400"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200 text-sm tracking-wide">
                          {proc.title}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[9px] bg-slate-900/60 text-slate-400 border-slate-800 px-1.5 py-0 rounded"
                        >
                          {proc.category}
                        </Badge>
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5 mt-1">
                        <User className="w-3 h-3 text-slate-600" />
                        執行帳號:{" "}
                        <span className="text-slate-400">{proc.account}</span>
                      </div>
                    </div>
                  </div>

                  {/* 進度顯示與進度條 */}
                  <div className="flex-1 w-full px-0 lg:px-6">
                    <div className="flex justify-between items-center text-xs font-mono mb-1.5">
                      <span className="text-slate-400 truncate pr-2 flex items-center gap-1">
                        {proc.status === "RUNNING" && (
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping inline-block shrink-0" />
                        )}
                        <span>{proc.stepLabel}</span>
                      </span>
                      <span
                        className={`font-bold tabular-nums ${
                          proc.status === "RUNNING"
                            ? "text-cyan-400"
                            : proc.status === "SUCCESS"
                              ? "text-emerald-400"
                              : "text-slate-400"
                        }`}
                      >
                        {proc.progress}%
                      </span>
                    </div>
                    <Progress
                      value={proc.progress}
                      className="w-full"
                      trackClassName="h-1.5 bg-slate-900 border border-slate-800/80"
                      indicatorClassName={
                        proc.status === "RUNNING"
                          ? "bg-gradient-to-r from-cyan-500 to-blue-400 shadow-[0_0_10px_rgba(6,182,212,0.4)]"
                          : proc.status === "SUCCESS"
                            ? "bg-emerald-400"
                            : "bg-slate-700"
                      }
                    />
                  </div>

                  {/* 狀態 Badge 與控制操作按鈕 */}
                  <div className="flex items-center justify-between lg:justify-end gap-3 w-full lg:w-auto shrink-0 border-t border-slate-900 pt-3 lg:border-none lg:pt-0">
                    <div className="text-left lg:text-right font-mono text-xs hidden sm:block">
                      <div className="text-slate-500">{proc.footerLabel}</div>
                      <div className="text-slate-300 font-semibold">
                        {proc.footerValue}
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full ${
                        proc.status === "RUNNING"
                          ? "bg-cyan-950/80 text-cyan-400 border-cyan-500/40"
                          : proc.status === "SUCCESS"
                            ? "bg-emerald-950/80 text-emerald-400 border-emerald-500/40"
                            : "bg-slate-900 text-slate-400 border-slate-700"
                      }`}
                    >
                      {proc.status === "RUNNING" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping mr-1" />
                      )}
                      {proc.status}
                    </Badge>

                    {/* 控制按鈕組 */}
                    <div className="flex items-center gap-1 bg-slate-900/60 p-0.5 rounded-lg border border-slate-800/80">
                      {proc.status === "RUNNING" ? (
                        <button
                          className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-amber-400 transition-colors tooltip"
                          title="暫停任務"
                        >
                          <Pause className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          className="p-1.5 hover:bg-slate-800 rounded text-slate-500 hover:text-emerald-400 transition-colors"
                          title="啟動任務"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        className="p-1.5 hover:bg-slate-800 rounded text-slate-500 hover:text-cyan-400 transition-colors"
                        title="重置/重啟任務"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 第二排：即時執行日誌 logs (摺疊面板) */}
                {proc.logs && proc.logs.length > 0 && (
                  <div className="border-t border-slate-900/60 pt-3">
                    <button
                      onClick={() => toggleLogs(proc.id)}
                      className="text-[10px] font-mono text-cyan-500/80 hover:text-cyan-400 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Terminal className="w-3 h-3" />
                      {isLogOpen
                        ? "隱藏執行日誌 HIDE LOGS"
                        : "展開即時日誌 SHOW LIVE LOGS"}{" "}
                      ({proc.logs.length})
                    </button>

                    {isLogOpen && (
                      <div className="mt-2.5 p-3 bg-black/70 rounded-lg border border-slate-900 font-mono text-[10px] text-slate-400 space-y-1.5 shadow-inner">
                        <div className="flex justify-between items-center text-slate-600 border-b border-slate-900 pb-1 mb-1 font-bold">
                          <span>LOGSTREAM // PROCESS_ID: #00{proc.id}</span>
                          <span className="flex items-center gap-1 text-[9px] text-cyan-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                            LIVE FEED
                          </span>
                        </div>
                        {proc.logs.map((log, logIdx) => (
                          <div
                            key={logIdx}
                            className="flex gap-2 text-slate-300"
                          >
                            <span className="text-cyan-500/60 shrink-0">❯</span>
                            <span className="break-all">{log}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};
