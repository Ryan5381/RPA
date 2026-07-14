import React from "react";
import { Globe, RefreshCw } from "lucide-react";

interface LivePreviewCardProps {
  status?: "RUNNING" | "IDLE" | "PAUSED";
  stepText?: string;
  url?: string;
  onRefresh?: () => void;
}

export const LivePreviewCard: React.FC<LivePreviewCardProps> = ({
  status = "RUNNING",
  stepText = "Solving\nCaptcha...",
  url = "https://booking.thsrc.com.tw/ticket/search",
  onRefresh,
}) => {
  return (
    <div className="w-full bg-[#030712]/90 border border-slate-800/80 rounded-xl p-5 shadow-2xl relative overflow-hidden backdrop-blur-xl flex flex-col h-full">
      {/* ── 卡片頂部標題與狀態 ── */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm md:text-base font-bold text-slate-200 tracking-wider flex items-center gap-2">
          瀏覽器即時預覽
        </h3>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs text-cyan-400 font-mono font-medium bg-cyan-950/40 px-2.5 py-1 rounded-full border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
            {status}
          </span>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-1 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              title="重新整理預覽畫面"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── 瀏覽器模擬框主體 ── */}
      <div className="flex-1 flex flex-col border border-slate-800/90 rounded-lg overflow-hidden bg-[#060d1a]/80 shadow-inner">
        {/* 虛擬瀏覽器頂部視窗條 */}
        <div className="bg-slate-900/90 border-b border-slate-800/90 px-3.5 py-2 flex items-center gap-3 select-none">
          {/* 三個視窗圓點 */}
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-700/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-slate-700/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-slate-700/80" />
          </div>

          {/* 網址列 */}
          <div className="flex-1 bg-slate-950/80 border border-slate-800/60 rounded px-2.5 py-1 flex items-center gap-2 text-slate-400 text-[11px] font-mono truncate">
            <Globe className="w-3 h-3 text-slate-500 shrink-0" />
            <span className="truncate text-slate-300">{url}</span>
          </div>
        </div>

        {/* 瀏覽器畫面內容 (模擬表單與 Captcha 區域) */}
        <div className="flex-1 p-4 md:p-5 flex flex-col justify-between gap-4 bg-linear-to-b from-[#060c18] to-[#040812] relative">
          {/* 隱約的背景光暈 */}
          <div className="absolute inset-0 bg-cyan-500/2 pointer-events-none" />

          {/* 表單欄位 Skeletons */}
          <div className="space-y-3 relative z-10">
            <div className="w-16 h-2.5 bg-slate-800/80 rounded" />
            <div className="w-full h-9 bg-slate-900/90 border border-slate-800/80 rounded-md shadow-inner" />
            <div className="w-24 h-2.5 bg-slate-800/80 rounded" />
            <div className="w-full h-9 bg-slate-900/90 border border-slate-800/80 rounded-md shadow-inner" />
          </div>

          {/* OCR / 驗證碼識別提示框 (Mockup 的虛線方框亮點) */}
          <div className="relative z-10 mt-auto border border-dashed border-cyan-500/40 bg-cyan-950/20 rounded-lg p-5 flex items-center justify-center text-center min-h-[96px] transition-all duration-300 hover:border-cyan-500/60 shadow-[inset_0_0_15px_rgba(6,182,212,0.05)]">
            <p className="text-cyan-300/90 font-mono text-sm tracking-wider font-medium whitespace-pre-line animate-pulse">
              {stepText}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
