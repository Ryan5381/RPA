import { useState } from "react";
import { SlidersHorizontal, Check, ChevronDown } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/hooks/useTheme";
import { isNotificationSoundEnabled, setNotificationSoundEnabled } from "@/lib/notificationSound";

export const SystemPreferencesCard = () => {
  const [language, setLanguage] = useState("繁體中文 (Traditional Chinese)");
  const [isLangOpen, setIsLangOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [notificationSound, setNotificationSound] = useState(isNotificationSoundEnabled);

  const handleToggleNotificationSound = (checked: boolean) => {
    setNotificationSound(checked);
    setNotificationSoundEnabled(checked);
  };

  const languages = [
    "繁體中文 (Traditional Chinese)",
    "English (United States)",
    "日本語 (Japanese)",
  ];

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
          {/* 介面語言 */}
          <div className="relative">
            <label className="block text-xs text-slate-500 dark:text-slate-400 font-medium mb-1.5">
              介面語言
            </label>
            <div
              onClick={() => setIsLangOpen(!isLangOpen)}
              className="w-full bg-slate-50 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-slate-200 px-3.5 py-2.5 rounded-lg text-sm flex items-center justify-between cursor-pointer hover:border-slate-400 dark:hover:border-slate-600 transition-colors select-none"
            >
              <span>{language}</span>
              <ChevronDown
                className={`w-4 h-4 text-slate-500 dark:text-slate-400 transition-transform ${
                  isLangOpen ? "rotate-180" : ""
                }`}
              />
            </div>

            {isLangOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-20 overflow-hidden">
                {languages.map((lang) => (
                  <div
                    key={lang}
                    onClick={() => {
                      setLanguage(lang);
                      setIsLangOpen(false);
                    }}
                    className={`px-3.5 py-2 text-sm cursor-pointer transition-colors flex items-center justify-between ${
                      language === lang
                        ? "bg-cyan-50 dark:bg-cyan-950/80 text-cyan-600 dark:text-cyan-400 font-medium"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span>{lang}</span>
                    {language === lang && <Check className="w-4 h-4" />}
                  </div>
                ))}
              </div>
            )}
          </div>

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
