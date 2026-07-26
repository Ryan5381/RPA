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
import { THSR_STATIONS, THSR_TIMES } from "@/lib/constants/thsrColumns";

interface ThsrFormProps {
  thsrForm: {
    from: string;
    to: string;
    date: string;
    time: string;
    count: string;
    user_id: string;
    user_phone: string;
    fallback_options: { date: string; time: string }[];
  };
  setThsrForm?: React.Dispatch<
    React.SetStateAction<{
      from: string;
      to: string;
      date: string;
      time: string;
      count: string;
      user_id: string;
      user_phone: string;
      fallback_options: { date: string; time: string }[];
    }>
  >;
  inputClass: string;
}

export const ThsrForm: React.FC<ThsrFormProps> = ({
  thsrForm,
  setThsrForm,
  inputClass,
}) => {
  if (!setThsrForm) return null;

  const setThsrField = (field: keyof typeof thsrForm, value: any) => {
    setThsrForm((prev) => ({ ...prev, [field]: value }));
  };

  const addFallback = () => {
    setThsrForm((prev) => ({
      ...prev,
      fallback_options: [...prev.fallback_options, { date: "", time: "11:00" }],
    }));
  };

  const updateFallback = (index: number, field: "date" | "time", value: string) => {
    setThsrForm((prev) => {
      const newOpts = [...prev.fallback_options];
      newOpts[index] = { ...newOpts[index], [field]: value };
      return { ...prev, fallback_options: newOpts };
    });
  };

  const removeFallback = (index: number) => {
    setThsrForm((prev) => ({
      ...prev,
      fallback_options: prev.fallback_options.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="space-y-4 pt-1">
      {/* 模式宣告提示條 */}
      <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-300 dark:border-indigo-800/40 rounded-lg p-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-300 font-mono font-medium">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border border-indigo-400/60 dark:border-indigo-500/30 font-bold">
            SMART BOOKING
          </span>
          高鐵自動訂票與多班次候補模式
        </div>
      </div>

      {/* 乘客資訊卡片區 */}
      <div className="space-y-3">
        <p className="text-[10px] font-mono font-semibold text-slate-600 dark:text-slate-500 uppercase tracking-widest">
          訂票身分與聯繫資訊
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="thsr-id" className="text-xs text-slate-700 dark:text-slate-400 font-mono font-medium">
            身分證字號 / 護照號碼
          </Label>
          <Input
            id="thsr-id"
            placeholder="如 A123456789 (訂票查詢必填)"
            value={thsrForm.user_id}
            onChange={(e) => setThsrField("user_id", e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="thsr-phone" className="text-xs text-slate-700 dark:text-slate-400 font-mono font-medium">
              手機號碼
            </Label>
            <Input
              id="thsr-phone"
              placeholder="如 0912345678"
              value={thsrForm.user_phone}
              onChange={(e) => setThsrField("user_phone", e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="thsr-count" className="text-xs text-slate-700 dark:text-slate-400 font-mono font-medium">
              訂票張數
            </Label>
            <Select value={thsrForm.count} onValueChange={(v) => setThsrField("count", v)}>
              <SelectTrigger className="w-full h-9 border-slate-300 dark:border-slate-700/80 bg-white dark:bg-slate-950/50 text-slate-900 dark:text-slate-300 text-xs">
                <SelectValue placeholder="選擇張數">
                  {(v: string) => `${v} 張`}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-card dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-300">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"].map((n) => (
                  <SelectItem key={n} value={n} className="text-xs focus:bg-slate-100 dark:focus:bg-slate-800">
                    {n} 張
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 車次與站點選定 */}
      <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800/60">
        <p className="text-[10px] font-mono font-semibold text-slate-600 dark:text-slate-500 uppercase tracking-widest">
          行程與車次目標
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-700 dark:text-slate-400 font-mono font-medium">起站</Label>
            <Select value={thsrForm.from} onValueChange={(v) => setThsrField("from", v)}>
              <SelectTrigger className="w-full h-9 border-slate-300 dark:border-slate-700/80 bg-white dark:bg-slate-950/50 text-slate-900 dark:text-slate-300 text-xs">
                <SelectValue placeholder="請選擇起站" />
              </SelectTrigger>
              <SelectContent className="bg-card dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-300">
                {THSR_STATIONS.map((st) => (
                  <SelectItem key={st} value={st} className="text-xs focus:bg-slate-100 dark:focus:bg-slate-800">
                    {st}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-700 dark:text-slate-400 font-mono font-medium">迄站</Label>
            <Select value={thsrForm.to} onValueChange={(v) => setThsrField("to", v)}>
              <SelectTrigger className="w-full h-9 border-slate-300 dark:border-slate-700/80 bg-white dark:bg-slate-950/50 text-slate-900 dark:text-slate-300 text-xs">
                <SelectValue placeholder="請選擇迄站" />
              </SelectTrigger>
              <SelectContent className="bg-card dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-300">
                {THSR_STATIONS.map((st) => (
                  <SelectItem key={st} value={st} className="text-xs focus:bg-slate-100 dark:focus:bg-slate-800">
                    {st}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 首選時間 */}
        <div className="bg-slate-50 dark:bg-slate-950/50 border border-indigo-200 dark:border-indigo-900/50 rounded-lg p-3 space-y-3 relative">
          <div className="absolute top-0 left-0 bg-indigo-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-br-lg rounded-tl-lg uppercase tracking-wider">
            1st Choice (首選)
          </div>
          <div className="grid grid-cols-2 gap-3 pt-3">
            <div className="space-y-1.5">
              <Label htmlFor="thsr-date" className="text-xs text-slate-700 dark:text-slate-400 font-mono font-medium">
                出發日期
              </Label>
              <DatePicker
                selected={(() => {
                  if (!thsrForm.date) return null;
                  const d = new Date(thsrForm.date.replace(/-/g, "/"));
                  return isNaN(d.getTime()) ? null : d;
                })()}
                onChange={(date: Date | null) => {
                  if (date) {
                    const yyyy = date.getFullYear();
                    const mm = String(date.getMonth() + 1).padStart(2, "0");
                    const dd = String(date.getDate()).padStart(2, "0");
                    setThsrField("date", `${yyyy}/${mm}/${dd}`);
                  } else {
                    setThsrField("date", "");
                  }
                }}
                dateFormat="yyyy/MM/dd"
                wrapperClassName="w-full block"
                className={`${inputClass} w-full`}
                minDate={new Date()}
                placeholderText={new Date().toISOString().substring(0, 10)}
                isClearable
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-700 dark:text-slate-400 font-mono font-medium">出發時段</Label>
              <Select value={thsrForm.time} onValueChange={(v) => setThsrField("time", v)}>
                <SelectTrigger className="w-full h-9 border-slate-300 dark:border-slate-700/80 bg-white dark:bg-slate-950/50 text-slate-900 dark:text-slate-300 text-xs">
                  <SelectValue placeholder="請選擇出發時段" />
                </SelectTrigger>
                <SelectContent className="bg-card dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-300 max-h-56">
                  {THSR_TIMES.map((t) => (
                    <SelectItem key={t} value={t} className="text-xs focus:bg-slate-100 dark:focus:bg-slate-800">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* 候補時段 */}
        {thsrForm.fallback_options.map((opt, idx) => (
          <div key={idx} className="bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-3 relative group transition-all">
            <div className="absolute top-0 left-0 bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[9px] font-bold px-2 py-0.5 rounded-br-lg rounded-tl-lg uppercase tracking-wider">
              Fallback {idx + 1} (候補車次)
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
                  候補日期
                </Label>
                <DatePicker
                  selected={(() => {
                    if (!opt.date) return null;
                    const d = new Date(opt.date.replace(/-/g, "/"));
                    return isNaN(d.getTime()) ? null : d;
                  })()}
                  onChange={(date: Date | null) => {
                    if (date) {
                      const yyyy = date.getFullYear();
                      const mm = String(date.getMonth() + 1).padStart(2, "0");
                      const dd = String(date.getDate()).padStart(2, "0");
                      updateFallback(idx, "date", `${yyyy}/${mm}/${dd}`);
                    } else {
                      updateFallback(idx, "date", "");
                    }
                  }}
                  dateFormat="yyyy/MM/dd"
                  wrapperClassName="w-full block"
                  className={`${inputClass} w-full`}
                  placeholderText="留空則同首選日期"
                  minDate={new Date()}
                  isClearable
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-700 dark:text-slate-400 font-mono font-medium">
                  候補時段
                </Label>
                <Select value={opt.time} onValueChange={(v) => updateFallback(idx, "time", v)}>
                  <SelectTrigger className="w-full h-9 border-slate-300 dark:border-slate-700/80 bg-white dark:bg-slate-950/50 text-slate-900 dark:text-slate-300 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-300 max-h-56">
                    {THSR_TIMES.map((t) => (
                      <SelectItem key={t} value={t} className="text-xs focus:bg-slate-100 dark:focus:bg-slate-800">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        ))}

        {thsrForm.fallback_options.length < 3 && (
          <Button
            type="button"
            variant="outline"
            onClick={addFallback}
            className="w-full h-8 border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-xs font-mono font-semibold gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            新增候補時段
          </Button>
        )}

      </div>
    </div>
  );
};
