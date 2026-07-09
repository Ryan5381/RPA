import workflowPlatforms from "@/data/workflowPlatforms.json";
import workflowFieldLabels from "@/data/workflowFieldLabels.json";

type PlatformKey = keyof typeof workflowPlatforms;
type FieldLabelKey = keyof typeof workflowFieldLabels;

/**
 * 依 selectedKey 取得對應的平台設定（label + platforms 陣列）
 * 若 key 不存在則 fallback 至 hospital
 */
export function getPlatformConfig(selectedKey: string) {
  const key = (selectedKey in workflowPlatforms ? selectedKey : "hospital") as PlatformKey;
  return workflowPlatforms[key];
}

/**
 * 依 selectedKey 取得動態表單欄位的標籤文字
 * 回傳格式: { specialtyA, specialtyB, slotA, slotB }
 */
export function getFieldLabels(selectedKey: string) {
  const key = (selectedKey in workflowFieldLabels ? selectedKey : "hospital") as FieldLabelKey;
  const { specialty, slot } = workflowFieldLabels[key];
  const [specialtyA, specialtyB] = specialty.split("/");
  const [slotA, slotB] = slot.split("/");
  return { specialtyA, specialtyB, slotA, slotB };
}

/**
 * 順位標籤對照（上限 5 個）
 */
export const ORDER_LABELS = ["第一順位", "第二順位", "第三順位", "第四順位", "第五順位"] as const;

export const MAX_PREFERENCES = 5;
