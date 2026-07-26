import React, { useState } from "react";
import { Zap, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface TixCraftSummaryPanelProps {
  tixCraftForm?: {
    activity_url?: string;
    target_date?: string;
    target_area?: string;
    ticket_count?: string;
  };
  handleLaunchTask: (options?: { priority?: string; scheduledAt?: string }) => void;
  isLaunching: boolean;
}

export const TixCraftSummaryPanel: React.FC<TixCraftSummaryPanelProps> = ({
  tixCraftForm,
  handleLaunchTask,
  isLaunching,
}) => {
  const [isScheduledMode, setIsScheduledMode] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split("T")[0]);
  const [scheduledTime, setScheduledTime] = useState("11:59:50");
  const [priority, setPriority] = useState<"HIGH" | "MED" | "LOW">("HIGH");

  const onSubmit = () => {
    if (isScheduledMode) {
      handleLaunchTask({ priority, scheduledAt: `${scheduledDate} ${scheduledTime}` });
    } else {
      handleLaunchTask({ priority });
    }
  };

  // 從 URL 提取活動名稱
  const activitySlug = tixCraftForm?.activity_url
    ? tixCraftForm.activity_url.split("/").filter(Boolean).pop() || "未填寫"
    : "未填寫";

  return (
    <div className="bg-card/90 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-xl p-6 backdrop-blur-xl flex flex-col h-full justify-between shadow-sm dark:shadow-none">
      <div>
        {/* 標頭 */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200 tracking-wider flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 dark:bg-rose-400 shrink-0" />
            搶票任務摘要
          </h3>
          <Badge
            variant="outline"
            className="text-[10px] font-mono bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border-rose-400/60 dark:border-rose-500/40 px-2"
          >
            TIXCRAFT SNIPER
          </Badge>
        </div>

        {/* 搶票資訊摘要 */}
        <div className="space-y-3 mb-4">
          <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-lg p-4 space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800/60">
              <span className="text-slate-500 dark:text-slate-400">活動路徑</span>
              <span className="text-rose-600 dark:text-rose-400 font-bold truncate max-w-[160px]">
                {activitySlug}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800/60">
              <span className="text-slate-500 dark:text-slate-400">場次日期</span>
              <span className="text-cyan-600 dark:text-cyan-400 font-bold">
                {tixCraftForm?.target_date || "最快開放場次"}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800/60">
              <span className="text-slate-500 dark:text-slate-400">座位關鍵字</span>
              <span className="text-slate-900 dark:text-slate-200 font-bold">
                {tixCraftForm?.target_area || "未填寫"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">購票張數</span>
              <span className="text-violet-600 dark:text-violet-400 font-bold">
                {tixCraftForm?.ticket_count || "2"} 張
              </span>
            </div>
          </div>

          <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-300 dark:border-rose-800/30 rounded-lg p-3 text-[11px] text-rose-700 dark:text-rose-300 font-mono space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-rose-800 dark:text-rose-200">
              🎫 防封鎖秒殺引擎就緒
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[10px]">
              自動依據場次日期與座位區域關鍵字搶票，內建 OCR 驗證碼辨識與自動同意條款。
            </p>
          </div>
        </div>

        {/* 執行模式 */}
        <div className="bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Clock3 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              排程觸發模式
            </span>
            <div className="flex bg-slate-200 dark:bg-slate-900 rounded p-0.5 border border-slate-300 dark:border-slate-800">
              <button type="button" onClick={() => setIsScheduledMode(false)} className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all cursor-pointer ${!isScheduledMode ? "bg-rose-600 text-white font-bold shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"}`}>
                立即執行
              </button>
              <button type="button" onClick={() => setIsScheduledMode(true)} className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all cursor-pointer ${isScheduledMode ? "bg-rose-600 text-white font-bold shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"}`}>
                ⏰ 定時預約排程
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
                  <label className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block mb-1">啟動時間（秒）</label>
                  <Input type="text" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} placeholder="11:59:50" className="h-8 text-xs font-mono bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700" />
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
      </div>

      {/* 啟動按鈕 */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800/60 mt-4">
        <Button onClick={onSubmit} disabled={isLaunching}
          className={`w-full h-11 text-white font-bold text-sm tracking-wider border-0 cursor-pointer transition-all duration-200 gap-2 ${isScheduledMode ? "bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 shadow-[0_0_20px_rgba(244,63,94,0.25)]" : "bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 shadow-[0_0_20px_rgba(244,63,94,0.2)]"}`}>
          {isScheduledMode ? (
            <><Clock3 className="w-4 h-4" />加入優先排程序列 (預約 {scheduledTime} 啟動)</>
          ) : (
            <><Zap className="w-4 h-4" />{isLaunching ? "正在發動搶票攻擊..." : "立即發動秒殺任務"}</>
          )}
        </Button>
        <p className="text-[10px] font-mono text-slate-500 dark:text-slate-600 text-center mt-2">
          {isScheduledMode ? "排程成功後可至「優先序列」頁面隨時調整" : "系統自動依場次日期與座位關鍵字搶票"}
        </p>
      </div>
    </div>
  );
};
