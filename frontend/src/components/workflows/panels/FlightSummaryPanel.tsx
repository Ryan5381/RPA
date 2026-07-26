import React, { useState } from "react";
import { Zap, Clock3, Bell, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { POPULAR_AIRPORTS } from "../forms/FlightForm";

interface FlightSummaryPanelProps {
  flightForm?: {
    origin?: string;
    destination?: string;
    date_from?: string;
    date_to?: string;
    budget?: string;
    cabin?: string;
    direct_only?: boolean;
    trip_type?: string;
    platform?: string;
  };
  handleLaunchTask: (options?: { priority?: string; scheduledAt?: string }) => void;
  isLaunching: boolean;
}

export const FlightSummaryPanel: React.FC<FlightSummaryPanelProps> = ({
  flightForm,
  handleLaunchTask,
  isLaunching,
}) => {
  const [isScheduledMode, setIsScheduledMode] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(flightForm?.date_from || new Date().toISOString().split("T")[0]);
  const [scheduledTime, setScheduledTime] = useState("09:00:00");
  const [priority, setPriority] = useState<"HIGH" | "MED" | "LOW">("MED");

  const onSubmit = () => {
    if (isScheduledMode) {
      handleLaunchTask({ priority, scheduledAt: `${scheduledDate} ${scheduledTime}` });
    } else {
      handleLaunchTask({ priority });
    }
  };

  const cabinLabel = flightForm?.cabin === "business" ? "商務艙" : "經濟艙";
  const originName = POPULAR_AIRPORTS.find((a) => a.code === flightForm?.origin)?.name || flightForm?.origin || "???";
  const destName = POPULAR_AIRPORTS.find((a) => a.code === flightForm?.destination)?.name || flightForm?.destination || "???";
  const isReady = !!flightForm?.origin && !!flightForm?.destination && !!flightForm?.date_from;

  return (
    <div className="bg-card/90 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-xl p-6 backdrop-blur-xl flex flex-col h-full justify-between shadow-sm dark:shadow-none">
      <div>
        {/* 標頭 */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200 tracking-wider flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 dark:bg-sky-400 shrink-0" />
            機票搜尋摘要
          </h3>
          <Badge
            variant="outline"
            className="text-[10px] font-mono bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-400 border-sky-400/60 dark:border-sky-500/40 px-2"
          >
            PRICE WATCHER
          </Badge>
        </div>

        {/* 搜尋條件摘要 */}
        <div className="space-y-3 mb-4">
          <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-lg p-4 space-y-3 font-mono text-xs">
            {/* 航線顯示 */}
            <div className="flex items-center justify-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-800/60 text-center">
              <span className="text-sky-600 dark:text-sky-400 font-bold truncate max-w-[110px]">{originName}</span>
              <Plane className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-sky-600 dark:text-sky-400 font-bold truncate max-w-[110px]">{destName}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800/60">
              <span className="text-slate-500 dark:text-slate-400">票種</span>
              <span className="text-slate-900 dark:text-slate-200 font-bold">
                {flightForm?.trip_type === "round_trip" ? "🔁 來回" : "✈️ 單程"}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800/60">
              <span className="text-slate-500 dark:text-slate-400">搜尋日期區間</span>
              <span className="text-cyan-600 dark:text-cyan-400 font-bold">
                {flightForm?.date_from || "?"} ~ {flightForm?.date_to || "?"}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800/60">
              <span className="text-slate-500 dark:text-slate-400">預算上限</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                NT$ {flightForm?.budget ? Number(flightForm.budget).toLocaleString() : "未設定"}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800/60">
              <span className="text-slate-500 dark:text-slate-400">艙等</span>
              <span className="text-slate-900 dark:text-slate-200">{cabinLabel}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">直飛限定</span>
              <span className={`font-bold ${flightForm?.direct_only ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`}>
                {flightForm?.direct_only ? "✅ 是" : "⛔ 否（含轉機）"}
              </span>
            </div>
          </div>

          <div className="bg-sky-50 dark:bg-sky-950/20 border border-sky-300 dark:border-sky-800/30 rounded-lg p-3 text-[11px] text-sky-700 dark:text-sky-300 font-mono space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-sky-800 dark:text-sky-200">
              <Bell className="w-3.5 h-3.5" />
              LINE 低價通知已啟用
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[10px]">
              找到低於預算的機票時，將立即透過 LINE 推播通知您，您可自行點擊連結前往購票，不自動下單。
            </p>
          </div>
        </div>

        {/* 執行模式 */}
        <div className="bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Clock3 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              排程觸發模式
            </span>
            <div className="flex bg-slate-200 dark:bg-slate-900 rounded p-0.5 border border-slate-300 dark:border-slate-800">
              <button type="button" onClick={() => setIsScheduledMode(false)} className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all cursor-pointer ${!isScheduledMode ? "bg-sky-600 text-white font-bold shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"}`}>
                立即執行
              </button>
              <button type="button" onClick={() => setIsScheduledMode(true)} className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all cursor-pointer ${isScheduledMode ? "bg-sky-600 text-white font-bold shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"}`}>
                ⏰ 定時排程掃描
              </button>
            </div>
          </div>

          {isScheduledMode && (
            <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800/80">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block mb-1">啟動日期</label>
                  <Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="h-8 text-xs font-mono bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700" />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block mb-1">啟動時間</label>
                  <Input type="text" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} placeholder="09:00:00" className="h-8 text-xs font-mono bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block mb-1">優先序列順位</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["HIGH", "MED", "LOW"] as const).map((prio) => (
                    <button key={prio} type="button" onClick={() => setPriority(prio)}
                      className={`py-1 rounded text-[11px] font-mono font-bold border transition-all cursor-pointer ${priority === prio ? prio === "HIGH" ? "bg-red-500 text-white border-red-600 shadow-sm" : prio === "MED" ? "bg-amber-500 text-white border-amber-600 shadow-sm" : "bg-emerald-500 text-white border-emerald-600 shadow-sm" : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:border-slate-400"}`}>
                      {prio === "HIGH" ? "🔴 高優先" : prio === "MED" ? "🟡 中優先" : "🟢 低優先"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {!isReady && (
          <div className="mt-3 bg-red-50 dark:bg-red-950/20 border border-red-300 dark:border-red-800/30 rounded-lg p-3 text-[11px] text-red-600 dark:text-red-400 font-mono">
            ⚠ 請填寫：出發/目的地機場、最早出發日
          </div>
        )}
      </div>

      {/* 啟動按鈕 */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800/60 mt-4">
        <Button onClick={onSubmit} disabled={isLaunching || !isReady}
          className="w-full h-11 text-white font-bold text-sm tracking-wider border-0 cursor-pointer transition-all duration-200 gap-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 shadow-[0_0_20px_rgba(14,165,233,0.2)]">
          {isScheduledMode ? (
            <><Clock3 className="w-4 h-4" />排程機票價格監控 ({scheduledTime} 啟動)</>
          ) : (
            <><Zap className="w-4 h-4" />{isLaunching ? "正在掃描機票價格..." : "立即搜尋低價機票"}</>
          )}
        </Button>
        <p className="text-[10px] font-mono text-slate-500 dark:text-slate-600 text-center mt-2">
          {isScheduledMode ? "定時自動掃描，低於預算時 LINE 通知您" : "掃描完成後若低於預算，會立即發送 LINE 通知"}
        </p>
      </div>
    </div>
  );
};
