"""
scripts/page_registry.py
──────────────────────────────────────────────────────────────────────────────
全域瀏覽器 Page/Tab 物件登錄表，同時支援兩種腳本：

1. sync_playwright page（在 asyncio.to_thread 執行緒中執行）：
   無執行緒親和性，可從任意執行緒直接同步呼叫 page.screenshot()。
2. nodriver 的非同步 Tab（在主事件迴圈上執行，例如 tixcraft_booking.py）：
   物件的底層 WebSocket 連線綁定在建立當下的 event loop，不能跨執行緒/迴圈
   直接呼叫，必須透過 asyncio.run_coroutine_threadsafe() 排程回原本的 loop。

各腳本在取得 page/tab 後呼叫 register_page(task_id, page, loop) 登錄；
loop 只有非同步物件（如 nodriver Tab）才需要傳入，sync 物件維持 loop=None 即可。
WebSocket Preview handler 從主事件迴圈透過 asyncio.to_thread 呼叫
get_screenshot(task_id) 擷取 JPEG 截圖位元組。
"""

import asyncio
import base64
import threading
from typing import Optional, Dict, Any, Tuple

_lock = threading.Lock()
# task_id -> (page/tab 物件, 該物件所屬的 event loop；sync 物件則為 None)
_active_pages: Dict[str, Tuple[Any, Optional[asyncio.AbstractEventLoop]]] = {}


def register_page(task_id: str, page: Any, loop: Optional[asyncio.AbstractEventLoop] = None) -> None:
    """在腳本取得 page/tab 後立即呼叫。非同步物件（如 nodriver Tab）請一併傳入
    呼叫當下的 asyncio.get_running_loop()。"""
    with _lock:
        _active_pages[task_id] = (page, loop)


def unregister_page(task_id: str) -> None:
    """在腳本結束（瀏覽器關閉）前呼叫。"""
    with _lock:
        _active_pages.pop(task_id, None)


def get_screenshot(task_id: str) -> Optional[bytes]:
    """
    擷取指定 task_id 的截圖 JPEG 位元組。
    此函式設計為可安全地被 asyncio.to_thread() 包裹、從任意執行緒呼叫。
    回傳 None 表示該任務已結束或 page/tab 不存在。
    """
    with _lock:
        entry = _active_pages.get(task_id)
    if entry is None:
        return None
    page, loop = entry
    try:
        if loop is not None:
            # 非同步物件（nodriver Tab）：排程回原本建立它的 event loop 執行
            future = asyncio.run_coroutine_threadsafe(
                page.save_screenshot(format="jpeg", as_base64=True), loop
            )
            b64_str = future.result(timeout=5)
            return base64.b64decode(b64_str)
        else:
            # sync_playwright page：可直接同步呼叫
            return page.screenshot(type="jpeg", quality=60)
    except Exception:
        return None
