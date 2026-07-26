import React from "react";
import { Globe, RefreshCw, Wifi, WifiOff, Loader2, MonitorPlay } from "lucide-react";

type PreviewState = "connecting" | "live" | "idle" | "disconnected";

interface LivePreviewCardProps {
  /** task status label shown in badge */
  status?: "RUNNING" | "IDLE" | "PAUSED";
  /** static step text shown in idle/mockup mode */
  stepText?: string;
  /** URL shown in the fake browser address bar */
  url?: string;
  /** real base64 JPEG screenshot from WebSocket */
  imgBase64?: string | null;
  /** WebSocket connection state */
  previewState?: PreviewState;
  onRefresh?: () => void;
}

const StateIcon: React.FC<{ state: PreviewState }> = ({ state }) => {
  switch (state) {
    case "live":
      return <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]" />;
    case "connecting":
      return <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />;
    case "disconnected":
      return <WifiOff className="w-3 h-3 text-rose-400" />;
    default:
      return <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_6px_rgba(6,182,212,0.8)]" />;
  }
};

const StateBadgeText: Record<PreviewState, string> = {
  live: "LIVE",
  connecting: "CONNECTING",
  idle: "IDLE",
  disconnected: "OFFLINE",
};

const StateBadgeColor: Record<PreviewState, string> = {
  live: "text-emerald-400 bg-emerald-950/40 border-emerald-500/30",
  connecting: "text-amber-400 bg-amber-950/40 border-amber-500/30",
  idle: "text-cyan-400 bg-cyan-950/40 border-cyan-500/30",
  disconnected: "text-rose-400 bg-rose-950/40 border-rose-500/30",
};

export const LivePreviewCard: React.FC<LivePreviewCardProps> = ({
  status = "IDLE",
  stepText = "等待指令中...",
  url = "https://rpa.engine/preview",
  imgBase64 = null,
  previewState = "idle",
  onRefresh,
}) => {
  const isLive = previewState === "live" && imgBase64;

  return (
    <div className="w-full bg-[#030712]/90 border border-slate-800/80 rounded-xl p-5 shadow-2xl relative overflow-hidden backdrop-blur-xl flex flex-col h-full">
      {/* ── 卡片頂部標題與狀態 ── */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm md:text-base font-bold text-slate-200 tracking-wider flex items-center gap-2">
          <MonitorPlay className="w-4 h-4 text-cyan-400" />
          瀏覽器即時預覽
        </h3>

        <div className="flex items-center gap-2">
          <span
            className={`flex items-center gap-1.5 text-xs font-mono font-medium px-2.5 py-1 rounded-full border shadow-sm ${StateBadgeColor[previewState]}`}
          >
            <StateIcon state={previewState} />
            {StateBadgeText[previewState]}
          </span>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-1 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              title="重新整理 / 重新連線"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── 瀏覽器模擬框主體 ── */}
      <div className="flex-1 flex flex-col border border-slate-800/90 rounded-lg overflow-hidden bg-[#060d1a]/80 shadow-inner min-h-[200px]">
        {/* 虛擬瀏覽器頂部視窗條 */}
        <div className="bg-slate-900/90 border-b border-slate-800/90 px-3.5 py-2 flex items-center gap-3 select-none shrink-0">
          {/* 三個視窗圓點 */}
          <div className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${isLive ? "bg-emerald-700/80" : "bg-slate-700/80"}`} />
            <span className="w-2.5 h-2.5 rounded-full bg-slate-700/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-slate-700/80" />
          </div>
          {/* 網址列 */}
          <div className="flex-1 bg-slate-950/80 border border-slate-800/60 rounded px-2.5 py-1 flex items-center gap-2 text-slate-400 text-[11px] font-mono truncate">
            <Globe className="w-3 h-3 text-slate-500 shrink-0" />
            <span className="truncate text-slate-300">{url}</span>
          </div>
        </div>

        {/* ── 瀏覽器內容區：live 模式顯示截圖，否則顯示 Mockup ── */}
        <div className="flex-1 relative overflow-hidden">
          {isLive ? (
            /* 真實截圖 */
            <img
              src={`data:image/jpeg;base64,${imgBase64}`}
              alt="Browser live preview"
              className="w-full h-full object-cover object-top"
              style={{ imageRendering: "crisp-edges" }}
            />
          ) : (
            /* 靜態 Mockup */
            <div className="flex-1 p-4 md:p-5 flex flex-col justify-between gap-4 bg-linear-to-b from-[#060c18] to-[#040812] h-full">
              {/* 表單 Skeleton */}
              <div className="space-y-3">
                <div className="w-16 h-2.5 bg-slate-800/80 rounded" />
                <div className="w-full h-9 bg-slate-900/90 border border-slate-800/80 rounded-md" />
                <div className="w-24 h-2.5 bg-slate-800/80 rounded" />
                <div className="w-full h-9 bg-slate-900/90 border border-slate-800/80 rounded-md" />
              </div>

              {/* 狀態提示框 */}
              <div className="mt-auto border border-dashed border-cyan-500/40 bg-cyan-950/20 rounded-lg p-5 flex items-center justify-center text-center min-h-[80px] transition-all duration-300">
                {previewState === "connecting" ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                    <p className="text-amber-300/90 font-mono text-xs tracking-wider">正在連接截圖串流...</p>
                  </div>
                ) : previewState === "disconnected" ? (
                  <div className="flex flex-col items-center gap-2">
                    <WifiOff className="w-5 h-5 text-rose-400" />
                    <p className="text-rose-300/90 font-mono text-xs tracking-wider">截圖串流已中斷</p>
                    <p className="text-slate-500 text-xs">請點擊右上角重新整理</p>
                  </div>
                ) : (
                  <p className="text-cyan-300/90 font-mono text-sm tracking-wider font-medium whitespace-pre-line animate-pulse">
                    {stepText}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Live 模式覆蓋層：左下角顯示小圖示 */}
          {isLive && (
            <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-emerald-400 font-mono font-medium">LIVE</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
