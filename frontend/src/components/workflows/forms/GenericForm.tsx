import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GenericFormProps {
  form: any;
  setField: (key: any, value: string) => void;
  labels: {
    account?: string;
    specialtyA?: string;
    specialtyB?: string;
    slotA?: string;
    slotB?: string;
    [key: string]: string | undefined;
  };
  inputClass: string;
}

export const GenericForm: React.FC<GenericFormProps> = ({
  form,
  setField,
  labels,
  inputClass,
}) => {
  return (
    <div className="space-y-4 pt-1">
      {/* 帳務與授權 */}
      <div className="space-y-3">
        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
          認證與連線憑據
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="account" className="text-xs text-slate-400 font-mono">
            {labels.account || "帳號 / 身分識別"}
          </Label>
          <Input
            id="account"
            placeholder={`請輸入${labels.account || "帳號 / 身分識別"}`}
            value={form.account || ""}
            onChange={(e) => setField("account", e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs text-slate-400 font-mono">
            連線密碼 / 憑證授權碼
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="請輸入安全授權密碼"
            value={form.password || ""}
            onChange={(e) => setField("password", e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {/* 目標偏好設定 */}
      <div className="space-y-3 pt-2 border-t border-slate-800/60">
        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
          目標條件配置
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label
              htmlFor="specialtyA"
              className="text-xs text-slate-400 font-mono"
            >
              {labels.specialtyA}
            </Label>
            <Input
              id="specialtyA"
              placeholder="如：內科、外科或指定場館"
              value={form.specialtyA || ""}
              onChange={(e) => setField("specialtyA", e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="specialtyB"
              className="text-xs text-slate-400 font-mono"
            >
              {labels.specialtyB}
            </Label>
            <Input
              id="specialtyB"
              placeholder="如：早盤、午盤或指定樓層"
              value={form.specialtyB || ""}
              onChange={(e) => setField("specialtyB", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="slotA" className="text-xs text-slate-400 font-mono">
              {labels.slotA}
            </Label>
            <Select
              value={form.slotA || "上午診"}
              onValueChange={(v) => setField("slotA", v)}
            >
              <SelectTrigger className="w-full h-9 border-slate-700/80 bg-slate-950/50 text-slate-300 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700 text-slate-300">
                {["上午診", "下午診", "夜間診", "全天候搶位"].map((s) => (
                  <SelectItem
                    key={s}
                    value={s}
                    className="text-xs focus:bg-slate-800"
                  >
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slotB" className="text-xs text-slate-400 font-mono">
              {labels.slotB}
            </Label>
            <Select
              value={form.slotB || "初診預約"}
              onValueChange={(v) => setField("slotB", v)}
            >
              <SelectTrigger className="w-full h-9 border-slate-700/80 bg-slate-950/50 text-slate-300 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700 text-slate-300">
                {["初診預約", "複診掛號", "急件代搶", "VIP 專區"].map((s) => (
                  <SelectItem
                    key={s}
                    value={s}
                    className="text-xs focus:bg-slate-800"
                  >
                    {s}
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
