import React, { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Smartphone, KeyRound, CheckCircle2, XCircle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitOtp } from "@/apis/tasks";
import { axiosInstance } from "@/apis/axiosInstance";

interface OtpModalProps {
  /** 等待 OTP 的 task_id；null 表示不顯示 */
  taskId: string | null;
  onClose: () => void;
  /** 訂位摘要資訊（供 modal 顯示） */
  summary?: {
    restaurant?: string;
    branch?: string;
    date?: string;
    session?: string;
  };
}

type ModalStatus = "waiting" | "submitting" | "success" | "error";

export const OtpModal: React.FC<OtpModalProps> = ({ taskId, onClose, summary }) => {
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [status, setStatus] = useState<ModalStatus>("waiting");
  const [errorMsg, setErrorMsg] = useState("");

  // 每次 taskId 改變，重設狀態
  useEffect(() => {
    if (taskId) {
      setOtp(["", "", "", ""]);
      setStatus("waiting");
      setErrorMsg("");
    }
  }, [taskId]);

  // Polling 任務狀態（每 3 秒），若後端已完成則更新狀態
  const { data: taskStatus } = useQuery({
    queryKey: ["task-status", taskId],
    queryFn: async () => {
      if (!taskId) return null;
      const res = await axiosInstance.get(`/tasks/${taskId}/status`);
      return res.data;
    },
    enabled: !!taskId && status !== "success",
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    if (taskStatus?.status === "success") setStatus("success");
    if (taskStatus?.status === "failed") {
      setStatus("error");
      setErrorMsg(taskStatus?.result?.error ?? "訂位失敗，請查看 Logs");
    }
  }, [taskStatus]);

  // OTP 提交 mutation
  const otpMutation = useMutation({
    mutationFn: (code: string) => submitOtp({ taskId: taskId!, otpCode: code }),
    onSuccess: () => {
      setStatus("waiting"); // 繼續等待後端確認成功
    },
    onError: (err: any) => {
      setStatus("error");
      setErrorMsg(err?.response?.data?.detail ?? "OTP 提交失敗，請重試");
    },
  });

  const handleOtpChange = useCallback(
    (index: number, value: string) => {
      if (!/^\d*$/.test(value)) return; // 只允許數字
      const next = [...otp];
      next[index] = value.slice(-1); // 最多 1 位
      setOtp(next);

      // 自動跳到下一格
      if (value && index < 3) {
        const nextInput = document.getElementById(`otp-input-${index + 1}`);
        nextInput?.focus();
      }
    },
    [otp]
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && !otp[index] && index > 0) {
        const prevInput = document.getElementById(`otp-input-${index - 1}`);
        prevInput?.focus();
      }
    },
    [otp]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
      if (pasted.length === 4) {
        setOtp(pasted.split(""));
      }
    },
    []
  );

  const handleSubmit = useCallback(() => {
    const code = otp.join("");
    if (code.length !== 4) return;
    setStatus("submitting");
    setErrorMsg("");
    otpMutation.mutate(code);
  }, [otp, otpMutation]);

  if (!taskId) return null;

  const otpComplete = otp.every((d) => d !== "");

  return (
    /* 全螢幕遮罩 */
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景模糊遮罩 */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={status === "success" || status === "error" ? onClose : undefined}
      />

      {/* Modal 主體 */}
      <div className="relative z-10 w-full max-w-sm mx-4 bg-card dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* 頂部橙色光條 */}
        <div className="h-1 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500" />

        {/* 關閉按鈕（完成或失敗才顯示） */}
        {(status === "success" || status === "error") && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="p-7">
          {/* ── 等待 / 提交中 畫面 ── */}
          {(status === "waiting" || status === "submitting") && (
            <>
              {/* 圖示 */}
              <div className="flex justify-center mb-5">
                <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-950/50 border border-orange-400/50 dark:border-orange-500/30 flex items-center justify-center">
                  <Smartphone className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                </div>
              </div>

              {/* 標題 */}
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 text-center mb-1">
                輸入手機驗證碼
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 text-center font-mono mb-1">
                訂位機器人正在等待你輸入 OTP
              </p>
              {summary?.restaurant && (
                <p className="text-xs text-orange-600 dark:text-orange-400/80 text-center font-mono mb-5">
                  {summary.restaurant}
                  {summary.branch ? ` · ${summary.branch}` : ""}
                  {summary.date ? ` · ${summary.date}` : ""}
                </p>
              )}
              {!summary?.restaurant && <div className="mb-5" />}

              {/* OTP 輸入框 */}
              <div className="flex justify-center gap-3 mb-6">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    id={`otp-input-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onPaste={i === 0 ? handlePaste : undefined}
                    disabled={status === "submitting"}
                    className={`w-14 h-14 text-center text-2xl font-bold font-mono rounded-xl border-2 bg-white dark:bg-slate-950/80 outline-none transition-all duration-200 ${
                      digit
                        ? "border-orange-500 text-orange-600 dark:text-orange-400 shadow-[0_0_12px_rgba(249,115,22,0.3)]"
                        : "border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-400"
                    } focus:border-orange-400 focus:shadow-[0_0_15px_rgba(249,115,22,0.4)] disabled:opacity-50`}
                  />
                ))}
              </div>

              {/* 提示文字 */}
              <p className="text-[11px] text-slate-600 dark:text-slate-400 text-center font-mono mb-5">
                請查看 +886 {summary?.date ? "" : ""} 收到的簡訊，輸入 4 位數驗證碼
              </p>

              {/* 提交按鈕 */}
              <Button
                onClick={handleSubmit}
                disabled={!otpComplete || status === "submitting"}
                className="w-full h-11 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:opacity-40 text-white font-bold text-sm tracking-wider border-0 cursor-pointer gap-2 transition-all"
              >
                {status === "submitting" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    提交中...
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    送出驗證碼
                  </>
                )}
              </Button>

              {/* 等待動畫提示 */}
              {status === "waiting" && (
                <p className="text-[10px] text-slate-600 dark:text-slate-400 font-mono text-center mt-3 flex items-center justify-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                  機器人等待中，OTP 有效時間有限，請盡快輸入
                </p>
              )}
            </>
          )}

          {/* ── 成功畫面 ── */}
          {status === "success" && (
            <div className="text-center py-4">
              <div className="flex justify-center mb-5">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/50 border border-emerald-400/50 dark:border-emerald-500/30 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <h2 className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mb-2">訂位成功！</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-mono mb-6">
                {summary?.restaurant && `${summary.restaurant} `}
                {summary?.branch && `${summary.branch} `}
                {summary?.date && `· ${summary.date}`}
              </p>
              <Button
                onClick={onClose}
                className="w-full h-10 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-sm border-0 cursor-pointer"
              >
                關閉
              </Button>
            </div>
          )}

          {/* ── 失敗畫面 ── */}
          {status === "error" && (
            <div className="text-center py-4">
              <div className="flex justify-center mb-5">
                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/50 border border-red-400/50 dark:border-red-500/30 flex items-center justify-center">
                  <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <h2 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">訂位失敗</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-mono mb-6 break-all">{errorMsg}</p>
              <Button
                onClick={onClose}
                variant="outline"
                className="w-full h-10 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-bold text-sm cursor-pointer"
              >
                關閉並查看 Logs
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
