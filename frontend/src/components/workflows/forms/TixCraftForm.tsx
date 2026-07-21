import React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Ticket, ShieldCheck, Zap } from "lucide-react";

interface TixCraftFormProps {
  tixCraftForm: {
    activity_url: string;
    target_date: string;
    target_area: string;
    ticket_count: string;
    storage_state: string;
  };
  setTixCraftForm?: React.Dispatch<
    React.SetStateAction<{
      activity_url: string;
      target_date: string;
      target_area: string;
      ticket_count: string;
      storage_state: string;
    }>
  >;
  inputClass: string;
}

export const TixCraftForm: React.FC<TixCraftFormProps> = ({
  tixCraftForm,
  setTixCraftForm,
  inputClass,
}) => {
  if (!setTixCraftForm) return null;

  const setTixCraftField = (
    field: keyof typeof tixCraftForm,
    value: string,
  ) => {
    setTixCraftForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-4 pt-1">
      {/* 演唱會活動網址與認證 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-mono font-semibold text-slate-600 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
            <Ticket className="w-3 h-3 text-cyan-500 dark:text-cyan-400" />
            活動連結與登入憑證
          </p>
          <span className="text-[10px] text-cyan-700 dark:text-cyan-400/90 font-mono flex items-center gap-1 bg-cyan-100 dark:bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-400/60 dark:border-cyan-500/20 font-medium">
            <ShieldCheck className="w-3 h-3" />
            防封鎖與指紋抹除啟用
          </span>
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="activity_url"
            className="text-xs text-slate-700 dark:text-slate-400 font-mono font-medium"
          >
            拓元場次表直達網址 (/activity/game/...)
          </Label>
          <Input
            id="activity_url"
            placeholder="例如: https://tixcraft.com/activity/game/26_example"
            value={tixCraftForm.activity_url}
            onChange={(e) => setTixCraftField("activity_url", e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="storage_state"
            className="text-xs text-slate-700 dark:text-slate-400 font-mono font-medium"
          >
            會員憑證路徑 (Google / FB 登入 Cookie 保存位置)
          </Label>
          <Input
            id="storage_state"
            placeholder="auth/tixcraft_state.json"
            value={tixCraftForm.storage_state}
            onChange={(e) => setTixCraftField("storage_state", e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {/* 搶票目標條件配置 */}
      <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800/60">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-mono font-semibold text-slate-600 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-amber-500 dark:text-amber-400" />
            搶票策略與驗證碼 OCR
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label
              htmlFor="target_date"
              className="text-xs text-slate-700 dark:text-slate-400 font-mono font-medium"
            >
              場次日期 (年/月/日)
            </Label>
            <DatePicker
              selected={(() => {
                if (!tixCraftForm.target_date) return null;
                const d = new Date(tixCraftForm.target_date.replace(/-/g, "/"));
                return isNaN(d.getTime()) ? null : d;
              })()}
              onChange={(date: Date | null) => {
                if (date) {
                  const yyyy = date.getFullYear();
                  const mm = String(date.getMonth() + 1).padStart(2, "0");
                  const dd = String(date.getDate()).padStart(2, "0");
                  setTixCraftField("target_date", `${yyyy}/${mm}/${dd}`);
                } else {
                  setTixCraftField("target_date", "");
                }
              }}
              dateFormat="yyyy/MM/dd"
              wrapperClassName="w-full block"
              className={`${inputClass} w-full`}
              placeholderText="留空為最快開放場次"
              isClearable
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="target_area"
              className="text-xs text-slate-700 dark:text-slate-400 font-mono font-medium"
            >
              區域比對關鍵字
            </Label>
            <Input
              id="target_area"
              placeholder="例：特區、搖滾區、800"
              value={tixCraftForm.target_area}
              onChange={(e) => setTixCraftField("target_area", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label
              htmlFor="ticket_count"
              className="text-xs text-slate-700 dark:text-slate-400 font-mono font-medium"
            >
              購票張數
            </Label>
            <Select
              value={tixCraftForm.ticket_count}
              onValueChange={(v) => setTixCraftField("ticket_count", v)}
            >
              <SelectTrigger className="w-full h-9 border-slate-300 dark:border-slate-700/80 bg-white dark:bg-slate-950/50 text-slate-900 dark:text-slate-300 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-300">
                {["1", "2", "3", "4"].map((count) => (
                  <SelectItem
                    key={count}
                    value={count}
                    className="text-xs focus:bg-slate-100 dark:focus:bg-slate-800"
                  >
                    {count} 張
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-700 dark:text-slate-400 font-mono font-medium">
              自動辨識與勾選
            </Label>
            <div className="flex items-center h-9 px-3 rounded-md border border-slate-300 dark:border-slate-700/80 bg-emerald-50 dark:bg-slate-950/30 text-xs text-emerald-700 dark:text-emerald-400 font-mono font-medium">
              OCR 驗證碼辨識 + 自動同意條款
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
