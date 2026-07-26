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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { QueueTask } from "@/types/type";
import type { Priority } from "@/lib/queueHelpers";

interface QueueEditSheetProps {
  isOpen: boolean;
  onClose: () => void;
  task: QueueTask | null;
  onSave: (task: QueueTask) => void;
}

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

  // 進階設定
  const [target, setTarget] = useState(task?.config?.target || "");
  const [account, setAccount] = useState(task?.config?.account || "");
  const [notify, setNotify] = useState(task?.config?.notify || false);

  // 當傳入的 task 改變時（切換編輯對象），在 render 階段直接重置 state
  // 這是 React 官方推薦取代 useEffect 同步 setState 的做法，可避免多餘的 cascading render
  if (task?.id !== prevTaskId) {
    setPrevTaskId(task?.id);
    setName(task?.name || "");
    setScheduledAt(task?.scheduledAt || "");
    setPriority(task?.priority || "LOW");
    setTarget(task?.config?.target || "");
    setAccount(task?.config?.account || "");
    setNotify(task?.config?.notify || false);
  }

  const handleSave = () => {
    if (task) {
      onSave({
        ...task,
        name,
        scheduledAt,
        priority,
        config: {
          target,
          account,
          notify,
        },
      });
      onClose();
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

          {/* 預約日期 */}
          <div className="space-y-2">
            <Label htmlFor="date" className="text-slate-800 dark:text-slate-300 font-medium">
              預約日期
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

          {/* 進階設定區塊 */}
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-400 tracking-wider">
              進階執行參數
            </h3>

            <div className="space-y-2">
              <Label htmlFor="target" className="text-slate-800 dark:text-slate-300 text-xs">
                目標對象 (Target)
              </Label>
              <Input
                id="target"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="bg-white dark:bg-slate-900/50 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 focus-visible:ring-cyan-500/50 text-sm font-mono h-9"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account" className="text-slate-800 dark:text-slate-300 text-xs">
                執行帳號 (Account)
              </Label>
              <Input
                id="account"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className="bg-white dark:bg-slate-900/50 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 focus-visible:ring-cyan-500/50 text-sm font-mono h-9"
              />
            </div>

            <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-900/30 p-3 rounded-lg border border-slate-200 dark:border-slate-800/50">
              <div className="space-y-0.5">
                <Label
                  htmlFor="notify"
                  className="text-slate-900 dark:text-slate-300 text-sm cursor-pointer"
                >
                  任務通知 (LINE Notify)
                </Label>
                <p className="text-xs text-slate-600 dark:text-slate-500">
                  當任務完成或失敗時傳送通知
                </p>
              </div>
              <Switch
                id="notify"
                checked={notify}
                onCheckedChange={setNotify}
                className="data-[state=checked]:bg-cyan-500 cursor-pointer"
              />
            </div>
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
