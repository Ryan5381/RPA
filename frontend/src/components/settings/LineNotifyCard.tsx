import { useState } from "react";
import {
  MessageSquare,
  CheckCircle,
  AlertCircle,
  MousePointerClick,
  Eye,
  EyeOff,
} from "lucide-react";

export const LineNotifyCard = () => {
  const [lineToken, setLineToken] = useState(
    "EY7xZ9P0kL3mN2qR5sT8vW1yB4cD6fH9jK2mN5pQ8rT",
  );
  const [showToken, setShowToken] = useState(false);
  const [triggers, setTriggers] = useState<string[]>(["success"]);

  // 切換觸發條件
  const toggleTrigger = (key: string) => {
    if (triggers.includes(key)) {
      setTriggers(triggers.filter((t) => t !== key));
    } else {
      setTriggers([...triggers, key]);
    }
  };

  return (
    <div className="border border-slate-200 dark:border-slate-800/80 bg-card/80 dark:bg-background/40 hover:border-cyan-500/40 rounded-xl p-6 relative overflow-hidden shadow-md dark:shadow-lg flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-400/60 dark:border-emerald-800/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.15)]">
              <MessageSquare className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-200 tracking-wide">
              LINE Notify 整合
            </h2>
          </div>

          <div className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-400/60 dark:border-emerald-500/40 px-2.5 py-1 rounded-full text-xs font-mono font-semibold flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
            已連線
          </div>
        </div>

        <div className="space-y-5">
          {/* 通知權杖 */}
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 font-medium mb-1.5">
              通知權杖 (Token)
            </label>
            <div className="flex gap-2">
              <input
                type={showToken ? "text" : "password"}
                value={lineToken}
                onChange={(e) => setLineToken(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-slate-200 px-3.5 py-2.5 rounded-lg text-sm font-mono focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/50 dark:focus:ring-cyan-400/50 transition-all tracking-wider"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="border border-slate-300 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-900/80 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 px-3.5 py-2.5 rounded-lg transition-colors flex items-center justify-center cursor-pointer shrink-0"
              >
                {showToken ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* 觸發條件設定 */}
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 font-medium mb-2">
              觸發條件設定
            </label>
            <div className="grid grid-cols-3 gap-3">
              {/* 選項 1: 任務成功 */}
              <div
                onClick={() => toggleTrigger("success")}
                className={`rounded-lg p-3.5 flex flex-col items-center justify-center gap-2 text-xs font-medium transition-all cursor-pointer select-none border ${
                  triggers.includes("success")
                    ? "border-cyan-500 dark:border-cyan-400 bg-cyan-100/60 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.15)] font-semibold"
                    : "border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400"
                }`}
              >
                <CheckCircle
                  className={`w-5 h-5 ${
                    triggers.includes("success")
                      ? "text-cyan-600 dark:text-cyan-400"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                />
                <span>任務成功</span>
              </div>

              {/* 選項 2: 任務失敗 */}
              <div
                onClick={() => toggleTrigger("fail")}
                className={`rounded-lg p-3.5 flex flex-col items-center justify-center gap-2 text-xs font-medium transition-all cursor-pointer select-none border ${
                  triggers.includes("fail")
                    ? "border-cyan-500 dark:border-cyan-400 bg-cyan-100/60 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.15)] font-semibold"
                    : "border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400"
                }`}
              >
                <AlertCircle
                  className={`w-5 h-5 ${
                    triggers.includes("fail") ? "text-rose-500 dark:text-rose-400" : "text-slate-400 dark:text-slate-500"
                  }`}
                />
                <span>任務失敗</span>
              </div>

              {/* 選項 3: 手動請求 */}
              <div
                onClick={() => toggleTrigger("manual")}
                className={`rounded-lg p-3.5 flex flex-col items-center justify-center gap-2 text-xs font-medium transition-all cursor-pointer select-none border ${
                  triggers.includes("manual")
                    ? "border-cyan-500 dark:border-cyan-400 bg-cyan-100/60 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.15)] font-semibold"
                    : "border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400"
                }`}
              >
                <MousePointerClick
                  className={`w-5 h-5 ${
                    triggers.includes("manual")
                      ? "text-cyan-600 dark:text-cyan-400"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                />
                <span>手動請求</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
