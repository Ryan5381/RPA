import { useState, useEffect, useRef, useCallback } from "react";

type PreviewState = "connecting" | "live" | "idle" | "disconnected";

interface UseLivePreviewReturn {
  imgBase64: string | null;
  previewState: PreviewState;
  reconnect: () => void;
}

export const useLivePreview = (taskId: string): UseLivePreviewReturn => {
  const [imgBase64, setImgBase64] = useState<string | null>(null);
  const [previewState, setPreviewState] = useState<PreviewState>("idle");
  const wsRef = useRef<WebSocket | null>(null);
  const shouldConnectRef = useRef(false);

  const connect = useCallback(() => {
    // 不連「所有任務」
    if (taskId === "ALL") {
      setImgBase64(null);
      setPreviewState("idle");
      return;
    }

    // 關閉舊連線
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    setPreviewState("connecting");
    shouldConnectRef.current = true;

    const ws = new WebSocket(`ws://localhost:8000/ws/preview/${taskId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setPreviewState("connecting");
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "screenshot" && msg.data) {
          setImgBase64(msg.data);
          setPreviewState("live");
        } else if (msg.type === "idle") {
          // 還沒截到圖（任務尚未啟動或已結束）
          setPreviewState("idle");
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onclose = () => {
      setPreviewState("disconnected");
      wsRef.current = null;
    };

    ws.onerror = () => {
      setPreviewState("disconnected");
    };
  }, [taskId]);

  // taskId 改變時自動重連
  useEffect(() => {
    connect();
    return () => {
      shouldConnectRef.current = false;
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
      setImgBase64(null);
      setPreviewState("idle");
    };
  }, [connect]);

  return {
    imgBase64,
    previewState,
    reconnect: connect,
  };
};
