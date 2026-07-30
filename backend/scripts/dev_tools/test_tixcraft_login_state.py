"""
test_tixcraft_login_state.py — 只檢查 auth/tixcraft_state.json 是否真的處於
已登入狀態，不做任何選票/購票動作，安全地拿來測試登入憑證是否有效。

用法：
  python scripts/test_tixcraft_login_state.py
"""

from __future__ import annotations

import sys
from pathlib import Path
from patchright.sync_api import sync_playwright

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

AUTH_STATE_PATH = Path(__file__).parent.parent.parent / "auth" / "tixcraft_state.json"


def main() -> None:
    if not AUTH_STATE_PATH.exists():
        print(f"[FAIL] 找不到 {AUTH_STATE_PATH}，請先產生登入憑證")
        return

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
        context = browser.new_context(
            storage_state=str(AUTH_STATE_PATH),
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 800},
            locale="zh-TW",
            timezone_id="Asia/Taipei",
        )
        page = context.new_page()

        # /user/login 這個網址：已登入的話拓元通常會直接導回會員頁或首頁，
        # 未登入才會真的停在登入表單頁 —— 用這個行為差異來判斷登入狀態
        page.goto("https://tixcraft.com/user/login", timeout=30000)
        page.wait_for_timeout(3000)

        content = page.content()
        current_url = page.url

        if "Browsing Activity Has Been Paused" in content or "unusual behavior" in content:
            print("[FAIL] 被 Akamai 風控攔截，登入狀態無法驗證")
        elif "/user/login" in current_url and (
            page.locator("input[name*='pwd'], input[type='password']").count() > 0
        ):
            print(f"[FAIL] 目前網址仍是 {current_url}，且畫面上看到登入表單，代表 cookie 沒有生效（可能已過期）")
        else:
            print(f"[OK] 目前網址：{current_url}，畫面上沒有看到登入表單，登入狀態看起來有效！")

        print("\n瀏覽器視窗會保持開啟，你可以自己肉眼確認畫面右上角是不是顯示會員資訊。")
        print("確認完後回到這裡按 Enter 關閉瀏覽器...")
        input()

        browser.close()


if __name__ == "__main__":
    main()
