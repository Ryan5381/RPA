// 管理各類自動化任務的狀態與邏輯

import { useState } from "react";
import { useWorkflowForm } from "./useWorkflowForm";
import { usePreferenceList } from "./usePreferenceList";
import { useTHSRWorkflow } from "./useTHSRWorkflow";
import { useBadmintonWorkflow } from "./useBadmintonWorkflow";
import { useHospitalWorkflow } from "./useHospitalWorkflow";
import { useLaunchWorkflow } from "./useWorkflowMutations";

export const useWorkflowManager = () => {
  const [selectedKey, setSelectedKey] = useState("hospital");

  // 表單 Hooks
  const genericForm = useWorkflowForm();
  const thsrWorkflow = useTHSRWorkflow();
  const badmintonWorkflow = useBadmintonWorkflow();
  const hospitalWorkflow = useHospitalWorkflow();
  const preferenceList = usePreferenceList();

  // API 啟動 Hook
  const launchMutation = useLaunchWorkflow();

  const handleLaunchTask = () => {
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
    } else {
      // 這裡未來可以實作其他表單的 config 取法
      alert("此類型腳本尚未實作，敬請期待！");
      return;
    }

    launchMutation.mutate(launchConfig);
  };

  return {
    selectedKey,
    setSelectedKey,
    genericForm,
    thsrWorkflow,
    badmintonWorkflow,
    hospitalWorkflow,
    preferenceList,
    handleLaunchTask,
    isLaunching: launchMutation.isPending,
  };
};
