"""
test_tixcraft_nodriver.py — 用 nodriver 測試能不能正常進入拓元的活動頁面
（不做任何選票/購票動作），驗證 nodriver 是否真的能繞過 Akamai Bot Manager。

用法：
  python scripts/test_tixcraft_nodriver.py
  python scripts/test_tixcraft_nodriver.py https://tixcraft.com/activity/detail/xxxxx
  (不帶網址則預設連到拓元首頁)
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import nodriver as uc
from nodriver import cdp

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

AUTH_STATE_PATH = Path(__file__).parent.parent.parent / "auth" / "tixcraft_state.json"

_SAME_SITE_MAP = {
    "Strict": cdp.network.CookieSameSite.STRICT,
    "Lax": cdp.network.CookieSameSite.LAX,
    "None": cdp.network.CookieSameSite.NONE,
}


def _load_storage_state_cookies(path: str) -> list:
    """讀取 Playwright storage_state 格式的登入憑證檔，轉成 nodriver/CDP 的 CookieParam 清單
    （跟 tixcraft_booking.py 裡的同名函式邏輯一致，獨立測試腳本故意不互相 import，避免路徑問題）"""
    if not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    cookie_params = []
    for c in data.get("cookies", []):
        expires = c.get("expires", -1)
        cookie_params.append(
            cdp.network.CookieParam(
                name=c["name"],
                value=c["value"],
                domain=c.get("domain"),
                path=c.get("path", "/"),
                secure=bool(c.get("secure", False)),
                http_only=bool(c.get("httpOnly", False)),
                same_site=_SAME_SITE_MAP.get(c.get("sameSite", "Lax"), cdp.network.CookieSameSite.LAX),
                expires=cdp.network.TimeSinceEpoch(expires) if expires and expires != -1 else None,
            )
        )
    return cookie_params


async def main() -> None:
    target_url = sys.argv[1] if len(sys.argv) > 1 else "https://tixcraft.com/"

    chrome_path = Path("C:/Program Files/Google/Chrome/Application/chrome.exe")
    browser = await uc.start(
        headless=False,
        browser_executable_path=str(chrome_path) if chrome_path.exists() else None,
        browser_args=["--disable-dev-shm-usage"],
        lang="zh-TW",
    )

    # 沿用先前產生的登入憑證（若存在）
    if AUTH_STATE_PATH.exists():
        cookie_params = _load_storage_state_cookies(str(AUTH_STATE_PATH))
        if cookie_params:
            await browser.cookies.set_all(cookie_params)
            print(f"（已載入登入憑證：{AUTH_STATE_PATH}）")
    else:
        print("（沒有登入憑證，用未登入狀態測試）")

    print(f"正在前往：{target_url}")
    tab = await browser.get(target_url)
    await tab.sleep(3)

    # 用「分頁標題」判斷，比整頁原始碼找關鍵字準確：
    # Akamai 真的攔截時會把 document.title 直接設成攔截訊息，
    # 而頁面原始碼裡的 JS 函式庫本身可能就寫死含有這些關鍵字，
    # 就算沒被攔截也會被誤判。
    title = await tab.evaluate("document.title")
    if "Browsing Activity Has Been Paused" in (title or "") or "unusual behavior" in (title or ""):
        print(f"[FAIL] 這個頁面被 Akamai 攔截了（分頁標題：{title}）")
    else:
        print(f"[OK] 頁面正常載入，目前網址：{tab.url}（分頁標題：{title}）")

    print("\n瀏覽器視窗保持開啟，肉眼確認一下畫面內容，確認完按 Enter 關閉...")
    input()
    browser.stop()


if __name__ == "__main__":
    uc.loop().run_until_complete(main())
