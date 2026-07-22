import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Plus, Trash2, CalendarDays, Clock, Zap, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ORDER_LABELS, MAX_PREFERENCES } from "@/lib/workflowHelpers";

interface PrioritySelectorPanelProps {
  preferences: any[];
  addPreference: () => void;
  removePreference: (id: string) => void;
  updatePreference: (id: string, field: any, value: string) => void;
  isAtMax: boolean;
  handleLaunchTask: (options?: { priority?: string; scheduledAt?: string }) => void;
  isLaunching: boolean;
}

export const PrioritySelectorPanel: React.FC<PrioritySelectorPanelProps> = ({
  preferences,
  addPreference,
  removePreference,
  updatePreference,
  isAtMax,
  handleLaunchTask,
  isLaunching,
}) => {
  const [isScheduledMode, setIsScheduledMode] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split("T")[0]);
  const [scheduledTime, setScheduledTime] = useState("11:59:50");
  const [priority, setPriority] = useState<"HIGH" | "MED" | "LOW">("HIGH");

  const onSubmit = () => {
    if (isScheduledMode) {
      handleLaunchTask({
        priority,
        scheduledAt: `${scheduledDate} ${scheduledTime}`,
      });
    } else {
      handleLaunchTask({ priority });
    }
  };

  return (
    <div className="bg-card/90 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-xl p-6 backdrop-blur-xl flex flex-col h-full justify-between shadow-sm dark:shadow-none">
      <div>
        {/* 標頭 */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200 tracking-wider flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 shrink-0" />
            預約偏好順位與排程
          </h3>
          <Badge
            variant="outline"
            className="text-[10px] font-mono bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border-indigo-400/60 dark:border-indigo-500/40 px-2"
          >
            MULTI-PREF SCHEDULER
          </Badge>
        </div>

        {/* 多順位自動候選說明 */}
        <div className="bg-slate-100 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/60 rounded-lg p-3 mb-4 text-[11px] text-slate-600 dark:text-slate-400 font-mono space-y-1">
          <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-300 font-bold">
            💡 多順位自動候補接力
          </div>
          <p className="text-[10px] leading-relaxed text-slate-600 dark:text-slate-500">
            首選車次/時段若額滿或客滿，AI 腳本立刻依序比對備份時段，確保搶到理想車票。
          </p>
        </div>

        {/* 順位卡片列表 */}
        <div className="space-y-3 mb-5 max-h-[220px] overflow-y-auto pr-1">
          {preferences.map((pref, index) => (
            <div
              key={pref.id}
              className="group flex items-center gap-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-300 dark:border-slate-800/60 hover:border-slate-400 dark:hover:border-slate-700/80 rounded-lg p-3 transition-all duration-200"
            >
              {/* 順位標籤 */}
              <div className="shrink-0 text-center min-w-[48px]">
                <div className="text-[9px] font-mono text-slate-500 dark:text-slate-500 uppercase tracking-widest">
                  {ORDER_LABELS[index] ?? `第${index + 1}順位`}
                </div>
                <div
                  className={`text-xs font-bold mt-0.5 ${
                    index === 0
                      ? "text-cyan-600 dark:text-cyan-400"
                      : index === 1
                        ? "text-indigo-600 dark:text-indigo-400"
                        : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  #{String(index + 1).padStart(2, "0")}
                </div>
              </div>

              {/* 分隔線 */}
              <div className="w-px h-8 bg-slate-200 dark:bg-slate-800/80 shrink-0" />

              {/* 日期時間輸入 */}
              <div className="flex-1 flex gap-2 min-w-0">
                <div className="flex items-center gap-1.5 flex-1 min-w-0 bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700/60 rounded-md px-2.5 h-8 focus-within:border-cyan-500/50 transition-colors">
                  <CalendarDays className="w-3 h-3 text-slate-500 shrink-0" />
                  <DatePicker
                    selected={(() => {
                      if (!pref.date) return null;
                      const d = new Date(pref.date.replace(/-/g, "/"));
                      return isNaN(d.getTime()) ? null : d;
                    })()}
                    onChange={(date: Date | null) => {
                      if (date) {
                        const yyyy = date.getFullYear();
                        const mm = String(date.getMonth() + 1).padStart(2, "0");
                        const dd = String(date.getDate()).padStart(2, "0");
                        updatePreference(
                          pref.id,
                          "date",
                          `${yyyy}-${mm}-${dd}`,
                        );
                      } else {
                        updatePreference(pref.id, "date", "");
                      }
                    }}
                    dateFormat="yyyy-MM-dd"
                    wrapperClassName="w-full block"
                    className="bg-transparent text-xs text-slate-900 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none w-full font-mono cursor-pointer"
                    placeholderText="點選日期"
                  />
                </div>
                <div className="flex items-center gap-1.5 w-24 bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700/60 rounded-md px-2.5 h-8 focus-within:border-cyan-500/50 transition-colors shrink-0">
                  <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                  <DatePicker
                    selected={(() => {
                      if (!pref.time) return null;
                      const [hh, mm] = pref.time.split(":");
                      const d = new Date();
                      d.setHours(Number(hh) || 0, Number(mm) || 0, 0, 0);
                      return d;
                    })()}
                    onChange={(date: Date | null) => {
                      if (date) {
                        const hh = String(date.getHours()).padStart(2, "0");
                        const mm = String(date.getMinutes()).padStart(2, "0");
                        updatePreference(pref.id, "time", `${hh}:${mm}`);
                      } else {
                        updatePreference(pref.id, "time", "");
                      }
                    }}
                    showTimeSelect
                    showTimeSelectOnly
                    timeIntervals={30}
                    timeFormat="HH:mm"
                    dateFormat="HH:mm"
                    wrapperClassName="w-full block"
                    className="bg-transparent text-xs text-slate-900 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none w-full font-mono cursor-pointer"
                    placeholderText="時段"
                  />
                </div>
              </div>

              {/* 刪除按鈕 */}
              <button
                onClick={() => removePreference(pref.id)}
                className="shrink-0 p-1.5 rounded-md text-slate-500 dark:text-slate-600 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/30 transition-all duration-200 opacity-0 group-hover:opacity-100 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {/* 新增偏好按鈕 */}
          {!isAtMax && (
            <button
              onClick={addPreference}
              className="w-full h-10 border border-dashed border-slate-300 dark:border-slate-700/60 hover:border-cyan-500/40 hover:bg-cyan-50 dark:hover:bg-cyan-950/10 rounded-lg flex items-center justify-center gap-2 text-xs font-mono text-slate-600 dark:text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 transition-all duration-200 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              新增偏好時段
            </button>
          )}

          {/* 已達上限提示 */}
          {isAtMax && (
            <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono text-amber-600 dark:text-amber-500/70 py-1">
              <span className="w-1 h-1 rounded-full bg-amber-500/70" />
              已達順位上限 ({MAX_PREFERENCES}/{MAX_PREFERENCES})
            </div>
          )}
        </div>

        {/* ── 執行模式設定：立即 vs 定時排程 ── */}
        <div className="bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Clock3 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              排程觸發模式
            </span>
            <div className="flex bg-slate-200 dark:bg-slate-900 rounded p-0.5 border border-slate-300 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsScheduledMode(false)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all cursor-pointer ${
                  !isScheduledMode
                    ? "bg-indigo-600 text-white font-bold shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                立即執行
              </button>
              <button
                type="button"
                onClick={() => setIsScheduledMode(true)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all cursor-pointer ${
                  isScheduledMode
                    ? "bg-indigo-600 text-white font-bold shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                ⏰ 定時預約排程
              </button>
            </div>
          </div>

          {isScheduledMode && (
            <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800/80">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block mb-1">
                    啟動日期
                  </label>
                  <Input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="h-8 text-xs font-mono bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block mb-1">
                    啟動時間（秒）
                  </label>
                  <Input
                    type="text"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    placeholder="11:59:50"
                    className="h-8 text-xs font-mono bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block mb-1">
                  優先序列順位
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["HIGH", "MED", "LOW"] as const).map((prio) => (
                    <button
                      key={prio}
                      type="button"
                      onClick={() => setPriority(prio)}
                      className={`py-1 rounded text-[11px] font-mono font-bold border transition-all cursor-pointer ${
                        priority === prio
                          ? prio === "HIGH"
                            ? "bg-red-500 text-white border-red-600 shadow-sm"
                            : prio === "MED"
                            ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                            : "bg-emerald-500 text-white border-emerald-600 shadow-sm"
                          : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:border-slate-400"
                      }`}
                    >
                      {prio === "HIGH" ? "🔴 高優先" : prio === "MED" ? "🟡 中優先" : "🟢 低優先"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 啟動/排程按鈕 */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800/60 mt-4">
        <Button
          onClick={onSubmit}
          disabled={isLaunching}
          className={`w-full h-11 text-white font-bold text-sm tracking-wider border-0 cursor-pointer transition-all duration-200 gap-2 ${
            isScheduledMode
              ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.25)]"
              : "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-[0_0_20px_rgba(6,182,212,0.2)]"
          }`}
        >
          {isScheduledMode ? (
            <>
              <Clock3 className="w-4 h-4" />
              加入優先排程序列 (預約 {scheduledTime} 啟動)
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              {isLaunching ? "正在啟動中..." : "立即發動自動化任務"}
            </>
          )}
        </Button>
        <p className="text-[10px] font-mono text-slate-500 dark:text-slate-600 text-center mt-2">
          {isScheduledMode
            ? "排程成功後可至左側「優先序列」頁面隨時調整時間與順位"
            : "任務將依偏好順位依序嘗試，直到成功為止"}
        </p>
      </div>
    </div>
  );
};
