import React from "react";
import type { TaskStats } from "@/types/type";

interface TaskStatusSummaryCardProps {
  stats?: TaskStats;
  isLoading?: boolean;
}

export const TaskStatusSummaryCard: React.FC<TaskStatusSummaryCardProps> = ({
  stats = {
    successRate24h: 0,
    running: 0,
    completed: 0,
    error: 0,
    waiting: 0,
  },
  isLoading = false,
}) => {
  return (
    <div className="w-full bg-[#030712]/90 border border-slate-800/80 rounded-xl p-5 shadow-2xl relative overflow-hidden backdrop-blur-xl flex flex-col justify-between h-full">
      {/* ── 卡片標題 ── */}
      <h3 className="text-sm md:text-base font-bold text-slate-200 tracking-wider mb-4">
        任務狀態摘要
      </h3>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center py-8 text-slate-500 font-mono text-sm animate-pulse">
          載入狀態摘要中...
        </div>
      ) : (
        <div className="space-y-5 flex-1 flex flex-col justify-between">
          {/* 成功率與進度條 */}
          <div className="space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="text-xs md:text-sm text-slate-300 font-medium tracking-wide">
                成功率 (24h)
              </span>
              <span className="text-base md:text-lg font-mono font-bold text-slate-100">
                {stats.successRate24h}%
              </span>
            </div>
            {/* 客製化漸層進度條 */}
            <div className="w-full h-2 rounded-full bg-slate-800/90 overflow-hidden p-0.5 border border-slate-700/40">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 shadow-[0_0_8px_rgba(6,182,212,0.5)] transition-all duration-700 ease-out"
                style={{ width: `${stats.successRate24h}%` }}
              />
            </div>
          </div>

          {/* 四宮格數據卡片 */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            {/* 執行中 */}
            <div className="border border-slate-800/80 bg-slate-900/40 hover:border-cyan-500/30 rounded-xl p-3.5 transition-all duration-200">
              <p className="text-xs text-slate-400 font-medium tracking-wider">
                執行中
              </p>
              <p className="text-xl md:text-2xl font-mono font-bold text-slate-100 mt-1.5 flex items-center gap-2">
                {stats.running > 0 && (
                  <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
                )}
                {stats.running}
              </p>
            </div>

            {/* 已完成 */}
            <div className="border border-slate-800/80 bg-slate-900/40 hover:border-emerald-500/30 rounded-xl p-3.5 transition-all duration-200">
              <p className="text-xs text-slate-400 font-medium tracking-wider">
                已完成
              </p>
              <p className="text-xl md:text-2xl font-mono font-bold text-slate-100 mt-1.5">
                {stats.completed}
              </p>
            </div>

            {/* 錯誤 */}
            <div className="border border-slate-800/80 bg-slate-900/40 hover:border-rose-500/30 rounded-xl p-3.5 transition-all duration-200">
              <p className="text-xs text-slate-400 font-medium tracking-wider">
                錯誤
              </p>
              <p className="text-xl md:text-2xl font-mono font-bold text-rose-400 mt-1.5">
                {stats.error}
              </p>
            </div>

            {/* 等待中 */}
            <div className="border border-slate-800/80 bg-slate-900/40 hover:border-slate-700 rounded-xl p-3.5 transition-all duration-200">
              <p className="text-xs text-slate-400 font-medium tracking-wider">
                等待中
              </p>
              <p className="text-xl md:text-2xl font-mono font-bold text-slate-100 mt-1.5">
                {stats.waiting}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
