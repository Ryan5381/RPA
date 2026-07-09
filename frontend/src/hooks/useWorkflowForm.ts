import { useState } from "react";
import type { WorkflowFormState } from "@/types/type";

const INITIAL_STATE: WorkflowFormState = {
  platform: "",
  idNumber: "",
  name: "",
  password: "",
  specialtyA: "",
  specialtyB: "",
  slotA: "",
  slotB: "",
  lineNotify: false,
};

/**
 * useWorkflowForm
 * 管理「工作流配置表單」的所有欄位狀態與操作方法
 */
export const useWorkflowForm = () => {
  const [form, setForm] = useState<WorkflowFormState>(INITIAL_STATE);

  /** 單一欄位更新（泛型版本，保型別安全） */
  const setField = <K extends keyof WorkflowFormState>(
    field: K,
    value: WorkflowFormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  /** 重置所有欄位至初始值 */
  const resetForm = () => setForm(INITIAL_STATE);

  return { form, setField, resetForm };
};
