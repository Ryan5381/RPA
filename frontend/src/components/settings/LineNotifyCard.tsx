import { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  CheckCircle,
  AlertCircle,
  MousePointerClick,
} from "lucide-react";
import { getLineSettings, updateLineSettings } from "@/apis/settings";
import { toast } from "sonner";

export const LineNotifyCard = () => {
  const [triggers, setTriggers] = useState<string[]>(["success", "fail"]);
  const [isLoading, setIsLoading] = useState(true);
  const triggersRef = useRef(triggers);

  useEffect(() => {
    triggersRef.current = triggers;
  }, [triggers]);

  // 初始化讀取設定
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await getLineSettings();
        if (data.triggers) setTriggers(data.triggers);
      } catch (err) {
        console.error("無法讀取 LINE 設定", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // 監聽全域儲存事件
  useEffect(() => {
    const handleGlobalSave = async () => {
      try {
        await updateLineSettings({
          triggers: triggersRef.current,
        });
      } catch (err) {
        console.error(err);
        toast.error("LINE 設定儲存失敗");
      }
    };

    window.addEventListener("saveAllSettings", handleGlobalSave);
    return () => {
      window.removeEventListener("saveAllSettings", handleGlobalSave);
    };
  }, []);

  // 切換觸發條件
  const toggleTrigger = (key: string) => {
    if (triggers.includes(key)) {
      setTriggers(triggers.filter((t) => t !== key));
    } else {
      setTriggers([...triggers, key]);
    }
  };

  if (isLoading) {
    return (
      <div className="border border-slate-200 dark:border-slate-800/80 bg-card/80 dark:bg-background/40 rounded-xl p-6 h-[200px] flex items-center justify-center">
        <span className="text-slate-400">載入中...</span>
      </div>
    );
  }

  return (
    <div className="border border-slate-200 dark:border-slate-800/80 bg-card/80 dark:bg-background/40 hover:border-cyan-500/40 rounded-xl p-6 relative overflow-hidden shadow-md dark:shadow-lg flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-400/60 dark:border-emerald-800/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.15)]">
              <MessageSquare className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-200 tracking-wide">
              LINE Notify 整合
            </h2>
          </div>

          <div className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-400/60 dark:border-emerald-500/40 px-2.5 py-1 rounded-full text-xs font-mono font-semibold flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
            已連接 .env 設定
          </div>
        </div>

        <div className="space-y-5">
          {/* 觸發條件設定 */}
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 font-medium mb-2">
              通知觸發條件 (儲存時將自動生效)
            </label>
            <div className="grid grid-cols-3 gap-3">
              {/* 選項 1: 任務成功 */}
              <div
                onClick={() => toggleTrigger("success")}
                className={`rounded-lg p-3.5 flex flex-col items-center justify-center gap-2 text-xs font-medium transition-all cursor-pointer select-none border ${
                  triggers.includes("success")
                    ? "border-cyan-500 dark:border-cyan-400 bg-cyan-100/60 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.15)] font-semibold"
                    : "border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400"
                }`}
              >
                <CheckCircle
                  className={`w-5 h-5 ${
                    triggers.includes("success")
                      ? "text-cyan-600 dark:text-cyan-400"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                />
                <span>任務成功</span>
              </div>

              {/* 選項 2: 任務失敗 */}
              <div
                onClick={() => toggleTrigger("fail")}
                className={`rounded-lg p-3.5 flex flex-col items-center justify-center gap-2 text-xs font-medium transition-all cursor-pointer select-none border ${
                  triggers.includes("fail")
                    ? "border-cyan-500 dark:border-cyan-400 bg-cyan-100/60 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.15)] font-semibold"
                    : "border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400"
                }`}
              >
                <AlertCircle
                  className={`w-5 h-5 ${
                    triggers.includes("fail") ? "text-rose-500 dark:text-rose-400" : "text-slate-400 dark:text-slate-500"
                  }`}
                />
                <span>任務失敗</span>
              </div>

              {/* 選項 3: 手動請求 */}
              <div
                onClick={() => toggleTrigger("manual")}
                className={`rounded-lg p-3.5 flex flex-col items-center justify-center gap-2 text-xs font-medium transition-all cursor-pointer select-none border ${
                  triggers.includes("manual")
                    ? "border-cyan-500 dark:border-cyan-400 bg-cyan-100/60 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.15)] font-semibold"
                    : "border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400"
                }`}
              >
                <MousePointerClick
                  className={`w-5 h-5 ${
                    triggers.includes("manual")
                      ? "text-cyan-600 dark:text-cyan-400"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                />
                <span>手動請求</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
