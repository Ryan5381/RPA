// 通知音效：設定持久化（localStorage）與播放邏輯

const STORAGE_KEY = "rpa_notification_sound_enabled";

export function isNotificationSoundEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setNotificationSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(enabled));
  } catch {
    // 忽略無法存取 localStorage 的環境（例如無痕模式）
  }
}

let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!sharedAudioContext) {
    sharedAudioContext = new AudioContextClass();
  }
  return sharedAudioContext;
}

// 瀏覽器的自動播放限制：AudioContext 必須在使用者互動過後才能真正發聲。
// 任務完成的音效是由背景輪詢觸發的，不算使用者手勢，所以在使用者第一次
// 點擊/按鍵時就先喚醒（resume）共用的 AudioContext，避免播放當下播不出來。
if (typeof document !== "undefined") {
  const resumeOnUserGesture = () => {
    getAudioContext()?.resume().catch(() => {});
    document.removeEventListener("click", resumeOnUserGesture);
    document.removeEventListener("keydown", resumeOnUserGesture);
  };
  document.addEventListener("click", resumeOnUserGesture);
  document.addEventListener("keydown", resumeOnUserGesture);
}

/** 用 Web Audio API 即時合成一段簡短的「叮咚」提示音，不需要額外音檔 */
export function playNotificationSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const playTone = (freq: number, startTime: number, duration: number) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.type = "sine";
      oscillator.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.25, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    playTone(880, now, 0.15); // 叮
    playTone(659, now + 0.12, 0.2); // 咚
  } catch (err) {
    console.error("[notificationSound] 播放失敗:", err);
  }
}
