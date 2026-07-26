import { useState } from "react";
import { SettingsHeader } from "./SettingsHeader";
import { AccountSecurityCard } from "./AccountSecurityCard";
import { SystemPreferencesCard } from "./SystemPreferencesCard";
import { LineNotifyCard } from "./LineNotifyCard";

export const Settings = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 儲存所有變更
  const handleSave = () => {
    setIsSaving(true);
    setSaveSuccess(false);

    // 觸發全域儲存事件，讓子元件（如 LineNotifyCard）知道要儲存狀態
    window.dispatchEvent(new Event("saveAllSettings"));

    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 700);
  };

  return (
    <div className="space-y-6 max-w-7xl pb-10">
      {/* 頁頭與儲存按鈕區塊 */}
      <SettingsHeader
        onSave={handleSave}
        isSaving={isSaving}
        saveSuccess={saveSuccess}
      />

      {/* 上半部網格結構：帳戶與安全 (2 span) + 系統偏好 (1 span) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <AccountSecurityCard />
        <SystemPreferencesCard />
      </div>

      {/* 下半部：LINE Notify 整合 */}
      <LineNotifyCard />
    </div>
  );
};
