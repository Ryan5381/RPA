import { Save, RefreshCw, Check } from "lucide-react";

interface SettingsHeaderProps {
  onSave: () => void;
  isSaving: boolean;
  saveSuccess: boolean;
}

export const SettingsHeader = ({
  onSave,
  isSaving,
  saveSuccess,
}: SettingsHeaderProps) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-wide flex items-center gap-2.5">
          系統設置
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          配置您的自動化指揮中心偏好與安全權限
        </p>
      </div>

      <button
        onClick={onSave}
        disabled={isSaving}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 shadow-lg cursor-pointer ${
          saveSuccess
            ? "bg-emerald-500 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.4)]"
            : isSaving
              ? "bg-cyan-500/50 text-slate-950 cursor-not-allowed"
              : "bg-cyan-500 dark:bg-cyan-400 hover:bg-cyan-400 dark:hover:bg-cyan-300 text-white dark:text-slate-950 shadow-[0_0_15px_rgba(34,211,238,0.3)] hover:shadow-[0_0_25px_rgba(34,211,238,0.5)]"
        }`}
      >
        {isSaving ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>儲存中...</span>
          </>
        ) : saveSuccess ? (
          <>
            <Check className="w-4 h-4" />
            <span>已成功儲存</span>
          </>
        ) : (
          <>
            <Save className="w-4 h-4" />
            <span>儲存所有變更</span>
          </>
        )}
      </button>
    </div>
  );
};
