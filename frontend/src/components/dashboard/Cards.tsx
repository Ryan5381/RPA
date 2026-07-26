import { useState, useEffect } from "react";
import {
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
} from "lucide-react";
import { useQueueTasks } from "@/hooks/useQueueTasks";

const API_BASE = "http://localhost:8000";

export const Cards = () => {
  const { tasks } = useQueueTasks();
  const [lineActive, setLineActive] = useState<boolean | null>(null);

  const totalCount = tasks.length;
  const successCount = tasks.filter((t) => t.status === "SUCCESS").length;
  const failCount = tasks.filter((t) => t.status === "FAILED").length;
  const runningCount = tasks.filter((t) => t.status === "RUNNING" || t.status === "QUEUED").length;

  // 檢查 LINE 通知是否已設定（使用後端 active 欄位）
  useEffect(() => {
    fetch(`${API_BASE}/api/settings/line`)
      .then((r) => r.json())
      .then((d) => {
        // 後端回傳 active: true 代表 Token + User ID 均已設定
        setLineActive(d.active === true);
      })
      .catch(() => setLineActive(false));
  }, []);

  const lineLabel = lineActive === null ? "檢查中..." : lineActive ? "Active" : "Inactive";

  const card = [
    { key: "total",   label: "總任務數",    value: totalCount,   icon: "total" },
    { key: "success", label: "執行成功",    value: successCount, icon: "success" },
    { key: "fail",    label: "執行失敗",    value: failCount,    icon: "fail" },
    { key: "running", label: "排隊/執行中", value: runningCount, icon: "running" },
    { key: "line",    label: "Line通知狀態", value: lineLabel,    icon: "line" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
      {card.map((item) => (
        <div
          key={item.key}
          className="border border-slate-200 dark:border-cyan-500/30 bg-card/90 dark:bg-background/40 hover:border-cyan-500/50 rounded-xl p-4 shadow-sm dark:shadow-none"
        >
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center shrink-0">
              {item.icon === "total" && (
                <Activity className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              )}
              {item.icon === "success" && (
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              )}
              {item.icon === "fail" && (
                <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              )}
              {item.icon === "running" && (
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              )}
              {item.icon === "line" && (
                <MessageSquare
                  className={`w-5 h-5 ${
                    lineActive
                      ? "text-emerald-600 dark:text-emerald-400 animate-pulse"
                      : "text-slate-400"
                  }`}
                />
              )}
            </div>
            <div className="flex flex-1 flex-col items-center justify-center min-w-0">
              <p className="text-sm text-slate-500 dark:text-slate-400 font-bold truncate">
                {item.label}
              </p>
              <p
                className={`text-2xl font-mono font-bold ${
                  item.key === "line"
                    ? lineActive
                      ? "text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-2"
                      : "text-slate-400 dark:text-slate-500 font-semibold flex items-center gap-2"
                    : "text-slate-900 dark:text-slate-100"
                }`}
              >
                {item.key === "line" && lineActive && (
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                )}
                {item.value}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

