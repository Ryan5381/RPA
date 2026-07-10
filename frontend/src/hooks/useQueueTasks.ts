import { useState, useCallback } from "react";
import rawTasks from "@/data/queueTasks.json";
import type { QueueTask } from "@/types/type";
import { sortTasks, cyclePriority } from "@/lib/queueHelpers";

const initTasks = sortTasks(rawTasks as QueueTask[]);

export const useQueueTasks = () => {
  const [tasks, setTasks] = useState<QueueTask[]>(initTasks);

  /** 每次更新後自動重新排序 */
  const update = useCallback((updater: (prev: QueueTask[]) => QueueTask[]) => {
    setTasks((prev) => sortTasks(updater(prev)));
  }, []);

  /** 刪除任務 */
  const removeTask = useCallback(
    (id: string) => update((prev) => prev.filter((t) => t.id !== id)),
    [update]
  );

  /** 重試失敗任務（FAILED → QUEUED，並重新排入佇列） */
  const retryTask = useCallback(
    (id: string) =>
      update((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: "QUEUED" } : t))
      ),
    [update]
  );

  /** 點擊優先度 badge 循環切換：HIGH → MED → LOW → HIGH */
  const togglePriority = useCallback(
    (id: string) =>
      update((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, priority: cyclePriority(t.priority) } : t
        )
      ),
    [update]
  );

  /** 更新任務（儲存編輯） */
  const updateTask = useCallback(
    (updatedTask: QueueTask) =>
      update((prev) =>
        prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
      ),
    [update]
  );

  return { tasks, removeTask, retryTask, togglePriority, updateTask };
};
