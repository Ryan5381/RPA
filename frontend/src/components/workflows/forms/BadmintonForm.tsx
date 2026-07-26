import React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { SensitiveInput } from "@/components/common/SensitiveInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BadmintonFormProps {
  badmintonForm: {
    user_id?: string;
    password?: string;
    capsolver_api_key?: string;
    target_date?: string;
    target_time_slot?: string;
    target_courts?: string;
    target_time: string;
    session_count: string;
  };
  setBadmintonField?: (
    field:
      | "user_id"
      | "password"
      | "capsolver_api_key"
      | "target_date"
      | "target_time_slot"
      | "target_courts"
      | "target_time"
      | "session_count",
    value: string,
  ) => void;
  inputClass: string;
}

export const BadmintonForm: React.FC<BadmintonFormProps> = ({
  badmintonForm,
  setBadmintonField,
  inputClass,
}) => {
  if (!setBadmintonField) return null;

  return (
    <div className="space-y-4 pt-1">
      {/* 帳密設定 */}
      <div className="space-y-3">
        <p className="text-[10px] font-mono font-semibold text-slate-600 dark:text-slate-500 uppercase tracking-widest">
          會員資料
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-700 dark:text-slate-400 font-mono font-medium">
              身分證字號 / 會員帳號
            </Label>
            <SensitiveInput
              placeholder="請輸入會員帳號/身分證字號"
              value={badmintonForm.user_id}
              onChange={(e) => setBadmintonField("user_id", e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-700 dark:text-slate-400 font-mono font-medium">密碼</Label>
            <Input
              type="password"
              placeholder="請輸入密碼"
              value={badmintonForm.password}
              onChange={(e) => setBadmintonField("password", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-700 dark:text-slate-400 font-mono font-medium">
            CapSolver API Key (自動驗證碼通關)
          </Label>
          <Input
            type="password"
            placeholder="留白將自動讀取後端 .env"
            value={badmintonForm.capsolver_api_key}
            onChange={(e) =>
              setBadmintonField("capsolver_api_key", e.target.value)
            }
            className={inputClass}
          />
        </div>
      </div>

      {/* 預訂目標設定 (日期/時間/球場順位) */}
      <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800/60">
        <p className="text-[10px] font-mono font-semibold text-slate-600 dark:text-slate-500 uppercase tracking-widest">
          預定目標與順位設定
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-700 dark:text-slate-400 font-mono font-medium">預訂日期</Label>
            <DatePicker
              selected={(() => {
                const str = badmintonForm.target_date || "2026-07-14";
                const d = new Date(str.replace(/-/g, "/"));
                return isNaN(d.getTime()) ? null : d;
              })()}
              onChange={(date: Date | null) => {
                if (date) {
                  const yyyy = date.getFullYear();
                  const mm = String(date.getMonth() + 1).padStart(2, "0");
                  const dd = String(date.getDate()).padStart(2, "0");
                  setBadmintonField("target_date", `${yyyy}-${mm}-${dd}`);
                }
              }}
              dateFormat="yyyy-MM-dd"
              wrapperClassName="w-full block"
              className={`${inputClass} w-full`}
              placeholderText="點選預訂日期"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-700 dark:text-slate-400 font-mono font-medium">預訂時段</Label>
            <Input
              placeholder="如 13 (表示 13:00) 或 18"
              value={badmintonForm.target_time_slot || "13"}
              onChange={(e) =>
                setBadmintonField("target_time_slot", e.target.value)
              }
              className={inputClass}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-700 dark:text-slate-400 font-mono font-medium flex items-center justify-between">
            <span>優先球場順位 (以逗號隔開)</span>
            <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-normal">
              自動順位接力
            </span>
          </Label>
          <Input
            placeholder="羽6,羽8,羽9 或 AUTO"
            value={badmintonForm.target_courts || "羽6,羽8,羽9"}
            onChange={(e) => setBadmintonField("target_courts", e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {/* 搶票時機與並行 Session 設定 */}
      <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800/60">
        <p className="text-[10px] font-mono font-semibold text-slate-600 dark:text-slate-500 uppercase tracking-widest">
          發動時機與多線程並行
        </p>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-700 dark:text-slate-400 font-mono font-medium flex items-center gap-1.5">
              發動搶票日期與時間
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono bg-cyan-100 dark:bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border border-cyan-400/60 dark:border-cyan-500/30">
                SCHEDULE
              </span>
            </Label>
            <DatePicker
              selected={(() => {
                if (!badmintonForm.target_time) return null;
                const d = new Date(
                  badmintonForm.target_time.replace(/-/g, "/"),
                );
                return isNaN(d.getTime()) ? null : d;
              })()}
              onChange={(date: Date | null) => {
                if (!date) {
                  setBadmintonField("target_time", "");
                  return;
                }
                const yyyy = date.getFullYear();
                const mm = String(date.getMonth() + 1).padStart(2, "0");
                const dd = String(date.getDate()).padStart(2, "0");
                const hh = String(date.getHours()).padStart(2, "0");
                const min = String(date.getMinutes()).padStart(2, "0");
                const ss = String(date.getSeconds()).padStart(2, "0");
                setBadmintonField(
                  "target_time",
                  `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`,
                );
              }}
              showTimeSelect
              timeFormat="HH:mm:ss"
              timeIntervals={15}
              dateFormat="yyyy-MM-dd HH:mm:ss"
              wrapperClassName="w-full block"
              className={`${inputClass} w-full`}
              placeholderText="點選開搶日期與時間 (留白即立刻秒殺)"
              isClearable
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-700 dark:text-slate-400 font-mono font-medium flex items-center gap-1.5">
              並行 Session 數
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-400 border border-violet-400/60 dark:border-violet-500/30">
                MULTI
              </span>
            </Label>
            <Select
              value={badmintonForm.session_count}
              onValueChange={(v) => setBadmintonField("session_count", v)}
            >
              <SelectTrigger className="w-full h-9 border-slate-300 dark:border-slate-700/80 bg-white dark:bg-slate-950/50 text-slate-900 dark:text-slate-200 text-xs">
                <SelectValue>
                  {(v: string) => `${v} 個 Session${v === "1" ? "（單線）" : v === "2" ? "（推薦）" : ""}`}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-card dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200">
                {["1", "2", "3", "4", "5"].map((n) => (
                  <SelectItem
                    key={n}
                    value={n}
                    className="text-xs focus:bg-slate-100 dark:focus:bg-slate-800"
                  >
                    {n} 個 Session
                    {n === "1" ? "（單線）" : n === "2" ? "（推薦）" : ""}
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
