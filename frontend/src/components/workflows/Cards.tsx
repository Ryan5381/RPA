import React from "react";
import { ICON_MAP } from "@/lib/icons";
import { Check } from "lucide-react";

interface CardsProps {
  selectedKey: string;
  onSelect: (key: string) => void;
}

export const Cards: React.FC<CardsProps> = ({ selectedKey, onSelect }) => {
  const items = [
    { key: "hospital", label: "醫院掛號", icon: ICON_MAP["hospital"] },
    { key: "ticket", label: "演唱會搶票", icon: ICON_MAP["ticket"] },
    { key: "utensils", label: "美食預約", icon: ICON_MAP["utensils"] },
    { key: "airplane", label: "折扣機票", icon: ICON_MAP["airplane"] },
    { key: "gym", label: "羽球場地預約", icon: ICON_MAP["gym"] },
    { key: "train", label: "高鐵訂票", icon: ICON_MAP["train"] },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-6">
      {items.map((item) => {
        const isSelected = selectedKey === item.key;
        const Icon = item.icon || ICON_MAP["hospital"];
        return (
          <div
            key={item.key}
            onClick={() => onSelect(item.key)}
            className={`relative border rounded-xl p-5 cursor-pointer flex items-center gap-4 group overflow-hidden select-none ${
              isSelected
                ? "border-cyan-500 bg-cyan-100/60 dark:bg-cyan-950/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                : "border-slate-300 dark:border-slate-800/80 bg-white dark:bg-slate-900/30 hover:border-cyan-500/60 dark:hover:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-900/50 shadow-sm dark:shadow-none"
            }`}
          >
            {/* Hover 發光背景效果 */}
            <div className="absolute inset-0 bg-linear-to-r from-cyan-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 pointer-events-none" />

            {/* 圖示外框 */}
            <div
              className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${
                isSelected
                  ? "bg-cyan-200/80 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-400 border border-cyan-400/50 dark:border-cyan-500/30"
                  : "bg-slate-100 dark:bg-slate-950/50 text-slate-700 dark:text-slate-400 group-hover:text-cyan-600 dark:group-hover:text-slate-300 border border-slate-200/80 dark:border-transparent"
              }`}
            >
              <Icon className="w-5 h-5" />
            </div>

            {/* 文字標籤 */}
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-bold tracking-wide truncate ${
                  isSelected
                    ? "text-cyan-700 dark:text-cyan-400"
                    : "text-slate-800 dark:text-slate-300 group-hover:text-cyan-600 dark:group-hover:text-slate-100"
                }`}
              >
                {item.label}
              </p>
            </div>

            {/* 選取狀態指示器 */}
            {isSelected && (
              <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-cyan-500 flex items-center justify-center shadow-[0_0_8px_rgba(6,182,212,0.6)]">
                <Check className="w-2.5 h-2.5 text-slate-950 stroke-3" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
