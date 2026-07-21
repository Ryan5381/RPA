// 建立/啟動任務的hook

import { useMutation } from "@tanstack/react-query";
import { createTask, executeTask } from "@/apis/tasks";

interface LaunchConfig {
  taskType: string;
  config: any;
}

interface UseLaunchWorkflowOptions {
  /** inline 任務啟動成功後的回呼，回傳 task_id */
  onInlineLaunched?: (taskId: string) => void;
}

export const useLaunchWorkflow = (options?: UseLaunchWorkflowOptions) => {
  return useMutation({
    mutationFn: async ({ taskType, config }: LaunchConfig) => {
      // 1. 建立任務
      const createRes = await createTask({ taskType, config });
      const taskId = createRes.data.data[0].id;

      // 2. 觸發執行
      await executeTask({ taskId });
      return { taskId, taskType };
    },
    onSuccess: ({ taskId, taskType }) => {
      console.log("任務已成功派發，ID:", taskId);

      // inline 訂位：不顯示 alert，改由 OTP Modal 接管
      if (taskType === "inline_booking") {
        options?.onInlineLaunched?.(taskId);
        return;
      }

      alert(`自動化任務已成功啟動！(任務 ID: ${taskId})`);
    },
    onError: (error) => {
      console.error("任務啟動失敗:", error);
      alert("任務啟動失敗，請確認後端服務是否已開啟或參數是否正確");
    },
  });
};
