import React, { useState } from "react";
import { Zap, Clock3, Hospital } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface HospitalSummaryPanelProps {
  hospitalForm?: {
    hospital?: string;
    department?: string;
    targetDate?: string;
    patientType?: string;
    userName?: string;
    user_id?: string;
    doctorName?: string;
  };
  handleLaunchTask: (options?: { priority?: string; scheduledAt?: string }) => void;
  isLaunching: boolean;
}

const HOSPITAL_NAMES: Record<string, string> = {
  NTUH: "台大醫院",
  CGMH_LINKOU: "長庚醫院(林口)",
  CGMH_TAIPEI: "長庚醫院(台北)",
};

export const HospitalSummaryPanel: React.FC<HospitalSummaryPanelProps> = ({
  hospitalForm,
  handleLaunchTask,
  isLaunching,
}) => {
  const [isScheduledMode, setIsScheduledMode] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split("T")[0]);
  const [scheduledTime, setScheduledTime] = useState("07:59:50");
  const [priority, setPriority] = useState<"HIGH" | "MED" | "LOW">("HIGH");

  const onSubmit = () => {
    if (isScheduledMode) {
      handleLaunchTask({ priority, scheduledAt: `${scheduledDate} ${scheduledTime}` });
    } else {
      handleLaunchTask({ priority });
    }
  };

  const hospitalName = hospitalForm?.hospital
    ? HOSPITAL_NAMES[hospitalForm.hospital] || hospitalForm.hospital
    : "未選擇";

  return (
    <div className="bg-card/90 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-xl p-6 backdrop-blur-xl flex flex-col h-full justify-between shadow-sm dark:shadow-none">
      <div>
        {/* 標頭 */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200 tracking-wider flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 shrink-0" />
            掛號任務摘要
          </h3>
          <Badge
            variant="outline"
            className="text-[10px] font-mono bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-400/60 dark:border-emerald-500/40 px-2"
          >
            HOSPITAL BOOKING
          </Badge>
        </div>

        {/* 掛號資訊摘要 */}
        <div className="space-y-3 mb-4">
          <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-lg p-4 space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800/60">
              <span className="text-slate-500 dark:text-slate-400">掛號醫院</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">{hospitalName}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800/60">
              <span className="text-slate-500 dark:text-slate-400">看診科別</span>
              <span className="text-slate-900 dark:text-slate-200 font-bold">
                {hospitalForm?.department || "未選擇"}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800/60">
              <span className="text-slate-500 dark:text-slate-400">預約看診日</span>
              <span className="text-cyan-600 dark:text-cyan-400 font-bold">
                {hospitalForm?.targetDate || "未填寫"}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800/60">
              <span className="text-slate-500 dark:text-slate-400">指定醫師</span>
              <span className="text-slate-900 dark:text-slate-200">
                {hospitalForm?.doctorName || "不指定"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">就診身分</span>
              <span className="text-slate-900 dark:text-slate-200">
                {hospitalForm?.patientType === "first_time" ? "初診預約" : "複診掛號"}
              </span>
            </div>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-800/30 rounded-lg p-3 text-[11px] text-emerald-700 dark:text-emerald-300 font-mono space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-200">
              🏥 智能名額監控啟動
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[10px]">
              系統將自動偵測開放掛號時機，依設定的日期與科別搶佔名額，無需人工守候。
            </p>
          </div>
        </div>

        {/* 執行模式 */}
        <div className="bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Clock3 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              排程觸發模式
            </span>
            <div className="flex bg-slate-200 dark:bg-slate-900 rounded p-0.5 border border-slate-300 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsScheduledMode(false)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all cursor-pointer ${
                  !isScheduledMode
                    ? "bg-emerald-600 text-white font-bold shadow-sm"
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
                    ? "bg-emerald-600 text-white font-bold shadow-sm"
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
                  <label className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block mb-1">啟動日期</label>
                  <Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="h-8 text-xs font-mono bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700" />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block mb-1">啟動時間（秒）</label>
                  <Input type="text" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} placeholder="07:59:50" className="h-8 text-xs font-mono bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block mb-1">優先序列順位</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["HIGH", "MED", "LOW"] as const).map((prio) => (
                    <button
                      key={prio}
                      type="button"
                      onClick={() => setPriority(prio)}
                      className={`py-1 rounded text-[11px] font-mono font-bold border transition-all cursor-pointer ${
                        priority === prio
                          ? prio === "HIGH" ? "bg-red-500 text-white border-red-600 shadow-sm"
                            : prio === "MED" ? "bg-amber-500 text-white border-amber-600 shadow-sm"
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

      {/* 啟動按鈕 */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800/60 mt-4">
        <Button
          onClick={onSubmit}
          disabled={isLaunching}
          className={`w-full h-11 text-white font-bold text-sm tracking-wider border-0 cursor-pointer transition-all duration-200 gap-2 ${
            isScheduledMode
              ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-[0_0_20px_rgba(16,185,129,0.25)]"
              : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
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
              {isLaunching ? "正在啟動掛號任務..." : "立即啟動自動掛號"}
            </>
          )}
        </Button>
        <p className="text-[10px] font-mono text-slate-500 dark:text-slate-600 text-center mt-2">
          {isScheduledMode
            ? "排程成功後可至「優先序列」頁面隨時調整"
            : "依照填寫的科別與日期自動搶佔看診名額"}
        </p>
      </div>
    </div>
  );
};
