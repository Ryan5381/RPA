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
import { useWorkflowForm } from "@/hooks/useWorkflowForm";
import { getPlatformConfig, getFieldLabels } from "@/lib/workflowHelpers";

interface WorkflowConfigFormProps {
  selectedKey: string;
}

export const WorkflowConfigForm: React.FC<WorkflowConfigFormProps> = ({ selectedKey }) => {
  const { form, setField, resetForm } = useWorkflowForm();

  const platformConfig = getPlatformConfig(selectedKey);
  const { specialtyA: labelSpA, specialtyB: labelSpB, slotA: labelSlA, slotB: labelSlB } =
    getFieldLabels(selectedKey);

  const inputClass =
    "h-9 border-slate-700/80 bg-slate-950/50 text-slate-300 placeholder:text-slate-600 text-xs focus-visible:border-cyan-500/60 focus-visible:ring-cyan-500/20";

  return (
    <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-6 backdrop-blur-xl">
      {/* 標頭 */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-bold text-slate-200 tracking-wider flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
          工作流配置
          <span className="text-[10px] font-mono text-slate-500 font-normal">CONFIG</span>
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
        {/* 自動化平台 */}
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-400 font-mono">{platformConfig.label}</Label>
          <Select value={form.platform} onValueChange={(v) => setField("platform", v)}>
            <SelectTrigger className="w-full h-9 border-slate-700/80 bg-slate-950/50 text-slate-300 text-xs focus-visible:border-cyan-500/60 focus-visible:ring-cyan-500/20">
              <SelectValue placeholder="請選擇自動化平台..." />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700 text-slate-300">
              {platformConfig.platforms.map((p) => (
                <SelectItem key={p} value={p} className="text-xs focus:bg-slate-800 focus:text-slate-100">
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 身分證字號 / 姓名 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="idNumber" className="text-xs text-slate-400 font-mono">身分證字號/帳號</Label>
            <Input id="idNumber" placeholder="A123456789" value={form.idNumber}
              onChange={(e) => setField("idNumber", e.target.value)} className={inputClass} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs text-slate-400 font-mono">姓名</Label>
            <Input id="name" placeholder="王小明" value={form.name}
              onChange={(e) => setField("name", e.target.value)} className={inputClass} />
          </div>
        </div>

        {/* 密碼 */}
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs text-slate-400 font-mono">密碼</Label>
          <Input id="password" type="password" placeholder="••••••••" value={form.password}
            onChange={(e) => setField("password", e.target.value)} className={inputClass} />
        </div>

        {/* 動態欄位 A (specialty) */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="specialtyA" className="text-xs text-slate-400 font-mono">{labelSpA}</Label>
            <Input id="specialtyA" placeholder="請輸入..." value={form.specialtyA}
              onChange={(e) => setField("specialtyA", e.target.value)} className={inputClass} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="specialtyB" className="text-xs text-slate-400 font-mono">{labelSpB}</Label>
            <Input id="specialtyB" placeholder="請輸入..." value={form.specialtyB}
              onChange={(e) => setField("specialtyB", e.target.value)} className={inputClass} />
          </div>
        </div>

        {/* 動態欄位 B (slot) */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="slotA" className="text-xs text-slate-400 font-mono">{labelSlA}</Label>
            <Input id="slotA" placeholder="例：2026-08-15" value={form.slotA}
              onChange={(e) => setField("slotA", e.target.value)} className={inputClass} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slotB" className="text-xs text-slate-400 font-mono">{labelSlB}</Label>
            <Input id="slotB" placeholder="例：上午 / 09:00" value={form.slotB}
              onChange={(e) => setField("slotB", e.target.value)} className={inputClass} />
          </div>
        </div>

        {/* LINE Notify 整合 */}
        <div className="flex items-center justify-between pt-2 pb-1 border-t border-slate-800/60">
          <div>
            <p className="text-xs font-medium text-slate-300">LINE Notify 整合</p>
            <p className="text-[10px] text-slate-500 mt-0.5 font-mono">任務完成或異常時，推播通知至 LINE</p>
          </div>
          <Switch
            checked={form.lineNotify}
            onCheckedChange={(v) => setField("lineNotify", v)}
            className="data-checked:bg-cyan-500 data-unchecked:bg-slate-700"
          />
        </div>
      </div>
    </div>
  );
};
