import { useState, useCallback, useEffect } from "react";
import { listTasks, updateTaskApi, deleteTaskApi, executeTask, clearTasksApi } from "@/apis/tasks";
import type { QueueTask } from "@/types/type";
import { sortTasks, cyclePriority } from "@/lib/queueHelpers";
import { isNotificationSoundEnabled, playNotificationSound } from "@/lib/notificationSound";

// 模組層級（跨元件共用）：記錄每筆任務目前已知的狀態。
// 因為 useQueueTasks 會同時被多個元件（Dashboard/Queue）各自呼叫、各自輪詢，
// 用模組層級的共用紀錄能確保同一次狀態轉換只會播放一次提示音，不會重複響。
const lastKnownTaskStatus = new Map<string, QueueTask["status"]>();

const TASK_TYPE_MAP: Record<string, { name: string; icon: string }> = {
  inline_booking:     { name: "🍽️ 餐廳訂位",       icon: "utensils" },
  hospital_booking:   { name: "🏥 醫院掛號",       icon: "hospital_booking" },
  thsr_booking:       { name: "🚄 高鐵訂票",       icon: "thsr_booking" },
  tixcraft_booking:   { name: "🎟️ 拓元搶票",       icon: "tixcraft_booking" },
  concert_ticket:     { name: "🎟️ 演唱會搶票",     icon: "concert_ticket" },
  badminton_booking:  { name: "🏸 羽球訂場",       icon: "badminton_booking" },
  flight_search:      { name: "✈️ 機票搜尋",       icon: "flight_search" },
};

const formatSupabaseRow = (row: any): QueueTask => {
  const meta = TASK_TYPE_MAP[row.task_type] || {
    name: row.task_type || "未命名任務",
    icon: "terminal",
  };

  // 從 config 提取有意義的副標題
  const cfg = row.config || {};
  const subParts: string[] = [];
  switch (row.task_type) {
    case "thsr_booking":
      if (cfg.from && cfg.to) subParts.push(`${cfg.from}→${cfg.to}`);
      break;
    case "flight_search":
      if (cfg.origin || cfg.from) subParts.push(`${cfg.origin || cfg.from}→${cfg.destination || cfg.to || "?"}`);
      if (cfg.depart_date) subParts.push(cfg.depart_date.slice(5));
      break;
    case "hospital_booking": {
      const h = cfg.hospital === "NTUH" ? "台大" : cfg.hospital === "CGMH" ? "長庚" : cfg.hospital || "";
      if (h) subParts.push(h);
      if (cfg.deptName || cfg.department) subParts.push(cfg.deptName || cfg.department);
      break;
    }
    case "tixcraft_booking":
    case "concert_ticket":
      if (cfg.target_date) subParts.push(cfg.target_date.slice(5));
      if (cfg.target_area) subParts.push(cfg.target_area);
      break;
    case "inline_booking":
      if (cfg.restaurant_key) subParts.push(cfg.restaurant_key);
      if (cfg.target_date) subParts.push(cfg.target_date.slice(5));
      break;
  }
  const displayName = subParts.length > 0
    ? `${meta.name} ${subParts.join(" ")}`
    : meta.name;

  const rawStatus = (row.status || "queued").toLowerCase();
  let status: "RUNNING" | "QUEUED" | "SUCCESS" | "FAILED" = "QUEUED";
  if (rawStatus === "running" || rawStatus === "waiting_otp") status = "RUNNING";
  else if (rawStatus === "completed" || rawStatus === "success") status = "SUCCESS";
  else if (rawStatus === "failed" || rawStatus === "error") status = "FAILED";
  else status = "QUEUED";

  const rawPrio = (row.priority || row.config?.priority || "MED").toUpperCase();
  const priority: "HIGH" | "MED" | "LOW" =
    rawPrio === "HIGH" || rawPrio === "LOW" ? rawPrio : "MED";

  const scheduledAt =
    row.scheduled_at ||
    row.config?.scheduled_at ||
    (row.create_at || row.created_at ? strToDateOnly(row.create_at || row.created_at) : "待排程");

  return {
    id: String(row.id),
    name: displayName,
    iconType: meta.icon,
    scheduledAt,
    priority,
    status,
    config: {
      target: row.config?.target || row.config?.restaurant_key || row.task_type,
      account: row.config?.account || row.config?.phone || "預設帳號",
      notify: row.config?.notify ?? true,
      ...row.config,
    },
  };
};

const strToDateOnly = (str: string) => str.replace("T", " ").split(" ")[0];

export const useQueueTasks = () => {
  const [tasks, setTasks] = useState<QueueTask[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await listTasks();
      const rows = res.data?.data || [];
      const formatted = rows.map(formatSupabaseRow);

      // 偵測任務狀態「剛轉為」成功/失敗：只有先前已知狀態存在且不同、
      // 且新狀態為終態時才觸發，避免頁面剛載入時把歷史任務全部響一輪
      const soundEnabled = isNotificationSoundEnabled();
      let shouldPlaySound = false;
      for (const t of formatted) {
        const prevStatus = lastKnownTaskStatus.get(t.id);
        const justCompleted =
          prevStatus !== undefined &&
          prevStatus !== t.status &&
          (t.status === "SUCCESS" || t.status === "FAILED");
        if (justCompleted) shouldPlaySound = true;
        lastKnownTaskStatus.set(t.id, t.status);
      }
      if (shouldPlaySound && soundEnabled) playNotificationSound();

      setTasks(sortTasks(formatted));
    } catch (err) {
      console.error("[useQueueTasks] 讀取排程清單失敗:", err);
    }
  }, []);

  // 進入頁面初始化撈取，並每 3 秒定期輪詢後端，即時看見排程器啟動與執行狀態
  useEffect(() => {
    setLoading(true);
    fetchTasks().finally(() => setLoading(false));

    const interval = setInterval(fetchTasks, 3000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  /** 刪除任務 */
  const removeTask = useCallback(
    async (id: string) => {
      // 樂觀更新
      setTasks((prev) => prev.filter((t) => t.id !== id));
      try {
        await deleteTaskApi({ taskId: id });
      } catch (err) {
        console.error("刪除任務失敗:", err);
        fetchTasks();
      }
    },
    [fetchTasks]
  );

  /** 重試失敗任務（觸發立刻派發執行 / 重新進入排程） */
  const retryTask = useCallback(
    async (id: string) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: "RUNNING" } : t))
      );
      try {
        await executeTask({ taskId: id });
        fetchTasks();
      } catch (err) {
        console.error("重試任務失敗:", err);
        fetchTasks();
      }
    },
    [fetchTasks]
  );

  /** 點擊優先度 badge 循環切換：HIGH → MED → LOW → HIGH */
  const togglePriority = useCallback(
    async (id: string) => {
      const target = tasks.find((t) => t.id === id);
      if (!target) return;
      const nextPrio = cyclePriority(target.priority);

      setTasks((prev) =>
        sortTasks(
          prev.map((t) => (t.id === id ? { ...t, priority: nextPrio } : t))
        )
      );

      try {
        await updateTaskApi({ taskId: id, payload: { priority: nextPrio } });
      } catch (err) {
        console.error("更新優先度失敗:", err);
        fetchTasks();
      }
    },
    [tasks, fetchTasks]
  );

  /** 更新任務（儲存編輯設定面板） */
  const updateTask = useCallback(
    async (updatedTask: QueueTask) => {
      setTasks((prev) =>
        sortTasks(prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)))
      );
      try {
        await updateTaskApi({
          taskId: updatedTask.id,
          payload: {
            priority: updatedTask.priority,
            scheduled_at: updatedTask.scheduledAt,
            config: updatedTask.config,
          },
        });
        fetchTasks();
      } catch (err) {
        console.error("更新任務失敗:", err);
        fetchTasks();
      }
    },
    [fetchTasks]
  );

  /** 批次清空任務 */
  const clearTasks = useCallback(
    async (mode: "history" | "all" = "history") => {
      if (mode === "all") {
        setTasks([]);
      } else {
        setTasks((prev) => prev.filter((t) => t.status === "QUEUED" || t.status === "RUNNING"));
      }
      try {
        await clearTasksApi({ mode });
        fetchTasks();
      } catch (err) {
        console.error("清空任務失敗:", err);
        fetchTasks();
      }
    },
    [fetchTasks]
  );

  return { tasks, loading, removeTask, retryTask, togglePriority, updateTask, clearTasks, fetchTasks };
};
