import { useState, useEffect } from "react";
import { Plug, RefreshCw, Copy, Check, Save, Webhook } from "lucide-react";

const API_BASE = "http://localhost:8000";

export const AccountSecurityCard = () => {
  // ── API 金鑰 ──────────────────────────────────────────────────────
  const [apiKeyMasked, setApiKeyMasked] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // ── Webhook URL ───────────────────────────────────────────────────
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isSavingWebhook, setIsSavingWebhook] = useState(false);
  const [webhookSaved, setWebhookSaved] = useState(false);

  // 初始化：讀取 API Key 遮罩與 Webhook URL
  useEffect(() => {
    fetch(`${API_BASE}/api/settings/api-key`)
      .then((r) => r.json())
      .then((d) => {
        setApiKeyMasked(d.api_key_masked ?? null);
        setHasKey(d.has_key ?? false);
      })
      .catch(() => {});

    fetch(`${API_BASE}/api/settings/webhook`)
      .then((r) => r.json())
      .then((d) => setWebhookUrl(d.webhook_url ?? ""))
      .catch(() => {});
  }, []);

  // 重新產生 API Key
  const handleRegenerateKey = async () => {
    setIsRegenerating(true);
    try {
      const res = await fetch(`${API_BASE}/api/settings/api-key/regenerate`, { method: "POST" });
      const data = await res.json();
      setApiKeyMasked(data.api_key_masked);
      setHasKey(true);
    } catch {
      // ignore
    } finally {
      setIsRegenerating(false);
    }
  };

  // 複製（目前只能複製遮罩版，因為後端不回傳明文）
  const handleCopy = async () => {
    if (!apiKeyMasked) return;
    await navigator.clipboard.writeText(apiKeyMasked).catch(() => {});
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // 儲存 Webhook URL
  const handleSaveWebhook = async () => {
    setIsSavingWebhook(true);
    try {
      await fetch(`${API_BASE}/api/settings/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhook_url: webhookUrl }),
      });
      setWebhookSaved(true);
      setTimeout(() => setWebhookSaved(false), 2500);
    } catch {
      // ignore
    } finally {
      setIsSavingWebhook(false);
    }
  };

  return (
    <div className="lg:col-span-2 border border-slate-200 dark:border-slate-800/80 bg-card/80 dark:bg-background/40 hover:border-cyan-500/40 rounded-xl p-6 relative overflow-hidden shadow-md dark:shadow-lg flex flex-col justify-between">
      <div>
        {/* ── 卡片標題 ── */}
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-950/60 border border-cyan-400/60 dark:border-cyan-800/50 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.15)]">
            <Plug className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-200 tracking-wide">
            API 整合
          </h2>
          <span className="text-xs text-slate-400 dark:text-slate-500 font-mono ml-1">
            外部觸發 & 金鑰管理
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ── 左側：API 金鑰管理 ── */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 font-medium mb-1.5">
                API 金鑰
              </label>
              <div className="bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4">
                <div className="font-mono text-xs sm:text-sm text-slate-800 dark:text-slate-300 tracking-wider truncate mb-3">
                  {hasKey && apiKeyMasked
                    ? apiKeyMasked
                    : <span className="text-slate-500 italic">尚未設定 API Key</span>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleRegenerateKey}
                    disabled={isRegenerating}
                    className="flex-1 text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 text-xs font-bold font-mono cursor-pointer transition-colors px-2.5 py-1.5 rounded-md bg-cyan-100/60 dark:bg-cyan-950/40 border border-cyan-400/50 dark:border-cyan-800/50 hover:bg-cyan-200/60 dark:hover:bg-cyan-900/50 flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRegenerating ? "animate-spin" : ""}`} />
                    重新產生
                  </button>
                  <button
                    onClick={handleCopy}
                    disabled={!hasKey}
                    className="px-3 py-1.5 rounded-md bg-slate-200/60 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors flex items-center gap-1.5 text-xs disabled:opacity-40"
                  >
                    {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-600 mt-2 leading-relaxed">
                在 HTTP 請求的 <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded font-mono text-[10px]">X-API-Key</code> Header 加上此金鑰，即可從外部安全地觸發 RPA 任務。
              </p>
            </div>
          </div>

          {/* ── 右側：Webhook URL ── */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 font-medium mb-1.5 flex items-center gap-1.5">
                <Webhook className="w-3 h-3" />
                Webhook 回呼 URL
              </label>
              <textarea
                rows={3}
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hook.make.com/xxx  或  https://n8n.io/webhook/xxx"
                className="w-full bg-slate-50 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-slate-200 px-3.5 py-2.5 rounded-lg text-sm font-mono focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/50 dark:focus:ring-cyan-400/50 transition-all resize-none placeholder:text-slate-400 dark:placeholder:text-slate-600"
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-slate-400 dark:text-slate-600 leading-relaxed">
                  任務完成後自動發送 POST 通知至此 URL。
                </p>
                <button
                  onClick={handleSaveWebhook}
                  disabled={isSavingWebhook}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold font-mono cursor-pointer transition-all bg-emerald-100/60 dark:bg-emerald-950/40 border border-emerald-400/50 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200/60 dark:hover:bg-emerald-900/50"
                >
                  {webhookSaved
                    ? <><Check className="w-3 h-3" />已儲存</>
                    : <><Save className="w-3 h-3" />儲存</>}
                </button>
              </div>
            </div>

            {/* 使用範例 */}
            <div className="bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3">
              <div className="text-xs text-slate-400 dark:text-slate-500 font-medium mb-2">使用範例</div>
              <pre className="text-[10px] font-mono text-slate-600 dark:text-slate-400 overflow-x-auto whitespace-pre-wrap">{`curl -X POST http://localhost:8000/api/tasks \\
  -H "X-API-Key: sk_live_..." \\
  -d '{"task_type":"thsr_booking","config":{}}'`}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
