import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { QueueTask } from "@/types/type";
import type { Priority } from "@/lib/queueHelpers";

import { ThsrForm } from "@/components/workflows/forms/ThsrForm";
import { HospitalForm } from "@/components/workflows/forms/HospitalForm";
import { BadmintonForm } from "@/components/workflows/forms/BadmintonForm";
import { TixCraftForm } from "@/components/workflows/forms/TixCraftForm";
import { InlineForm } from "@/components/workflows/forms/InlineForm";
import { FlightForm } from "@/components/workflows/forms/FlightForm";
import { useTHSRWorkflow } from "@/hooks/useTHSRWorkflow";
import { useHospitalWorkflow } from "@/hooks/useHospitalWorkflow";
import { useBadmintonWorkflow } from "@/hooks/useBadmintonWorkflow";
import { useTixCraftWorkflow } from "@/hooks/useTixCraftWorkflow";
import { useInlineWorkflow } from "@/hooks/useInlineWorkflow";
import { useFlightWorkflow } from "@/hooks/useFlightWorkflow";

interface QueueEditSheetProps {
  isOpen: boolean;
  onClose: () => void;
  task: QueueTask | null;
  onSave: (task: QueueTask) => void;
}

const inputClass =
  "flex h-9 w-full rounded-md border border-slate-300 dark:border-slate-700/80 bg-white dark:bg-slate-900/50 px-3 py-1 text-xs text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus-visible:border-cyan-500/60 focus-visible:ring-1 focus-visible:ring-cyan-500/20";

// 從已存的 config 挑出指定欄位覆蓋到表單初始值上；numericKeys 內的欄位在
// DB 裡存的是數字（Number()/parseInt() 寫入的），但表單的輸入框吃字串，這裡轉回字串
const pickConfigFields = (
  cfg: Record<string, any> | undefined,
  numericKeys: string[] = []
) => {
  if (!cfg) return {};
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(cfg)) {
    if (value === undefined || value === null) continue;
    out[key] = numericKeys.includes(key) ? String(value) : value;
  }
  return out;
};

export const QueueEditSheet = ({
  isOpen,
  onClose,
  task,
  onSave,
}: QueueEditSheetProps) => {
  const [prevTaskId, setPrevTaskId] = useState<string | undefined>(task?.id);

  const [name, setName] = useState(task?.name || "");
  const [scheduledAt, setScheduledAt] = useState(task?.scheduledAt || "");
  const [priority, setPriority] = useState<Priority>(task?.priority || "LOW");

  // 依任務類型準備對應的表單狀態——跟建立任務時用的是同一套 hook，
  // 確保編輯面板改到的欄位跟腳本實際讀取的欄位（from/to/date、hospital/deptName…）一致
  const { thsrForm, setThsrForm, getLaunchConfig: getThsrConfig } = useTHSRWorkflow();
  const { hospitalForm, setHospitalForm, getLaunchConfig: getHospitalConfig } = useHospitalWorkflow();
  const { badmintonForm, setBadmintonForm, setBadmintonField } = useBadmintonWorkflow();
  const { tixCraftForm, setTixCraftForm, getLaunchConfig: getTixCraftConfig } = useTixCraftWorkflow();
  const { inlineForm, setInlineForm, setInlineField, getLaunchConfig: getInlineConfig } = useInlineWorkflow();
  const { flightForm, setFlightForm, setFlightField, getLaunchConfig: getFlightConfig } = useFlightWorkflow();

  // 當傳入的 task 改變時（切換編輯對象），在 render 階段直接重置 state
  // 這是 React 官方推薦取代 useEffect 同步 setState 的做法，可避免多餘的 cascading render
  if (task?.id !== prevTaskId) {
    setPrevTaskId(task?.id);
    setName(task?.name || "");
    setScheduledAt(task?.scheduledAt || "");
    setPriority(task?.priority || "LOW");

    const cfg = task?.config;
    switch (task?.taskType) {
      case "thsr_booking":
        setThsrForm((prev) => ({ ...prev, ...pickConfigFields(cfg, ["count"]) }));
        break;
      case "hospital_booking":
        setHospitalForm((prev) => ({ ...prev, ...pickConfigFields(cfg) }));
        break;
      case "badminton_booking":
        setBadmintonForm((prev) => ({ ...prev, ...pickConfigFields(cfg, ["session_count"]) }));
        break;
      case "tixcraft_booking":
      case "concert_ticket":
        setTixCraftForm((prev) => ({ ...prev, ...pickConfigFields(cfg, ["ticket_count"]) }));
        break;
      case "inline_booking":
        setInlineForm((prev) => ({ ...prev, ...pickConfigFields(cfg, ["adults", "kids"]) }));
        break;
      case "flight_search":
        setFlightForm((prev) => ({ ...prev, ...pickConfigFields(cfg, ["budget", "stay_duration"]) }));
        break;
    }
  }

  const handleSave = () => {
    if (!task) return;

    // 把當前表單狀態轉換回實際要寫進 config 的欄位，並疊在原本的 config 上——
    // 這樣沒有在編輯面板顯示出來的欄位（如 fallback_options、preferences）不會被清掉
    let typeConfig: Record<string, any> = {};
    switch (task.taskType) {
      case "thsr_booking":
        typeConfig = getThsrConfig().config;
        break;
      case "hospital_booking":
        typeConfig = getHospitalConfig().config;
        break;
      case "badminton_booking":
        typeConfig = {
          user_id: badmintonForm.user_id,
          password: badmintonForm.password,
          capsolver_api_key: badmintonForm.capsolver_api_key,
          target_date: badmintonForm.target_date,
          target_time_slot: badmintonForm.target_time_slot,
          target_courts: badmintonForm.target_courts,
          target_time: badmintonForm.target_time,
          session_count: parseInt(badmintonForm.session_count) || 2,
        };
        break;
      case "tixcraft_booking":
      case "concert_ticket":
        typeConfig = getTixCraftConfig().config;
        break;
      case "inline_booking":
        typeConfig = getInlineConfig().config;
        break;
      case "flight_search":
        typeConfig = getFlightConfig().config;
        break;
    }

    onSave({
      ...task,
      name,
      scheduledAt,
      priority,
      config: {
        ...task.config,
        ...typeConfig,
      },
    });
    onClose();
  };

  const renderTypeForm = () => {
    switch (task?.taskType) {
      case "thsr_booking":
        return <ThsrForm thsrForm={thsrForm} setThsrForm={setThsrForm} inputClass={inputClass} />;
      case "hospital_booking":
        return <HospitalForm hospitalForm={hospitalForm} setHospitalForm={setHospitalForm} inputClass={inputClass} />;
      case "badminton_booking":
        return <BadmintonForm badmintonForm={badmintonForm} setBadmintonField={setBadmintonField} inputClass={inputClass} />;
      case "tixcraft_booking":
      case "concert_ticket":
        return <TixCraftForm tixCraftForm={tixCraftForm} setTixCraftForm={setTixCraftForm} inputClass={inputClass} />;
      case "inline_booking":
        return <InlineForm inlineForm={inlineForm} setInlineField={setInlineField} inputClass={inputClass} />;
      case "flight_search":
        return <FlightForm flightForm={flightForm} setFlightField={setFlightField} inputClass={inputClass} />;
      default:
        return (
          <p className="text-xs text-slate-500 dark:text-slate-500 italic">
            此任務類型（{task?.taskType || "未知"}）尚無對應的編輯表單。
          </p>
        );
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl border-l border-slate-300 dark:border-slate-800/80 bg-card dark:bg-background text-slate-900 dark:text-slate-200 p-8 flex flex-col h-full shadow-2xl shadow-cyan-900/10">
        <SheetHeader className="mb-2">
          <SheetTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-wide">
            編輯任務
          </SheetTitle>
          <SheetDescription className="font-mono text-sm text-slate-600 dark:text-slate-400 mt-1">
            {task?.id ? `Task ID: ${task.id}` : "No task selected"}
          </SheetDescription>
        </SheetHeader>

        <div className="grid gap-8 py-4 flex-1 overflow-y-auto pr-4 -mr-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-cyan-600/50">
          {/* 任務名稱 */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-slate-800 dark:text-slate-300 font-medium">
              任務名稱
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-white dark:bg-slate-900/50 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 focus-visible:ring-cyan-500/50"
            />
          </div>

          {/* 排程執行時間：機器人幾點要開始執行這個任務，不是訂位/訂票目標日期
              （目標日期在下面各任務類型專屬表單裡編輯，如高鐵的出發日期、餐廳的訂位日期） */}
          <div className="space-y-2">
            <Label htmlFor="date" className="text-slate-800 dark:text-slate-300 font-medium">
              排程執行時間
            </Label>
            <Input
              id="date"
              type="date"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="bg-white dark:bg-slate-900/50 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 focus-visible:ring-cyan-500/50 dark:scheme-dark"
            />
          </div>

          {/* 優先度 */}
          <div className="space-y-2">
            <Label htmlFor="priority" className="text-slate-800 dark:text-slate-300 font-medium">
              優先度
            </Label>
            <Select
              value={priority}
              onValueChange={(val) => setPriority(val as Priority)}
            >
              <SelectTrigger className="bg-white dark:bg-slate-900/50 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 focus:ring-cyan-500/50 font-mono">
                <SelectValue placeholder="選擇優先度">
                  {(v: string) =>
                    ({ HIGH: "HIGH - 高優先", MED: "MED - 中優先", LOW: "LOW - 低優先" } as Record<string, string>)[v]
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-card dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 font-mono">
                <SelectItem value="HIGH">HIGH - 高優先</SelectItem>
                <SelectItem value="MED">MED - 中優先</SelectItem>
                <SelectItem value="LOW">LOW - 低優先</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800/80 my-2"></div>

          {/* 依任務類型顯示對應的實際訂票/訂位參數 */}
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-400 tracking-wider">
              訂票 / 訂位參數
            </h3>
            {renderTypeForm()}
          </div>
        </div>

        <SheetFooter className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800/50 flex gap-4 pb-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 flex-1 py-2 text-base font-medium transition-all cursor-pointer"
          >
            取消
          </Button>
          <Button
            onClick={handleSave}
            className="bg-cyan-600 hover:bg-cyan-500 dark:bg-cyan-500 text-white dark:text-slate-950 dark:hover:bg-cyan-400 flex-1 py-2 text-base font-semibold shadow-sm dark:shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-all cursor-pointer"
          >
            儲存變更
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
