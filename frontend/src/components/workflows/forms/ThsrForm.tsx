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

  const setThsrField = (field: keyof typeof thsrForm, value: string) => {
    setThsrForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-4 pt-1">
      {/* 模式宣告提示條 */}
      <div className="bg-indigo-950/30 border border-indigo-800/40 rounded-lg p-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-indigo-300 font-mono">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            SINGLE-WAY
          </span>
          單程自動訂票模式
        </div>
      </div>

      {/* 乘客資訊卡片區 */}
      <div className="space-y-3">
        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
          訂票身分與聯繫資訊
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="thsr-id" className="text-xs text-slate-400 font-mono">
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
            <Label
              htmlFor="thsr-phone"
              className="text-xs text-slate-400 font-mono"
            >
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
            <Label
              htmlFor="thsr-count"
              className="text-xs text-slate-400 font-mono"
            >
              訂票張數
            </Label>
            <Select
              value={thsrForm.count}
              onValueChange={(v) => setThsrField("count", v)}
            >
              <SelectTrigger className="w-full h-9 border-slate-700/80 bg-slate-950/50 text-slate-300 text-xs">
                <SelectValue placeholder="選擇張數" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700 text-slate-300">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"].map(
                  (n) => (
                    <SelectItem
                      key={n}
                      value={n}
                      className="text-xs focus:bg-slate-800"
                    >
                      {n} 張
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 車次與站點選定 */}
      <div className="space-y-3 pt-2 border-t border-slate-800/60">
        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
          行程與車次目標
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400 font-mono">起站</Label>
            <Select
              value={thsrForm.from}
              onValueChange={(v) => setThsrField("from", v)}
            >
              <SelectTrigger className="w-full h-9 border-slate-700/80 bg-slate-950/50 text-slate-300 text-xs">
                <SelectValue placeholder="請選擇起站" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700 text-slate-300">
                {THSR_STATIONS.map((st) => (
                  <SelectItem
                    key={st}
                    value={st}
                    className="text-xs focus:bg-slate-800"
                  >
                    {st}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400 font-mono">迄站</Label>
            <Select
              value={thsrForm.to}
              onValueChange={(v) => setThsrField("to", v)}
            >
              <SelectTrigger className="w-full h-9 border-slate-700/80 bg-slate-950/50 text-slate-300 text-xs">
                <SelectValue placeholder="請選擇迄站" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700 text-slate-300">
                {THSR_STATIONS.map((st) => (
                  <SelectItem
                    key={st}
                    value={st}
                    className="text-xs focus:bg-slate-800"
                  >
                    {st}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label
              htmlFor="thsr-date"
              className="text-xs text-slate-400 font-mono"
            >
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
            <Label className="text-xs text-slate-400 font-mono">出發時段</Label>
            <Select
              value={thsrForm.time}
              onValueChange={(v) => setThsrField("time", v)}
            >
              <SelectTrigger className="w-full h-9 border-slate-700/80 bg-slate-950/50 text-slate-300 text-xs">
                <SelectValue placeholder="請選擇出發時段" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700 text-slate-300 max-h-56">
                {THSR_TIMES.map((t) => (
                  <SelectItem
                    key={t}
                    value={t}
                    className="text-xs focus:bg-slate-800"
                  >
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
};
