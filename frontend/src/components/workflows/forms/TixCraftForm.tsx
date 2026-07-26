import React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
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
    fallback_options: { target_area: string; ticket_count: string }[];
  };
  setTixCraftForm?: React.Dispatch<
    React.SetStateAction<{
      activity_url: string;
      target_date: string;
      target_area: string;
      ticket_count: string;
      storage_state: string;
      fallback_options: { target_area: string; ticket_count: string }[];
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
    value: any,
  ) => {
    setTixCraftForm((prev) => ({ ...prev, [field]: value }));
  };

  const addFallback = () => {
    setTixCraftForm((prev) => ({
      ...prev,
      fallback_options: [...prev.fallback_options, { target_area: "", ticket_count: "2" }],
    }));
  };

  const updateFallback = (index: number, field: "target_area" | "ticket_count", value: string) => {
    setTixCraftForm((prev) => {
      const newOpts = [...prev.fallback_options];
      newOpts[index] = { ...newOpts[index], [field]: value };
      return { ...prev, fallback_options: newOpts };
    });
  };

  const removeFallback = (index: number) => {
    setTixCraftForm((prev) => ({
      ...prev,
      fallback_options: prev.fallback_options.filter((_, i) => i !== index),
    }));
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
          <Label htmlFor="activity_url" className="text-xs text-slate-700 dark:text-slate-400 font-mono font-medium">
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
          <Label htmlFor="storage_state" className="text-xs text-slate-700 dark:text-slate-400 font-mono font-medium">
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

        <div className="space-y-1.5">
          <Label htmlFor="target_date" className="text-xs text-slate-700 dark:text-slate-400 font-mono font-medium">
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

        {/* 首選區域與張數 */}
        <div className="bg-slate-50 dark:bg-slate-950/50 border border-cyan-200 dark:border-cyan-900/50 rounded-lg p-3 space-y-3 relative">
          <div className="absolute top-0 left-0 bg-cyan-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-br-lg rounded-tl-lg uppercase tracking-wider">
            1st Choice (首選)
          </div>
          <div className="grid grid-cols-2 gap-3 pt-3">
            <div className="space-y-1.5">
              <Label htmlFor="target_area" className="text-xs text-slate-700 dark:text-slate-400 font-mono font-medium">
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
            <div className="space-y-1.5">
              <Label htmlFor="ticket_count" className="text-xs text-slate-700 dark:text-slate-400 font-mono font-medium">
                購票張數
              </Label>
              <Select value={tixCraftForm.ticket_count} onValueChange={(v) => setTixCraftField("ticket_count", v)}>
                <SelectTrigger className="w-full h-9 border-slate-300 dark:border-slate-700/80 bg-white dark:bg-slate-950/50 text-slate-900 dark:text-slate-300 text-xs">
                  <SelectValue>{(v: string) => `${v} 張`}</SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-card dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-300">
                  {["1", "2", "3", "4"].map((count) => (
                    <SelectItem key={count} value={count} className="text-xs focus:bg-slate-100 dark:focus:bg-slate-800">
                      {count} 張
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* 候補區域 */}
        {tixCraftForm.fallback_options.map((opt, idx) => (
          <div key={idx} className="bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-3 relative group transition-all">
            <div className="absolute top-0 left-0 bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[9px] font-bold px-2 py-0.5 rounded-br-lg rounded-tl-lg uppercase tracking-wider">
              Fallback {idx + 1} (候補區域)
            </div>
            <button
              type="button"
              onClick={() => removeFallback(idx)}
              className="absolute top-2 right-2 text-slate-400 hover:text-red-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="grid grid-cols-2 gap-3 pt-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-700 dark:text-slate-400 font-mono font-medium">
                  候補區域關鍵字
                </Label>
                <Input
                  placeholder="例：看台區"
                  value={opt.target_area}
                  onChange={(e) => updateFallback(idx, "target_area", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-700 dark:text-slate-400 font-mono font-medium">
                  張數
                </Label>
                <Select value={opt.ticket_count} onValueChange={(v) => updateFallback(idx, "ticket_count", v)}>
                  <SelectTrigger className="w-full h-9 border-slate-300 dark:border-slate-700/80 bg-white dark:bg-slate-950/50 text-slate-900 dark:text-slate-300 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-300">
                    {["1", "2", "3", "4"].map((count) => (
                      <SelectItem key={count} value={count} className="text-xs focus:bg-slate-100 dark:focus:bg-slate-800">
                        {count} 張
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        ))}

        {tixCraftForm.fallback_options.length < 3 && (
          <Button
            type="button"
            variant="outline"
            onClick={addFallback}
            className="w-full h-8 border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:border-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 text-xs font-mono font-semibold gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            新增候補區域
          </Button>
        )}

      </div>
    </div>
  );
};
