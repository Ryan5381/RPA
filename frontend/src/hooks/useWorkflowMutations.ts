// 建立/啟動任務的hook

import { useMutation } from "@tanstack/react-query";
import { createTask, executeTask } from "@/apis/tasks";

interface LaunchConfig {
  taskType: string;
  config: any;
  priority?: string;
  scheduledAt?: string;
}

interface UseLaunchWorkflowOptions {
  /** inline 任務啟動成功後的回呼，回傳 task_id */
  onInlineLaunched?: (taskId: string) => void;
  /** 當排程預約建立成功後的回呼 */
  onScheduled?: (taskId: string, scheduledAt: string) => void;
}

export const useLaunchWorkflow = (options?: UseLaunchWorkflowOptions) => {
  return useMutation({
    mutationFn: async ({ taskType, config, priority = "MED", scheduledAt }: LaunchConfig) => {
      const isScheduled = Boolean(scheduledAt && scheduledAt.trim() !== "");
      const status = isScheduled ? "queued" : "pending";

      // 1. 建立任務 (若為預約，狀態預設為 queued 進入優先序列排程池)
      const createRes = await createTask({
        taskType,
        config,
        status,
        priority,
        scheduledAt,
      });
      const taskId = createRes.data.data[0].id;

      // 2. 若為立刻執行 (非排程預約)，則立即觸發背景執行
      if (!isScheduled) {
        await executeTask({ taskId });
      }

      return { taskId, taskType, isScheduled, scheduledAt };
    },
    onSuccess: ({ taskId, taskType, isScheduled, scheduledAt }) => {
      console.log("任務已建立，ID:", taskId, "是否排程:", isScheduled);

      if (isScheduled && scheduledAt) {
        options?.onScheduled?.(taskId, scheduledAt);
        alert(`⏰ 排程任務已成功預約！\n任務 ID: ${taskId}\n預約時間: ${scheduledAt}\n系統已將其排入優先序列 (Queue)，將於時間到達時自動執行。`);
        return;
      }

      // inline 訂位：立刻啟動時不顯示 alert，改由 OTP Modal 接管
      if (taskType === "inline_booking") {
        options?.onInlineLaunched?.(taskId);
        return;
      }

      alert(`🚀 自動化任務已成功立刻啟動！(任務 ID: ${taskId})`);
    },
    onError: (error) => {
      console.error("任務啟動/排程失敗:", error);
      alert("任務啟動/排程失敗，請確認後端服務是否已開啟或參數是否正確");
    },
  });
};
