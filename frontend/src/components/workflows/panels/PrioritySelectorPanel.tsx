import React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Plus, Trash2, CalendarDays, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ORDER_LABELS, MAX_PREFERENCES } from "@/lib/workflowHelpers";

interface PrioritySelectorPanelProps {
  preferences: any[];
  addPreference: () => void;
  removePreference: (id: string) => void;
  updatePreference: (id: string, field: any, value: string) => void;
  isAtMax: boolean;
  handleLaunchTask: () => void;
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
  return (
    <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-6 backdrop-blur-xl flex flex-col h-full justify-between">
      <div>
        {/* 標頭 */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-bold text-slate-200 tracking-wider flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
            預約偏好順位
          </h3>
        </div>

        {/* 多順位自動候選說明 */}
        <div className="bg-slate-950/40 border border-slate-800/60 rounded-lg p-3 mb-4 text-[11px] text-slate-400 font-mono space-y-1">
          <div className="flex items-center gap-1.5 text-indigo-300 font-bold">
            💡 多順位自動候補接力
          </div>
          <p className="text-[10px] leading-relaxed text-slate-500">
            首選車次/時段若額滿或客滿，AI
            腳本立刻依序比對備份時段，確保搶到理想車票。
          </p>
        </div>

        {/* 順位卡片列表 */}
        <div className="space-y-3 mb-5">
          {preferences.map((pref, index) => (
            <div
              key={pref.id}
              className="group flex items-center gap-3 bg-slate-950/40 border border-slate-800/60 hover:border-slate-700/80 rounded-lg p-3.5 transition-all duration-200"
            >
              {/* 順位標籤 */}
              <div className="shrink-0 text-center min-w-[52px]">
                <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                  {ORDER_LABELS[index] ?? `第${index + 1}順位`}
                </div>
                <div
                  className={`text-xs font-bold mt-0.5 ${
                    index === 0
                      ? "text-cyan-400"
                      : index === 1
                        ? "text-indigo-400"
                        : "text-slate-400"
                  }`}
                >
                  #{String(index + 1).padStart(2, "0")}
                </div>
              </div>

              {/* 分隔線 */}
              <div className="w-px h-8 bg-slate-800/80 shrink-0" />

              {/* 日期時間輸入 */}
              <div className="flex-1 flex gap-2 min-w-0">
                <div className="flex items-center gap-1.5 flex-1 min-w-0 bg-slate-900/50 border border-slate-700/60 rounded-md px-2.5 h-8 focus-within:border-cyan-500/50 transition-colors">
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
                    className="bg-transparent text-xs text-slate-300 placeholder:text-slate-600 outline-none w-full font-mono cursor-pointer"
                    placeholderText="點選日期"
                  />
                </div>
                <div className="flex items-center gap-1.5 w-24 bg-slate-900/50 border border-slate-700/60 rounded-md px-2.5 h-8 focus-within:border-cyan-500/50 transition-colors shrink-0">
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
                    className="bg-transparent text-xs text-slate-300 placeholder:text-slate-600 outline-none w-full font-mono cursor-pointer"
                    placeholderText="時段"
                  />
                </div>
              </div>

              {/* 刪除按鈕 */}
              <button
                onClick={() => removePreference(pref.id)}
                className="shrink-0 p-1.5 rounded-md text-slate-600 hover:text-rose-400 hover:bg-rose-950/30 transition-all duration-200 opacity-0 group-hover:opacity-100 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {/* 新增偏好按鈕 */}
          {!isAtMax && (
            <button
              onClick={addPreference}
              className="w-full h-11 border border-dashed border-slate-700/60 hover:border-cyan-500/40 hover:bg-cyan-950/10 rounded-lg flex items-center justify-center gap-2 text-xs font-mono text-slate-500 hover:text-cyan-400 transition-all duration-200 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              新增偏好時段
            </button>
          )}

          {/* 已達上限提示 */}
          {isAtMax && (
            <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono text-amber-500/70 py-2">
              <span className="w-1 h-1 rounded-full bg-amber-500/70" />
              已達順位上限 ({MAX_PREFERENCES}/{MAX_PREFERENCES})
            </div>
          )}
        </div>
      </div>

      {/* 啟動按鈕 */}
      <div className="pt-4 border-t border-slate-800/60">
        <Button
          onClick={handleLaunchTask}
          disabled={isLaunching}
          className="w-full h-11 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold text-sm tracking-wider border-0 cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.2)] hover:shadow-[0_0_30px_rgba(6,182,212,0.35)] transition-all duration-300 gap-2"
        >
          <Zap className="w-4 h-4" />
          {isLaunching ? "正在啟動中..." : "啟動自動化任務"}
        </Button>
        <p className="text-[10px] font-mono text-slate-600 text-center mt-2">
          任務將依偏好順位依序嘗試，直到成功為止
        </p>
      </div>
    </div>
  );
};
