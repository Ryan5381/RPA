import React, { useEffect, useRef, useState } from "react";
import { Copy, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLogStream } from "@/hooks/useLogStream";

// ─── 日誌等級顏色對應 ───────────────────────────────────────────────────────
const getLevelColor = (level: string) => {
  switch (level) {
    case "start":
    case "end":
      return "text-indigo-400"; // 流程節點
    case "navigating":
      return "text-cyan-400"; // 導航
    case "action":
      return "text-emerald-400"; // 填表動作
    case "waiting":
      return "text-amber-400 animate-pulse"; // 等待輸入 (加入閃爍效果)
    case "success":
      return "text-green-400 font-bold"; // 成功
    case "error":
      return "text-rose-400 font-bold"; // 錯誤
    default:
      return "text-slate-400"; // 其他/預設
  }
};

// ─── LiveTerminal ────────────────────────────────────────────────────────────
export const LiveTerminal: React.FC = () => {
  const { logs, clearLogs, getFormattedTime } = useLogStream({ maxItems: 150 });
  const [isCopied, setIsCopied] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // 自動捲動到底部
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // 複製所有日誌到剪貼簿
  const handleCopy = async () => {
    if (logs.length === 0) return;
    const logText = logs
      .map((log) => `[${log.time}] [${log.level}] ${log.message}`)
      .join("\n");
    try {
      await navigator.clipboard.writeText(logText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy logs:", err);
    }
  };

  return (
    <div className="w-full text-slate-100">
      {/* ── 區塊標頭 ── */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-slate-200 tracking-wider flex items-center gap-2">
          即時日誌{" "}
          <span className="text-xs font-mono text-slate-500 font-normal">
            Live System Terminal
          </span>
        </h2>

        <div className="flex items-center gap-3">
          {/* 連線狀態標記 */}
          <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono font-medium bg-emerald-950/30 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE
          </span>

          <Button
            variant="outline"
            size="icon-sm"
            onClick={handleCopy}
            title="複製日誌"
            className="border-slate-800 hover:border-slate-700 bg-slate-900/50 hover:bg-slate-900 text-slate-400 hover:text-slate-200 cursor-pointer transition-all duration-200 h-8 w-8"
          >
            {isCopied ? (
              <Check className="w-4 h-4 text-emerald-400 animate-scale-in" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>

          <Button
            variant="outline"
            size="icon-sm"
            onClick={clearLogs}
            title="清除日誌"
            className="border-slate-800 hover:border-slate-700 bg-slate-900/50 hover:bg-slate-900 text-slate-400 hover:text-rose-400 cursor-pointer transition-all duration-200 h-8 w-8"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* ── 終端機主體 ── */}
      <div className="w-full bg-[#030712]/90 border border-slate-800/80 rounded-xl p-5 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        {/* 背景發光效果 */}
        <div className="absolute top-0 left-0 w-32 h-32 -translate-x-1/2 -translate-y-1/2 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-32 h-32 translate-x-1/2 translate-y-1/2 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* 日誌列表 */}
        <div className="max-h-48 overflow-y-auto font-mono text-xs md:text-sm text-slate-300 space-y-2.5 pr-2">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-2.5 leading-relaxed break-all"
            >
              <span className="text-slate-500 shrink-0 select-none">
                [{log.time}]
              </span>
              <span
                className={`font-semibold shrink-0 select-none ${getLevelColor(log.level)}`}
              >
                [{log.level}]
              </span>
              <span className="text-slate-300">{log.message}</span>
            </div>
          ))}

          {/* 閃爍游標 */}
          <div className="flex items-center text-slate-500 select-none">
            <span className="mr-1.5">[{getFormattedTime(0)}]</span>
            <span className="text-cyan-400 font-semibold mr-2">[EXEC]</span>
            <span className="text-slate-300">
              Listening to system event stream
            </span>
            <span className="ml-1 inline-block w-1.5 h-3.5 bg-cyan-400 animate-[pulse_1s_infinite]" />
          </div>

          <div ref={terminalEndRef} />
        </div>
      </div>

      {/* 複製按鈕縮放動畫 */}
      <style>{`
        @keyframes scale-in {
          0% { transform: scale(0.9); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-scale-in { animation: scale-in 0.15s ease-out forwards; }
      `}</style>
    </div>
  );
};
