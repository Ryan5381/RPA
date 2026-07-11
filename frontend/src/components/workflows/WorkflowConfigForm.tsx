import React from "react";
import { RotateCcw, Save } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getPlatformConfig, getFieldLabels } from "@/lib/workflowHelpers";

interface WorkflowConfigFormProps {
  selectedKey: string;
  form: any;
  setField: (field: string, value: any) => void;
  resetForm: () => void;
  thsrForm: {
    from: string;
    to: string;
    date: string;
    time: string;
    count: string;
    user_id: string;
    user_phone: string;
  };
  setThsrForm: React.Dispatch<
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
}

import { THSR_STATIONS, THSR_TIMES } from "@/lib/constants/thsrColumns";

const isTrain = (key: string) => key === "train";

export const WorkflowConfigForm: React.FC<WorkflowConfigFormProps> = ({
  selectedKey,
  form,
  setField,
  resetForm,
  thsrForm,
  setThsrForm,
}) => {
  const setThsrField = (field: keyof typeof thsrForm, value: string) =>
    setThsrForm((prev) => ({ ...prev, [field]: value }));

  const platformConfig = getPlatformConfig(selectedKey);
  const {
    specialtyA: labelSpA,
    specialtyB: labelSpB,
    slotA: labelSlA,
    slotB: labelSlB,
  } = getFieldLabels(selectedKey);

  const inputClass =
    "h-9 border-slate-700/80 bg-slate-950/50 text-slate-300 placeholder:text-slate-600 text-xs focus-visible:border-cyan-500/60 focus-visible:ring-cyan-500/20";

  return (
    <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-6 backdrop-blur-xl">
      {/* 標頭 */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-bold text-slate-200 tracking-wider flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
          工作流配置
          <span className="text-[10px] font-mono text-slate-500 font-normal">
            CONFIG
          </span>
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={resetForm}
            className="h-7 px-2.5 text-xs border-slate-700/80 text-slate-400 hover:text-slate-200 hover:border-slate-600 bg-transparent cursor-pointer gap-1.5"
          >
            <RotateCcw className="w-3 h-3" />
            重置
          </Button>
          <Button
            size="sm"
            className="h-7 px-2.5 text-xs bg-cyan-600/80 hover:bg-cyan-500 text-white border-0 cursor-pointer gap-1.5"
          >
            <Save className="w-3 h-3" />
            儲存草稿
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {/* ─── 高鐵訂票專屬表單 ─── */}
        {isTrain(selectedKey) ? (
          <>
            {/* 出發站 / 到達站 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400 font-mono">
                  出發站
                </Label>
                <Select
                  value={thsrForm.from}
                  onValueChange={(v) => setThsrField("from", v)}
                >
                  <SelectTrigger className="w-full h-9 border-slate-700/80 bg-slate-950/50 text-slate-300 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-slate-300">
                    {THSR_STATIONS.map((s) => (
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
                <Label className="text-xs text-slate-400 font-mono">
                  到達站
                </Label>
                <Select
                  value={thsrForm.to}
                  onValueChange={(v) => setThsrField("to", v)}
                >
                  <SelectTrigger className="w-full h-9 border-slate-700/80 bg-slate-950/50 text-slate-300 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-slate-300">
                    {THSR_STATIONS.map((s) => (
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

            {/* 出發日期 / 出發時間 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="thsr-date"
                  className="text-xs text-slate-400 font-mono"
                >
                  出發日期
                </Label>
                <Input
                  id="thsr-date"
                  placeholder="YYYY/MM/DD（留空自動填5天後）"
                  value={thsrForm.date}
                  onChange={(e) => setThsrField("date", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400 font-mono">
                  出發時間
                </Label>
                <Select
                  value={thsrForm.time}
                  onValueChange={(v) => setThsrField("time", v)}
                >
                  <SelectTrigger className="w-full h-9 border-slate-700/80 bg-slate-950/50 text-slate-300 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-slate-300">
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

            {/* 全票張數 */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400 font-mono">
                全票張數
              </Label>
              <Select
                value={thsrForm.count}
                onValueChange={(v) => setThsrField("count", v)}
              >
                <SelectTrigger className="w-full h-9 border-slate-700/80 bg-slate-950/50 text-slate-300 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-slate-300">
                  {["1", "2", "3", "4", "5"].map((n) => (
                    <SelectItem
                      key={n}
                      value={n}
                      className="text-xs focus:bg-slate-800"
                    >
                      {n} 張
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 身分證 / 手機 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="thsr-id"
                  className="text-xs text-slate-400 font-mono"
                >
                  取票人身分證字號
                </Label>
                <Input
                  id="thsr-id"
                  placeholder="A123456789"
                  value={thsrForm.user_id}
                  onChange={(e) => setThsrField("user_id", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="thsr-phone"
                  className="text-xs text-slate-400 font-mono"
                >
                  手機號碼
                </Label>
                <Input
                  id="thsr-phone"
                  placeholder="0912345678"
                  value={thsrForm.user_phone}
                  onChange={(e) => setThsrField("user_phone", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            {/* LINE Notify 整合 */}
            <div className="flex items-center justify-between pt-2 pb-1 border-t border-slate-800/60">
              <div>
                <p className="text-xs font-medium text-slate-300">
                  LINE Notify 整合
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                  任務完成或異常時，推播通知至 LINE
                </p>
              </div>
              <Switch
                checked={form.lineNotify}
                onCheckedChange={(v) => setField("lineNotify", v)}
                className="data-checked:bg-cyan-500 data-unchecked:bg-slate-700"
              />
            </div>
          </>
        ) : (
          /* ─── 其他類型的通用表單 ─── */
          <>
            {/* 自動化平台 */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400 font-mono">
                {platformConfig.label}
              </Label>
              <Select
                value={form.platform}
                onValueChange={(v) => setField("platform", v)}
              >
                <SelectTrigger className="w-full h-9 border-slate-700/80 bg-slate-950/50 text-slate-300 text-xs focus-visible:border-cyan-500/60 focus-visible:ring-cyan-500/20">
                  <SelectValue placeholder="請選擇自動化平台..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-slate-300">
                  {platformConfig.platforms.map((p) => (
                    <SelectItem
                      key={p}
                      value={p}
                      className="text-xs focus:bg-slate-800 focus:text-slate-100"
                    >
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 身分證字號 / 姓名 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="idNumber"
                  className="text-xs text-slate-400 font-mono"
                >
                  身分證字號/帳號
                </Label>
                <Input
                  id="idNumber"
                  placeholder="A123456789"
                  value={form.idNumber}
                  onChange={(e) => setField("idNumber", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="name"
                  className="text-xs text-slate-400 font-mono"
                >
                  姓名
                </Label>
                <Input
                  id="name"
                  placeholder="王小明"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            {/* 密碼 */}
            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-xs text-slate-400 font-mono"
              >
                密碼
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setField("password", e.target.value)}
                className={inputClass}
              />
            </div>

            {/* 動態欄位 A */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="specialtyA"
                  className="text-xs text-slate-400 font-mono"
                >
                  {labelSpA}
                </Label>
                <Input
                  id="specialtyA"
                  placeholder="請輸入..."
                  value={form.specialtyA}
                  onChange={(e) => setField("specialtyA", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="specialtyB"
                  className="text-xs text-slate-400 font-mono"
                >
                  {labelSpB}
                </Label>
                <Input
                  id="specialtyB"
                  placeholder="請輸入..."
                  value={form.specialtyB}
                  onChange={(e) => setField("specialtyB", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            {/* 動態欄位 B */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="slotA"
                  className="text-xs text-slate-400 font-mono"
                >
                  {labelSlA}
                </Label>
                <Input
                  id="slotA"
                  placeholder="例：2026-08-15"
                  value={form.slotA}
                  onChange={(e) => setField("slotA", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="slotB"
                  className="text-xs text-slate-400 font-mono"
                >
                  {labelSlB}
                </Label>
                <Input
                  id="slotB"
                  placeholder="例：上午 / 09:00"
                  value={form.slotB}
                  onChange={(e) => setField("slotB", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            {/* LINE Notify 整合 */}
            <div className="flex items-center justify-between pt-2 pb-1 border-t border-slate-800/60">
              <div>
                <p className="text-xs font-medium text-slate-300">
                  LINE Notify 整合
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                  任務完成或異常時，推播通知至 LINE
                </p>
              </div>
              <Switch
                checked={form.lineNotify}
                onCheckedChange={(v) => setField("lineNotify", v)}
                className="data-checked:bg-cyan-500 data-unchecked:bg-slate-700"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
