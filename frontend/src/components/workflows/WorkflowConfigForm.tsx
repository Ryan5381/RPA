import React from "react";
import { SlidersHorizontal, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getFieldLabels } from "@/lib/workflowHelpers";
import { BadmintonForm } from "./forms/BadmintonForm";
import { ThsrForm } from "./forms/ThsrForm";
import { GenericForm } from "./forms/GenericForm";

interface WorkflowConfigFormProps {
  selectedKey: string;
  form: any;
  setField: any;
  resetForm: () => void;
  thsrForm?: any;
  setThsrForm?: any;
  resetThsrForm?: () => void;
  badmintonForm?: any;
  setBadmintonField?: any;
  resetBadmintonForm?: () => void;
}

export const WorkflowConfigForm: React.FC<WorkflowConfigFormProps> = ({
  selectedKey,
  form,
  setField,
  resetForm,
  thsrForm,
  setThsrForm,
  resetThsrForm,
  badmintonForm,
  setBadmintonField,
  resetBadmintonForm,
}) => {
  const isBadminton =
    selectedKey === "gym" ||
    selectedKey === "badminton" ||
    selectedKey === "badminton-booking";
  const isThsr = selectedKey === "train";

  const labels = getFieldLabels(selectedKey);

  const inputClass =
    "flex h-9 w-full rounded-md border border-slate-700/80 bg-slate-950/50 px-3 py-1 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus-visible:border-cyan-500/60 focus-visible:ring-1 focus-visible:ring-cyan-500/20";

  const handleReset = () => {
    if (isBadminton && resetBadmintonForm) {
      resetBadmintonForm();
    } else if (isThsr && resetThsrForm) {
      resetThsrForm();
    } else {
      resetForm();
    }
  };

  return (
    <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-6 backdrop-blur-xl">
      {/* 標頭區塊 */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-bold text-slate-200 tracking-wider flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
          工作流配置
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="h-7 text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 cursor-pointer gap-1.5 font-mono"
        >
          <RotateCcw className="w-3 h-3" />
          重設
        </Button>
      </div>

      {/* 依據 selectedKey 渲染對應模組化表單 */}
      {isBadminton ? (
        <BadmintonForm
          badmintonForm={badmintonForm}
          setBadmintonField={setBadmintonField}
          inputClass={inputClass}
        />
      ) : isThsr ? (
        <ThsrForm
          thsrForm={thsrForm}
          setThsrForm={setThsrForm}
          inputClass={inputClass}
        />
      ) : (
        <GenericForm
          form={form}
          setField={setField}
          labels={labels}
          inputClass={inputClass}
        />
      )}
    </div>
  );
};
