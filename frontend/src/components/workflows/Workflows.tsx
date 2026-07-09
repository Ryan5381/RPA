import { useState } from "react";
import { Cards } from "./Cards";
import { WorkflowConfigForm } from "./WorkflowConfigForm";
import { PreferenceSelector } from "./PreferenceSelector";

export const Workflows = () => {
  const [selectedKey, setSelectedKey] = useState("hospital");

  return (
    <div className="space-y-8">
      {/* 頁面標頭 */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100 tracking-wide">
          自動化預約的指揮中心
        </h1>
        <p className="text-sm text-slate-500 mt-1 font-mono">
          選擇自動化應用程式，配置帳號與偏好時段，一鍵啟動智能搶位任務
        </p>
      </div>

      {/* 新建工作流區塊 */}
      <div className="space-y-6">
        <div>
          <h2 className="text-base font-bold text-slate-300 tracking-wider flex items-center gap-2 mb-1">
            新建工作流
            <span className="text-xs font-mono text-slate-500 font-normal">
              New Workflow
            </span>
          </h2>
          <p className="text-xs text-slate-500 font-mono">
            選取下方的自動化類型，填寫對應參數，設定偏好預約時段後啟動任務
          </p>
        </div>

        {/* 應用程式卡片網格 */}
        <Cards selectedKey={selectedKey} onSelect={setSelectedKey} />

        {/* 工作流配置 + 預約偏好順位 */}
        <div className="grid grid-cols-1 xl:grid-cols-[3fr_2fr] gap-6 items-start">
          <WorkflowConfigForm selectedKey={selectedKey} />
          <PreferenceSelector />
        </div>
      </div>
    </div>
  );
};
