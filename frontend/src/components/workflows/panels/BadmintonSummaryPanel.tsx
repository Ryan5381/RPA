import React from "react";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface BadmintonSummaryPanelProps {
  badmintonForm?: {
    target_date?: string;
    target_time_slot?: string;
    target_courts?: string;
    target_time?: string;
    session_count?: string;
  };
  handleLaunchTask: () => void;
  isLaunching: boolean;
}

export const BadmintonSummaryPanel: React.FC<BadmintonSummaryPanelProps> = ({
  badmintonForm,
  handleLaunchTask,
  isLaunching,
}) => {
  return (
    <div className="bg-card/90 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-xl p-6 backdrop-blur-xl flex flex-col h-full justify-between shadow-sm dark:shadow-none">
      <div>
        {/* 標頭 */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200 tracking-wider flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400 shrink-0" />
            任務總覽
          </h3>
          <Badge
            variant="outline"
            className="text-[10px] font-mono bg-cyan-100 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-400 border-cyan-400/60 dark:border-cyan-500/40 px-2"
          >
            API ENGINE v2.0
          </Badge>
        </div>

        {/* 任務設定摘要面板 */}
        <div className="space-y-3 mb-6">
          <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-lg p-4 space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800/60">
              <span className="text-slate-500 dark:text-slate-400">目標打球日</span>
              <span className="text-cyan-600 dark:text-cyan-400 font-bold">
                {badmintonForm?.target_date || "未填寫"}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800/60">
              <span className="text-slate-500 dark:text-slate-400">目標時段</span>
              <span className="text-cyan-600 dark:text-cyan-400 font-bold">
                {badmintonForm?.target_time_slot
                  ? `${badmintonForm.target_time_slot}:00`
                  : "13:00"}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800/60">
              <span className="text-slate-500 dark:text-slate-400">球場順位接力</span>
              <span className="text-slate-900 dark:text-slate-200 truncate max-w-[180px]">
                {badmintonForm?.target_courts || "羽6,羽8,羽9"}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800/60">
              <span className="text-slate-500 dark:text-slate-400">發動策略</span>
              {badmintonForm?.target_time ? (
                <span className="text-amber-600 dark:text-amber-400 font-bold">
                  ⏰ 定時：{badmintonForm.target_time}
                </span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  ⚡ 立即毫秒秒殺
                </span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">線程火力</span>
              <span className="text-violet-600 dark:text-violet-400 font-bold">
                {badmintonForm?.session_count || 2} 個並行 Session
              </span>
            </div>
          </div>

          <div className="bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-300 dark:border-cyan-800/30 rounded-lg p-3 text-[11px] text-cyan-700 dark:text-cyan-300 font-mono space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-cyan-800 dark:text-cyan-200">
              ⚡ 核心 API 秒殺引擎就緒
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[10px]">
              全自動依賴後端 HTTPX 併發通訊，內建 Turnstile 雲端 AI
              預先授權與動態訂單編號協議穿透。
            </p>
          </div>
        </div>
      </div>

      {/* 啟動按鈕 */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800/60">
        <Button
          onClick={handleLaunchTask}
          disabled={isLaunching}
          className="w-full h-11 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold text-sm tracking-wider border-0 cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.2)] hover:shadow-[0_0_30px_rgba(6,182,212,0.35)] transition-all duration-200 gap-2"
        >
          <Zap className="w-4 h-4" />
          {isLaunching ? "正在發動搶票攻擊..." : "啟動自動化任務"}
        </Button>
        <p className="text-[10px] font-mono text-slate-500 dark:text-slate-600 text-center mt-2">
          按鍵即啟動，後端純 API 毫秒執行無須等待瀏覽器
        </p>
      </div>
    </div>
  );
};
