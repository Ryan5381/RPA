import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { getTaskStatus } from "@/apis/tasks";
import { useWorkflowForm } from "./useWorkflowForm";
import { usePreferenceList } from "./usePreferenceList";
import { useTHSRWorkflow } from "./useTHSRWorkflow";
import { useBadmintonWorkflow } from "./useBadmintonWorkflow";
import { useHospitalWorkflow } from "./useHospitalWorkflow";
import { useTixCraftWorkflow } from "./useTixCraftWorkflow";
import { useInlineWorkflow } from "./useInlineWorkflow";
import { useFlightWorkflow } from "./useFlightWorkflow";
import { useLaunchWorkflow } from "./useWorkflowMutations";

export const useWorkflowManager = () => {
  const [selectedKey, setSelectedKey] = useState("hospital");

  // OTP Modal 狀態：task_id 或 null。只有後端真的走到「等待 OTP」那一步才會設定，
  // 不是任務一啟動就打開——不然瀏覽器可能連 inline.app 都還沒開好，
  // 使用者就先看到要輸入驗證碼的畫面，手機根本還沒收到簡訊。
  const [otpTaskId, setOtpTaskId] = useState<string | null>(null);
  const clearOtpTask = () => setOtpTaskId(null);

  // 任務剛啟動、還在等後端跑到 waiting_otp 的那個過渡期 task_id
  const [pendingInlineTaskId, setPendingInlineTaskId] = useState<string | null>(null);

  // 每 2 秒輪詢一次剛啟動的 inline 任務狀態，直到後端真的回報 waiting_otp
  // 才把 OTP Modal 打開；若中途就 success/failed，直接用 toast 通知，不開 Modal。
  useQuery({
    queryKey: ["inline-task-pending", pendingInlineTaskId],
    queryFn: async () => {
      if (!pendingInlineTaskId) return null;
      const res = await getTaskStatus({ taskId: pendingInlineTaskId });
      const data = res.data;
      if (data.status === "waiting_otp") {
        setOtpTaskId(pendingInlineTaskId);
        setPendingInlineTaskId(null);
      } else if (data.status === "failed") {
        toast.error("訂位任務失敗", {
          description: data.result?.error ?? "請查看 Logs 了解詳情",
        });
        setPendingInlineTaskId(null);
      } else if (data.status === "success") {
        toast.success("訂位任務已完成！");
        setPendingInlineTaskId(null);
      }
      return data;
    },
    enabled: !!pendingInlineTaskId,
    refetchInterval: 2000,
    refetchIntervalInBackground: true,
  });

  // 表單 Hooks
  const genericForm = useWorkflowForm();
  const thsrWorkflow = useTHSRWorkflow();
  const badmintonWorkflow = useBadmintonWorkflow();
  const hospitalWorkflow = useHospitalWorkflow();
  const tixCraftWorkflow = useTixCraftWorkflow();
  const inlineWorkflow = useInlineWorkflow();
  const flightWorkflow = useFlightWorkflow();
  const preferenceList = usePreferenceList();

  // API 啟動 Hook
  const launchMutation = useLaunchWorkflow({
    // inline 任務成功啟動後，開始輪詢等待後端真的走到 waiting_otp
    onInlineLaunched: (taskId: string) => {
      if (selectedKey === "utensils") {
        setPendingInlineTaskId(taskId);
        toast.info("訂位機器人啟動中...", {
          description: "正在自動填寫訂位資訊，等待驗證碼畫面出現後會自動提示您輸入",
          duration: 5000,
        });
      }
    },
  });

  const handleLaunchTask = (options?: { priority?: string; scheduledAt?: string }) => {
    let launchConfig;

    // 高鐵
    if (selectedKey === "train") {
      launchConfig = thsrWorkflow.getLaunchConfig();
    }
    // 羽球
    else if (selectedKey === "gym") {
      launchConfig = badmintonWorkflow.getLaunchConfig(
        preferenceList.preferences,
      );
    }
    // 醫院掛號
    else if (selectedKey === "hospital") {
      launchConfig = hospitalWorkflow.getLaunchConfig();
    }
    // 演唱會搶票 (拓元售票)
    else if (selectedKey === "ticket") {
      launchConfig = tixCraftWorkflow.getLaunchConfig();
    }
    // 美食預約 (inline.app)
    else if (selectedKey === "utensils") {
      launchConfig = inlineWorkflow.getLaunchConfig();
    }
    // 折扣機票搜尋
    else if (selectedKey === "airplane") {
      launchConfig = flightWorkflow.getLaunchConfig();
    } else {
      // 這裡未來可以實作其他表單的 config 取法
      toast.info("此類型腳本尚未實作", {
        description: "敢請期待！此自動化流程正在開發中，將於新版本上線。",
        duration: 4000,
      });
      return;
    }

    launchMutation.mutate({
      ...launchConfig,
      priority: options?.priority || "MED",
      scheduledAt: options?.scheduledAt,
    });
  };

  return {
    selectedKey,
    setSelectedKey,
    genericForm,
    thsrWorkflow,
    badmintonWorkflow,
    hospitalWorkflow,
    tixCraftWorkflow,
    inlineWorkflow,
    flightWorkflow,
    preferenceList,
    handleLaunchTask,
    isLaunching: launchMutation.isPending,
    otpTaskId,
    clearOtpTask,
  };
};
