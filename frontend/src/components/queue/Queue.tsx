import { useState } from "react";
import { ListOrdered, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QueueTable } from "./QueueTable";
import { QueueEditSheet } from "./QueueEditSheet";
import { useQueueTasks } from "@/hooks/useQueueTasks";

export const Queue = () => {
  const { tasks, removeTask, retryTask, togglePriority, updateTask } = useQueueTasks();
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const runningCount = tasks.filter((t) => t.status === "RUNNING").length;
  const queuedCount = tasks.filter((t) => t.status === "QUEUED").length;

  const editingTask = tasks.find((t) => t.id === editingTaskId) || null;

  return (
    <div className="space-y-8">
      {/* ── 頁面標頭 ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-wide flex items-center gap-2.5">
            <ListOrdered className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            任務優先序列
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-500 mt-1 font-mono">
            管理自動化任務的執行順序，控制優先度與排程狀態
          </p>
        </div>

        {/* 右側操作 */}
        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="outline"
            className="text-xs font-mono text-slate-700 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:border-cyan-500/50 hover:text-cyan-600 dark:hover:text-cyan-400 transition-all cursor-pointer"
            onClick={() => alert("管理序列 (TODO)")}
          >
            管理序列
          </Button>
          <Button
            className="gap-2 bg-cyan-600 hover:bg-cyan-500 dark:bg-cyan-100 dark:hover:bg-cyan-200 text-white dark:text-slate-900 font-semibold border border-cyan-700 dark:border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all text-xs cursor-pointer"
            onClick={() => alert("新任務 (TODO)")}
          >
            <Plus className="w-3.5 h-3.5" />
            新任務
          </Button>
        </div>
      </div>

      {/* ── 統計列 ── */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="執行中"
          value={runningCount}
          color="text-cyan-600 dark:text-cyan-400"
          glow="shadow-sm dark:shadow-[0_0_15px_rgba(6,182,212,0.08)] border-cyan-400/50 dark:border-cyan-500/20"
        />
        <StatCard
          label="排隊中"
          value={queuedCount}
          color="text-slate-900 dark:text-slate-300"
          glow="border-slate-300 dark:border-slate-700/50"
        />
        <StatCard
          label="總任務數"
          value={tasks.length}
          color="text-slate-800 dark:text-slate-400"
          glow="border-slate-300 dark:border-slate-700/50"
        />
      </div>

      {/* ── 任務表格 ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-300 tracking-wider flex items-center gap-2">
            序列清單
            <span className="text-xs font-mono text-slate-600 dark:text-slate-500 font-normal">
              Queue List
            </span>
          </h2>
          <span className="text-xs font-mono text-slate-700 dark:text-slate-600 font-medium">
            共 {tasks.length} 筆
          </span>
        </div>

        <QueueTable
          tasks={tasks}
          onTogglePriority={togglePriority}
          onEdit={(id) => setEditingTaskId(id)}
          onRetry={retryTask}
          onRemove={removeTask}
        />
      </div>

      {/* ── 編輯面板 ── */}
      <QueueEditSheet
        isOpen={!!editingTaskId}
        onClose={() => setEditingTaskId(null)}
        task={editingTask}
        onSave={updateTask}
      />
    </div>
  );
};

// ─── 統計卡片 ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: number;
  color: string;
  glow: string;
}

const StatCard = ({ label, value, color, glow }: StatCardProps) => (
  <div
    className={`bg-card dark:bg-background/40 rounded-xl px-5 py-4 border flex items-center gap-4 ${glow}`}
  >
    <span className={`text-3xl font-bold font-mono tabular-nums ${color}`}>
      {value}
    </span>
    <span className="text-sm text-slate-600 dark:text-slate-500 font-mono">{label}</span>
  </div>
);
