"""
scripts/page_registry.py
──────────────────────────────────────────────────────────────────────────────
全域 Playwright Page 物件登錄表。

各個爬蟲腳本（在 asyncio.to_thread 執行緒中）在取得 Playwright page 後，
呼叫 register_page(task_id, page) 將其登錄；
WebSocket Preview handler 從主事件迴圈透過 asyncio.to_thread 呼叫
get_screenshot(task_id) 擷取 JPEG 截圖位元組。
"""

import threading
from typing import Optional, Dict, Any

_lock = threading.Lock()
_active_pages: Dict[str, Any] = {}   # task_id -> playwright Page


def register_page(task_id: str, page: Any) -> None:
    """在腳本取得 page 後立即呼叫。"""
    with _lock:
        _active_pages[task_id] = page


def unregister_page(task_id: str) -> None:
    """在腳本結束（browser.close()）前呼叫。"""
    with _lock:
        _active_pages.pop(task_id, None)


def get_screenshot(task_id: str) -> Optional[bytes]:
    """
    同步地擷取指定 task_id 的截圖 JPEG 位元組。
    sync_playwright page 物件可從任意執行緒呼叫（無執行緒親和性），
    此函式設計為可安全地被 asyncio.to_thread() 包裹執行。
    回傳 None 表示該任務已結束或 page 不存在。
    """
    with _lock:
        page = _active_pages.get(task_id)
    if page is None:
        return None
    try:
        return page.screenshot(type="jpeg", quality=60)
    except Exception:
        return None
