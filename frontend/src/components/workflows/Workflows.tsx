import { Cards } from "./Cards";
import { WorkflowConfigForm } from "./WorkflowConfigForm";
import { PreferenceSelector } from "./PreferenceSelector";
import { useWorkflowManager } from "@/hooks/useWorkflowManager";

export const Workflows = () => {
  const {
    selectedKey,
    setSelectedKey,
    genericForm,
    thsrWorkflow,
    badmintonWorkflow,
    hospitalWorkflow,
    preferenceList,
    handleLaunchTask,
    isLaunching,
  } = useWorkflowManager();

  return (
    <div className="space-y-8">
      {/* 新建工作流區塊 */}
      <div className="space-y-6">
        <div>
          <h2 className="text-base font-bold text-slate-300 tracking-wider flex items-center gap-2 mb-1">
            新建工作流
          </h2>
          <p className="text-xs text-slate-500 font-mono">
            選取下方的自動化類型，填寫對應參數，設定偏好預約時段後啟動任務
          </p>
        </div>

        {/* 應用程式卡片網格 */}
        <Cards selectedKey={selectedKey} onSelect={setSelectedKey} />

        {/* 工作流配置 + 預約偏好順位 */}
        <div className="grid grid-cols-1 xl:grid-cols-[3fr_2fr] gap-6 items-start">
          <WorkflowConfigForm
            selectedKey={selectedKey}
            form={genericForm.form}
            setField={genericForm.setField}
            resetForm={genericForm.resetForm}
            thsrForm={thsrWorkflow.thsrForm}
            setThsrForm={thsrWorkflow.setThsrForm}
            resetThsrForm={thsrWorkflow.resetThsrForm}
            badmintonForm={badmintonWorkflow.badmintonForm}
            setBadmintonField={badmintonWorkflow.setBadmintonField}
            resetBadmintonForm={badmintonWorkflow.resetBadmintonForm}
            hospitalForm={hospitalWorkflow.hospitalForm}
            setHospitalForm={hospitalWorkflow.setHospitalForm}
            resetHospitalForm={hospitalWorkflow.resetHospitalForm}
          />
          <PreferenceSelector
            preferences={preferenceList.preferences}
            addPreference={preferenceList.addPreference}
            removePreference={preferenceList.removePreference}
            updatePreference={preferenceList.updatePreference}
            isAtMax={preferenceList.isAtMax}
            handleLaunchTask={handleLaunchTask}
            isLaunching={isLaunching}
            selectedKey={selectedKey}
            badmintonForm={badmintonWorkflow.badmintonForm}
          />
        </div>
      </div>
    </div>
  );
};
