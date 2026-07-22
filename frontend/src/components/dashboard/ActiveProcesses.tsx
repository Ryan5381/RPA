import { useState, useEffect } from "react";
import { Terminal } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AllProcessesModal } from "./AllProcessesModal";
import { ICON_MAP } from "../../lib/icons";
import { useQueueTasks } from "@/hooks/useQueueTasks";
import type { QueueTask, Process } from "@/types/type";

const mapQueueTasksToProcesses = (tasks: QueueTask[]): Process[] => {
  if (!tasks || tasks.length === 0) return [];
  return tasks.map((t, idx) => {
    const isRunning = t.status === "RUNNING";
    const isSuccess = t.status === "SUCCESS";
    const isFailed = t.status === "FAILED";

    return {
      id: t.id || idx + 1,
      title: t.name || "自動化 RPA 任務",
      iconType: t.iconType || "terminal",
      category: "自動化流程",
      account: String(t.config?.account || "預設聯絡人"),
      status: isRunning ? "RUNNING" : isSuccess ? "SUCCESS" : isFailed ? "FAILED" : "QUEUED",
      progress: isSuccess ? 100 : isFailed ? 100 : isRunning ? 65 : 10,
      stepLabel: isSuccess
        ? "任務已順利執行完成"
        : isFailed
        ? "任務執行遭遇異常或中斷"
        : isRunning
        ? "步驟 2/4: 自動化腳本與瀏覽器互動中..."
        : `排程等待: ${t.scheduledAt || "排隊派發中"}`,
      details: [
        { label: "Target", value: String(t.config?.target || t.name) },
        { label: "Priority", value: t.priority || "MED" },
        { label: "Scheduled", value: String(t.scheduledAt || "立即執行") },
      ],
      footerLabel: isSuccess || isFailed ? "Result" : "Status",
      footerValue: isSuccess
        ? "Completed Successfully"
        : isFailed
        ? "Execution Error"
        : isRunning
        ? "Bot Active in Browser..."
        : "Queued in Scheduler",
      footerType: isSuccess ? "success" : isFailed ? "error" : isRunning ? "running" : "waiting",
      logs: [
        `[系統] 載入任務 ID ${t.id} 資訊成功`,
        `[設定] 目標: ${t.config?.target || t.name}, 優先順位: ${t.priority}`,
        `[狀態] 目前執行狀態為: ${t.status}`,
      ],
    };
  });
};

export const ActiveProcesses = () => {
  const { tasks } = useQueueTasks();
  const [processes, setProcesses] = useState<Process[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 當 Supabase 任務清單更新時，轉換並同步至 processes
  useEffect(() => {
    setProcesses(mapQueueTasksToProcesses(tasks));
  }, [tasks]);

  // 模擬 RUNNING 狀態任務的即時進度流動效果
  useEffect(() => {
    const timer = setInterval(() => {
      setProcesses((prev) =>
        prev.map((proc) => {
          if (proc.status === "RUNNING") {
            const nextProgress = proc.progress >= 90 ? 60 : proc.progress + 5;
            const steps = [
              "步驟 1/4: 填寫預約表單與聯絡人資料...",
              "步驟 2/4: 識別圖形驗證碼與安全校驗 (OCR)",
              "步驟 3/4: 驗證碼校對與防阻擋策略 (CNN 模型)",
              "步驟 4/4: 送出預約請求與等待伺服器回應...",
            ];
            const stepIdx = Math.floor((nextProgress - 60) / 8) % steps.length;
            return {
              ...proc,
              progress: nextProgress,
              stepLabel: steps[stepIdx] || proc.stepLabel,
              footerValue:
                nextProgress > 80
                  ? "Submitting Request..."
                  : "Solving Captcha...",
            };
          }
          return proc;
        }),
      );
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full">
      {/* 區塊標頭 */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-200 tracking-wider flex items-center gap-2">
          執行中任務{" "}
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400 font-normal">
            Active Processes
          </span>
        </h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="text-xs text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 font-mono tracking-wider transition-colors flex items-center gap-1 cursor-pointer font-semibold"
        >
          檢視全部 VIEW ALL ({processes.length})
        </button>
      </div>

      {/* 卡片網格 (儀表板首頁只顯示前 3 個首要任務，無任務時顯示提示) */}
      {processes.length === 0 ? (
        <div className="bg-card/90 dark:bg-background/40 rounded-xl p-8 border border-dashed border-slate-300 dark:border-slate-800 text-center text-slate-500 dark:text-slate-400 font-mono text-sm">
          目前序列中無任務，請至左側工作流或「新任務」建立並執行 RPA 自動化腳本。
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {processes.slice(0, 3).map((proc) => {
            const Icon = ICON_MAP[proc.iconType] || Terminal;
          return (
            <div
              key={proc.id}
              className={`bg-card/90 dark:bg-background/40 rounded-xl p-5 border flex flex-col justify-between shadow-sm dark:shadow-none ${
                proc.status === "RUNNING"
                  ? "border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.1)] hover:border-cyan-500/80"
                  : proc.status === "SUCCESS"
                    ? "border-emerald-500/30 hover:border-emerald-500/50"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
              }`}
            >
              <div>
                {/* 卡片標頭 */}
                <div className="flex justify-between items-center mb-5">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-2 rounded-lg ${
                        proc.status === "RUNNING"
                          ? "bg-cyan-100 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400"
                          : proc.status === "SUCCESS"
                            ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                            : "bg-slate-100 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-slate-900 dark:text-slate-200 text-sm tracking-wide">
                      {proc.title}
                    </span>
                  </div>

                  {/* 狀態標籤 (使用 shadcn Badge) */}
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${
                      proc.status === "RUNNING"
                        ? "bg-cyan-100 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-400 border-cyan-400/60 dark:border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.2)]"
                        : proc.status === "SUCCESS"
                          ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border-emerald-400/60 dark:border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                          : "bg-slate-100 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700/60"
                    }`}
                  >
                    {proc.status === "RUNNING" && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400 animate-ping" />
                    )}
                    {proc.status}
                  </Badge>
                </div>

                {/* 卡片主體資訊 */}
                <div className="space-y-2.5 mb-4">
                  {proc.details.map((detail, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between text-xs font-mono"
                    >
                      <span className="text-slate-500 dark:text-slate-400">{detail.label}:</span>
                      <span className="text-slate-900 dark:text-slate-200 font-semibold">
                        {detail.value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* 任務進度與步驟條 (使用 shadcn Progress) */}
                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800/60 space-y-2">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5 truncate pr-2 font-medium">
                      {proc.status === "RUNNING" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400 animate-ping inline-block shrink-0" />
                      )}
                      <span className="truncate">{proc.stepLabel}</span>
                    </span>
                    <span
                      className={`font-bold tabular-nums shrink-0 ${
                        proc.status === "RUNNING"
                          ? "text-cyan-600 dark:text-cyan-400"
                          : proc.status === "SUCCESS"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {proc.progress}%
                    </span>
                  </div>
                  <Progress
                    value={proc.progress}
                    className="w-full"
                    trackClassName="h-1.5 bg-slate-200 dark:bg-slate-900 border border-slate-300/80 dark:border-slate-800/80"
                    indicatorClassName={`transition-all duration-500 ${
                      proc.status === "RUNNING"
                        ? "bg-gradient-to-r from-cyan-500 to-blue-500 dark:from-cyan-500 dark:to-blue-400 shadow-[0_0_10px_rgba(6,182,212,0.6)]"
                        : proc.status === "SUCCESS"
                          ? "bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                          : "bg-slate-400 dark:bg-slate-700"
                    }`}
                  />
                </div>
              </div>

              <div>
                {/* 分隔線 */}
                <div className="border-t border-dashed border-slate-200 dark:border-slate-800/80 my-4" />

                {/* 卡片尾部狀態 */}
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-500 dark:text-slate-400">{proc.footerLabel}:</span>
                  <span
                    className={`font-semibold ${
                      proc.footerType === "running"
                        ? "text-cyan-600 dark:text-cyan-400 animate-pulse"
                        : proc.footerType === "success"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {proc.footerValue}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* 檢視全部排程的 Modal 彈跳視窗 */}
      <AllProcessesModal
        isOpen={isModalOpen}
        onClose={setIsModalOpen}
        processes={processes}
      />
    </div>
  );
};
