import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/hooks/useTheme";
import { isNotificationSoundEnabled, setNotificationSoundEnabled } from "@/lib/notificationSound";

export const SystemPreferencesCard = () => {
  const { theme, setTheme } = useTheme();
  const [notificationSound, setNotificationSound] = useState(isNotificationSoundEnabled);

  const handleToggleNotificationSound = (checked: boolean) => {
    setNotificationSound(checked);
    setNotificationSoundEnabled(checked);
  };

  return (
    <div className="border border-slate-200 dark:border-slate-800/80 bg-card/80 dark:bg-background/40 hover:border-cyan-500/40 rounded-xl p-6 relative overflow-hidden shadow-md dark:shadow-lg flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-950/60 border border-cyan-400/60 dark:border-cyan-800/50 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.15)]">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-200 tracking-wide">
            系統偏好
          </h2>
        </div>

        <div className="space-y-5">
          {/* 深色模式 */}
          <div className="flex items-center justify-between pt-1">
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-slate-200">深色模式</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                切換深色與淺色視覺風格
              </div>
            </div>
            <Switch
              checked={theme === "dark"}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              className="data-[state=checked]:bg-cyan-500 dark:data-[state=checked]:bg-cyan-400"
            />
          </div>

          {/* 通知音效 */}
          <div className="flex items-center justify-between pt-1">
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-slate-200">通知音效</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                任務狀態變更提示音
              </div>
            </div>
            <Switch
              checked={notificationSound}
              onCheckedChange={handleToggleNotificationSound}
              className="data-[state=checked]:bg-cyan-500 dark:data-[state=checked]:bg-cyan-400"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
