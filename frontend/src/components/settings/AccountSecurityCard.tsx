import { useState } from "react";
import { Shield, RefreshCw } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export const AccountSecurityCard = () => {
  const [username, setUsername] = useState("System_Operator_Alpha");
  const [email, setEmail] = useState("admin@rpa-command.io");
  const [apiKey, setApiKey] = useState("sk_live_98e7d6c5b4a3210987f2a");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [twoFactorAuth, setTwoFactorAuth] = useState(true);

  // 重新產生 API 密鑰
  const handleRegenerateKey = () => {
    setIsRegenerating(true);
    setTimeout(() => {
      const randomChars =
        Math.random().toString(36).substring(2, 8) +
        Math.random().toString(36).substring(2, 6);
      setApiKey(`sk_live_${randomChars}4f2a`);
      setIsRegenerating(false);
    }, 600);
  };

  return (
    <div className="lg:col-span-2 border border-slate-800/80 bg-background/40 hover:border-cyan-500/30 rounded-xl p-6 transition-all duration-300 relative overflow-hidden shadow-lg flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-8 h-8 rounded-lg bg-cyan-950/60 border border-cyan-800/50 flex items-center justify-center text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.15)]">
            <Shield className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-bold text-slate-200 tracking-wide">
            帳戶與安全
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 左側：基本資料輸入 */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 font-medium mb-1.5">
                使用者名稱
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-700/80 text-slate-200 px-3.5 py-2.5 rounded-lg text-sm font-mono focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 font-medium mb-1.5">
                電子郵件
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-700/80 text-slate-200 px-3.5 py-2.5 rounded-lg text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 transition-all"
              />
            </div>
          </div>

          {/* 右側：安全設定與 2FA */}
          <div className="space-y-4">
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs text-slate-400 font-medium mb-1">
                  API 密鑰管理
                </div>
                <div className="font-mono text-xs sm:text-sm text-slate-300 tracking-wider truncate">
                  {apiKey.substring(0, 8)}••••••••••••••••
                  {apiKey.substring(apiKey.length - 4)}
                </div>
              </div>
              <button
                onClick={handleRegenerateKey}
                disabled={isRegenerating}
                className="text-cyan-400 hover:text-cyan-300 text-xs font-bold font-mono tracking-wide cursor-pointer transition-colors px-2.5 py-1.5 rounded-md bg-cyan-950/40 border border-cyan-800/50 hover:bg-cyan-900/50 shrink-0 flex items-center gap-1.5"
              >
                <RefreshCw
                  className={`w-3 h-3 ${isRegenerating ? "animate-spin" : ""}`}
                />
                <span>重新產生</span>
              </button>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-200">
                  雙重身份驗證 (2FA)
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  增強帳戶安全性
                </div>
              </div>
              <Switch
                checked={twoFactorAuth}
                onCheckedChange={setTwoFactorAuth}
                className="data-checked:bg-cyan-400"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
