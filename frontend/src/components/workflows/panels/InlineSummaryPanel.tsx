import React from "react";
import { Zap, UtensilsCrossed, CalendarDays, Users, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { InlineBookingForm } from "@/types/type";
import { INLINE_RESTAURANTS } from "@/hooks/useInlineWorkflow";

const SESSION_LABEL: Record<string, string> = {
  midday: "午餐（11:30–14:00）",
  afternoon: "下午茶（14:30–17:00）",
  evening: "晚餐（17:30 起）",
};

const PURPOSE_LABEL: Record<string, string> = {
  birthday: "慶生",
  date: "約會",
  anniversary: "週年慶",
  family: "家庭用餐",
  friends: "朋友聚餐",
  business: "商務聚餐",
  "": "無指定",
};

interface InlineSummaryPanelProps {
  inlineForm: InlineBookingForm;
  handleLaunchTask: () => void;
  isLaunching: boolean;
}

export const InlineSummaryPanel: React.FC<InlineSummaryPanelProps> = ({
  inlineForm,
  handleLaunchTask,
  isLaunching,
}) => {
  const restaurant = INLINE_RESTAURANTS.find((r) => r.key === inlineForm.restaurant_key);
  const branch = restaurant?.branches.find((b) => b.key === inlineForm.branch_key);

  // 驗證必填欄位
  const isReady =
    !!inlineForm.target_date &&
    !!inlineForm.last_name &&
    !!inlineForm.phone &&
    inlineForm.phone.length >= 9;

  const rows = [
    {
      icon: <UtensilsCrossed className="w-3 h-3 text-orange-400" />,
      label: "餐廳 / 分店",
      value: branch ? `${restaurant?.name} · ${branch.name}` : "未選擇",
      color: "text-orange-300",
    },
    {
      icon: <CalendarDays className="w-3 h-3 text-cyan-400" />,
      label: "訂位日期",
      value: inlineForm.target_date || "未填寫",
      color: inlineForm.target_date ? "text-cyan-400" : "text-slate-600",
    },
    {
      icon: <Clock className="w-3 h-3 text-violet-400" />,
      label: "用餐時段",
      value: SESSION_LABEL[inlineForm.session] || inlineForm.session,
      color: "text-violet-300",
    },
    {
      icon: <Users className="w-3 h-3 text-emerald-400" />,
      label: "用餐人數",
      value: `大人 ${inlineForm.adults} 位${Number(inlineForm.kids) > 0 ? `，小孩 ${inlineForm.kids} 位` : ""}`,
      color: "text-emerald-300",
    },
    {
      icon: <User className="w-3 h-3 text-slate-400" />,
      label: "訂位人",
      value:
        inlineForm.last_name || inlineForm.first_name
          ? `${inlineForm.last_name}${inlineForm.first_name} ${inlineForm.gender}`
          : "未填寫",
      color:
        inlineForm.last_name ? "text-slate-200" : "text-slate-600",
    },
  ];

  return (
    <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-6 backdrop-blur-xl flex flex-col h-full justify-between">
      <div>
        {/* 標頭 */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-bold text-slate-200 tracking-wider flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
            任務總覽
          </h3>
          <Badge
            variant="outline"
            className="text-[10px] font-mono bg-orange-950/40 text-orange-400 border-orange-500/40 px-2"
          >
            PLAYWRIGHT ENGINE
          </Badge>
        </div>

        {/* 摘要列表 */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-4 space-y-3 font-mono text-xs mb-4">
          {rows.map((row, i) => (
            <div
              key={i}
              className={`flex justify-between items-center ${
                i < rows.length - 1 ? "pb-2.5 border-b border-slate-800/60" : ""
              }`}
            >
              <span className="text-slate-500 flex items-center gap-1.5">
                {row.icon}
                {row.label}
              </span>
              <span className={`font-bold truncate max-w-[180px] text-right ${row.color}`}>
                {row.value}
              </span>
            </div>
          ))}

          {/* 用餐目的（若有） */}
          {inlineForm.purpose && (
            <div className="flex justify-between items-center pt-1">
              <span className="text-slate-500">用餐目的</span>
              <span className="text-amber-400 font-bold">
                {PURPOSE_LABEL[inlineForm.purpose]}
              </span>
            </div>
          )}
        </div>

        {/* 流程說明 */}
        <div className="bg-orange-950/20 border border-orange-800/30 rounded-lg p-3 text-[11px] font-mono space-y-1.5">
          <div className="font-bold text-orange-200 flex items-center gap-1.5">
            🤖 半自動化流程
          </div>
          <div className="text-slate-400 leading-relaxed space-y-0.5">
            <p>① 機器人自動填表 + 通過長按挑戰</p>
            <p>② 手機收到 OTP → 在此面板輸入</p>
            <p>③ 機器人完成最後一步訂位</p>
          </div>
        </div>

        {/* 未填寫必填警示 */}
        {!isReady && (
          <div className="mt-3 bg-red-950/20 border border-red-800/30 rounded-lg p-3 text-[11px] text-red-400 font-mono">
            ⚠ 請填寫：
            {!inlineForm.target_date && " 訂位日期"}
            {!inlineForm.last_name && " 姓氏"}
            {(!inlineForm.phone || inlineForm.phone.length < 9) && " 手機號碼"}
          </div>
        )}
      </div>

      {/* 啟動按鈕 */}
      <div className="pt-4 border-t border-slate-800/60 mt-4">
        <Button
          onClick={handleLaunchTask}
          disabled={isLaunching || !isReady}
          className="w-full h-11 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:opacity-40 text-white font-bold text-sm tracking-wider border-0 cursor-pointer shadow-[0_0_20px_rgba(249,115,22,0.2)] hover:shadow-[0_0_30px_rgba(249,115,22,0.35)] transition-all duration-300 gap-2"
        >
          <Zap className="w-4 h-4" />
          {isLaunching ? "正在啟動訂位機器人..." : "啟動半自動訂位"}
        </Button>
        <p className="text-[10px] font-mono text-slate-600 text-center mt-2">
          啟動後請保持後端服務運行，手機 OTP 將由你手動輸入
        </p>
      </div>
    </div>
  );
};
