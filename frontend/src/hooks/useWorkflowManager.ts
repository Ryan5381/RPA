// 管理各類自動化任務的狀態與邏輯

import { useState } from "react";
import { useWorkflowForm } from "./useWorkflowForm";
import { usePreferenceList } from "./usePreferenceList";
import { useTHSRWorkflow } from "./useTHSRWorkflow";
import { useBadmintonWorkflow } from "./useBadmintonWorkflow";
import { useHospitalWorkflow } from "./useHospitalWorkflow";
import { useTixCraftWorkflow } from "./useTixCraftWorkflow";
import { useInlineWorkflow } from "./useInlineWorkflow";
import { useLaunchWorkflow } from "./useWorkflowMutations";

export const useWorkflowManager = () => {
  const [selectedKey, setSelectedKey] = useState("hospital");

  // OTP Modal 狀態：task_id 或 null
  const [otpTaskId, setOtpTaskId] = useState<string | null>(null);
  const clearOtpTask = () => setOtpTaskId(null);

  // 表單 Hooks
  const genericForm = useWorkflowForm();
  const thsrWorkflow = useTHSRWorkflow();
  const badmintonWorkflow = useBadmintonWorkflow();
  const hospitalWorkflow = useHospitalWorkflow();
  const tixCraftWorkflow = useTixCraftWorkflow();
  const inlineWorkflow = useInlineWorkflow();
  const preferenceList = usePreferenceList();

  // API 啟動 Hook
  const launchMutation = useLaunchWorkflow({
    // inline 任務成功啟動後，開啟 OTP Modal 等待
    onInlineLaunched: (taskId: string) => {
      if (selectedKey === "utensils") {
        setOtpTaskId(taskId);
      }
    },
  });

  const handleLaunchTask = (options?: { priority?: string; scheduledAt?: string }) => {
    let launchConfig;

    // 高鐵
    if (selectedKey === "train") {
      launchConfig = thsrWorkflow.getLaunchConfig(preferenceList.preferences);
    }
    // 羽球
    else if (selectedKey === "gym") {
      launchConfig = badmintonWorkflow.getLaunchConfig(
        preferenceList.preferences,
      );
    }
    // 醫院掛號
    else if (selectedKey === "hospital") {
      launchConfig = hospitalWorkflow.getLaunchConfig(
        preferenceList.preferences,
      );
    }
    // 演唱會搶票 (拓元售票)
    else if (selectedKey === "ticket") {
      launchConfig = tixCraftWorkflow.getLaunchConfig(
        preferenceList.preferences,
      );
    }
    // 美食預約 (inline.app)
    else if (selectedKey === "utensils") {
      launchConfig = inlineWorkflow.getLaunchConfig();
    } else {
      // 這裡未來可以實作其他表單的 config 取法
      alert("此類型腳本尚未實作，敬請期待！");
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
    preferenceList,
    handleLaunchTask,
    isLaunching: launchMutation.isPending,
    otpTaskId,
    clearOtpTask,
  };
};
