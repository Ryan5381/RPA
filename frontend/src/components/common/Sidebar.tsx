import {
  LayoutGrid,
  GitFork,
  ListOrdered,
  Terminal,
  Settings,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// 定義選單項目
const menuItems = [
  { id: "dashboard", label: "控制台", icon: LayoutGrid },
  { id: "workflows", label: "工作流", icon: GitFork },
  { id: "queue", label: "優先序列", icon: ListOrdered },
  { id: "logs", label: "日誌終端", icon: Terminal },
  { id: "settings", label: "設定", icon: Settings },
];

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar = ({ activeTab, setActiveTab }: SidebarProps) => {
  return (
    <aside className="w-64 border-r border-dashed border-border bg-background flex flex-col h-screen p-4 text-foreground">
      {/* 系統標題與版本 */}
      <div className="mb-6 px-2">
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground font-mono">
            v4.2.0
          </span>
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono uppercase tracking-widest font-semibold">
            Active
          </span>
        </div>
      </div>

      {/* 新任務按鈕 */}
      <Button
        className="w-full justify-center gap-2 mb-6 bg-cyan-100 dark:bg-cyan-100 hover:bg-cyan-200 text-slate-900 font-semibold border border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all cursor-pointer"
        onClick={() => setActiveTab("workflows")}
      >
        <Plus className="w-4 h-4" />
        <span>新任務</span>
      </Button>

      {/* 導覽選單 */}
      <nav className="flex-1 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-all duration-200 relative group cursor-pointer",
                isActive
                  ? "bg-cyan-500 dark:bg-cyan-400 text-white dark:text-slate-950 font-semibold shadow-[0_0_15px_rgba(34,211,238,0.3)]"
                  : "text-muted-foreground hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-secondary/60 dark:hover:bg-slate-900/50",
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4",
                  isActive
                    ? "text-white dark:text-slate-950"
                    : "text-muted-foreground group-hover:text-cyan-600 dark:group-hover:text-cyan-400",
                )}
              />
              <span>{item.label}</span>

              {!isActive && (
                <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-cyan-500 dark:bg-cyan-400 scale-y-0 group-hover:scale-y-100 transition-transform origin-center" />
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
