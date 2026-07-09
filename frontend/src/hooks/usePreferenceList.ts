import { useState } from "react";
import type { Preference } from "@/types/type";
import { MAX_PREFERENCES } from "@/lib/workflowHelpers";

const DEFAULT_PREFERENCES: Preference[] = [
  { id: "pref-1", date: "2026-08-15", time: "08:30", label: "上午門診" },
  { id: "pref-2", date: "2026-08-22", time: "14:00", label: "下午門診" },
];

/**
 * usePreferenceList
 * 管理「預約偏好順位」清單的 CRUD 操作
 */
export const usePreferenceList = () => {
  const [preferences, setPreferences] = useState<Preference[]>(DEFAULT_PREFERENCES);

  /** 新增一筆空白偏好（最多 MAX_PREFERENCES 筆） */
  const addPreference = () => {
    if (preferences.length >= MAX_PREFERENCES) return;
    setPreferences((prev) => [
      ...prev,
      { id: `pref-${Date.now()}`, date: "", time: "", label: "" },
    ]);
  };

  /** 依 id 刪除偏好 */
  const removePreference = (id: string) => {
    setPreferences((prev) => prev.filter((p) => p.id !== id));
  };

  /** 更新特定偏好的單一欄位 */
  const updatePreference = (id: string, field: keyof Preference, value: string) => {
    setPreferences((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const isAtMax = preferences.length >= MAX_PREFERENCES;

  return { preferences, addPreference, removePreference, updatePreference, isAtMax };
};
