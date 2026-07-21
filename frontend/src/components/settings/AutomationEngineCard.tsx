import { useState } from "react";
import { Cpu } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export const AutomationEngineCard = () => {
  const [maxRetries, setMaxRetries] = useState("3");
  const [retryInterval, setRetryInterval] = useState("15");
  const [headlessMode, setHeadlessMode] = useState(true);
  const [userAgent, setUserAgent] = useState(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
  );

  return (
    <div className="border border-slate-200 dark:border-slate-800/80 bg-card/80 dark:bg-background/40 hover:border-cyan-500/40 rounded-xl p-6 relative overflow-hidden shadow-md dark:shadow-lg flex flex-col justify-between">
      <div className="relative z-10">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-950/60 border border-cyan-400/60 dark:border-cyan-800/50 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.15)]">
            <Cpu className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-200 tracking-wide">
            自動化引擎配置
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 左側欄：版本與重試配置 */}
          <div className="space-y-4">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">
                引擎版本
              </div>
              <div className="font-mono font-bold text-sm text-slate-900 dark:text-slate-200">
                v4.2.0 Stable
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 font-medium mb-1.5">
                最大重試次數
              </label>
              <input
                type="number"
                value={maxRetries}
                onChange={(e) => setMaxRetries(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-slate-200 px-3.5 py-2 rounded-lg text-sm font-mono focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/50 dark:focus:ring-cyan-400/50 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 font-medium mb-1.5">
                重試間隔 (秒)
              </label>
              <input
                type="number"
                value={retryInterval}
                onChange={(e) => setRetryInterval(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-slate-200 px-3.5 py-2 rounded-lg text-sm font-mono focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/50 dark:focus:ring-cyan-400/50 transition-all"
              />
            </div>
          </div>

          {/* 右側欄：無頭模式與 User Agent */}
          <div className="space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-900 dark:text-slate-200">
                  無頭模式 (Headless)
                </span>
                <Switch
                  checked={headlessMode}
                  onCheckedChange={setHeadlessMode}
                  className="data-[state=checked]:bg-cyan-500 dark:data-[state=checked]:bg-cyan-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 font-medium mb-1.5">
                瀏覽器 User Agent
              </label>
              <textarea
                value={userAgent}
                onChange={(e) => setUserAgent(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-700/80 text-slate-800 dark:text-slate-300 font-mono text-xs p-3 rounded-lg h-[92px] resize-none leading-relaxed focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/50 dark:focus:ring-cyan-400/50 transition-all"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
