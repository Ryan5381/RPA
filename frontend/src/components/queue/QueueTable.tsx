import { Pencil, RotateCcw, Trash2, Terminal } from "lucide-react";
import { QueuePriorityBadge } from "./QueuePriorityBadge";
import { QueueStatusBadge } from "./QueueStatusBadge";
import { ICON_MAP } from "@/lib/icons";
import { isCancellable, isRetryable } from "@/lib/queueHelpers";
import type { QueueTask } from "@/types/type";
import { cn } from "@/lib/utils";

interface QueueTableProps {
  tasks: QueueTask[];
  onTogglePriority: (id: string) => void;
  onEdit: (id: string) => void;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
}

const COL_HEADERS = [
  { label: "任務名稱", className: "w-[35%]" },
  { label: "類型", className: "w-[8%] text-center" },
  { label: "預約日期", className: "w-[15%]" },
  { label: "優先度", className: "w-[12%]" },
  { label: "狀態/結果", className: "w-[14%]" },
  { label: "操作", className: "w-[16%] text-right" },
];

export const QueueTable = ({
  tasks,
  onTogglePriority,
  onEdit,
  onRetry,
  onRemove,
}: QueueTableProps) => {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-300 dark:border-slate-800/70 bg-white dark:bg-transparent shadow-sm dark:shadow-none">
      <table className="w-full text-sm">
        {/* 表頭 */}
        <thead>
          <tr className="border-b border-slate-300 dark:border-slate-800/70 bg-slate-100 dark:bg-slate-900/60">
            {COL_HEADERS.map((h) => (
              <th
                key={h.label}
                className={cn(
                  "px-4 py-3 text-left text-xs font-mono text-slate-700 dark:text-slate-400 tracking-widest font-semibold",
                  h.className,
                )}
              >
                {h.label}
              </th>
            ))}
          </tr>
        </thead>

        {/* 表身 */}
        <tbody>
          {tasks.length === 0 && (
            <tr>
              <td
                colSpan={6}
                className="px-4 py-16 text-center text-slate-600 dark:text-slate-500 font-mono text-xs tracking-wider"
              >
                目前序列中沒有任何任務
              </td>
            </tr>
          )}

          {tasks.map((task) => {
            const Icon = ICON_MAP[task.iconType] || Terminal;
            const isRunning = task.status === "RUNNING";

            return (
              <tr
                key={task.id}
                className={cn(
                  "border-b border-slate-200 dark:border-slate-800/40 transition-colors duration-150",
                  isRunning
                    ? "bg-cyan-50 dark:bg-cyan-950/10 hover:bg-cyan-100/80 dark:hover:bg-cyan-950/20"
                    : "hover:bg-slate-50 dark:hover:bg-slate-900/40",
                )}
              >
                {/* 任務名稱 + ID */}
                <td className="px-4 py-3.5">
                  <div className="flex flex-col gap-0.5">
                    <span
                      className={cn(
                        "font-medium text-sm tracking-wide",
                        isRunning ? "text-cyan-800 dark:text-cyan-100 font-bold" : "text-slate-900 dark:text-slate-200",
                      )}
                    >
                      {task.name}
                    </span>
                    <span className="text-[11px] font-mono text-slate-600 dark:text-slate-500">
                      ID: {task.id}
                    </span>
                  </div>
                </td>

                {/* 類型圖示 */}
                <td className="px-4 py-3.5 text-center">
                  <div
                    className={cn(
                      "inline-flex items-center justify-center w-7 h-7 rounded-lg",
                      isRunning
                        ? "bg-cyan-100 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-400"
                        : task.status === "SUCCESS"
                          ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                          : task.status === "FAILED"
                            ? "bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400"
                            : "bg-slate-200 dark:bg-slate-800/60 text-slate-700 dark:text-slate-400",
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                </td>

                {/* 預約日期 */}
                <td className="px-4 py-3.5">
                  <span className="font-mono text-xs text-slate-700 dark:text-slate-400">
                    {task.scheduledAt}
                  </span>
                </td>

                {/* 優先度（可點擊切換） */}
                <td className="px-4 py-3.5">
                  <QueuePriorityBadge
                    priority={task.priority}
                    onClick={() => onTogglePriority(task.id)}
                  />
                </td>

                {/* 狀態 */}
                <td className="px-4 py-3.5">
                  <QueueStatusBadge status={task.status} />
                </td>

                {/* 操作按鈕 */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center justify-end gap-1">
                    {/* 編輯（執行中 or 排隊中才顯示） */}
                    {isCancellable(task.status) && (
                      <ActionBtn title="編輯" onClick={() => onEdit(task.id)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </ActionBtn>
                    )}

                    {/* 重試（失敗才顯示） */}
                    {isRetryable(task.status) && (
                      <ActionBtn
                        title="重試"
                        onClick={() => onRetry(task.id)}
                        className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/40"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </ActionBtn>
                    )}

                    {/* 刪除 */}
                    <ActionBtn
                      title="刪除"
                      onClick={() => onRemove(task.id)}
                      className="text-rose-600 dark:text-rose-400/70 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </ActionBtn>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// ─── 小型操作按鈕 ─────────────────────────────────────────────────────────────
interface ActionBtnProps {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
  disabled?: boolean;
  className?: string;
}

const ActionBtn = ({
  children,
  onClick,
  title,
  disabled = false,
  className,
}: ActionBtnProps) => (
  <button
    title={title}
    disabled={disabled}
    onClick={onClick}
    className={cn(
      "p-1.5 rounded-md text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all duration-150 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer",
      className,
    )}
  >
    {children}
  </button>
);
