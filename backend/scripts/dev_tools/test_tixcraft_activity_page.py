"""
test_tixcraft_activity_page.py — 測試能不能正常進入拓元的「活動購票頁」
（不是登入頁），因為登入頁可能有比一般頁面更嚴格的風控。
不做任何選票/購票動作，只確認頁面能不能正常載入。

用法：
  python scripts/test_tixcraft_activity_page.py https://tixcraft.com/activity/detail/xxxxx
  (不帶網址則預設連到拓元首頁)
"""

from __future__ import annotations

import sys
from pathlib import Path
from patchright.sync_api import sync_playwright

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

AUTH_STATE_PATH = Path(__file__).parent.parent.parent / "auth" / "tixcraft_state.json"


def main() -> None:
    target_url = sys.argv[1] if len(sys.argv) > 1 else "https://tixcraft.com/"

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=False,
            channel="chrome",
            args=[
                "--disable-blink-features=AutomationControlled",
                "--disable-infobars",
                "--no-sandbox",
                "--disable-dev-shm-usage",
            ],
            ignore_default_args=["--enable-automation"],
        )

        context_options = {
            "user_agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            ),
            "viewport": {"width": 1280, "height": 800},
            "locale": "zh-TW",
            "timezone_id": "Asia/Taipei",
        }
        if AUTH_STATE_PATH.exists():
            context_options["storage_state"] = str(AUTH_STATE_PATH)
            print(f"（已載入登入憑證：{AUTH_STATE_PATH}）")
        else:
            print("（沒有登入憑證，用未登入狀態測試）")

        context = browser.new_context(**context_options)
        page = context.new_page()

        print(f"正在前往：{target_url}")
        page.goto(target_url, timeout=30000)
        page.wait_for_timeout(3000)

        content = page.content()
        if "Browsing Activity Has Been Paused" in content or "unusual behavior" in content:
            print("[FAIL] 這個頁面也被 Akamai 攔截了")
        else:
            print(f"[OK] 頁面正常載入，目前網址：{page.url}")

        print("\n瀏覽器視窗保持開啟，肉眼確認一下畫面內容，確認完按 Enter 關閉...")
        input()
        browser.close()


if __name__ == "__main__":
    main()
