"""
setup_tixcraft_login.py — 產生拓元 (tixCraft) 會員登入憑證 (storage_state)

用法：
  在 backend 目錄下執行：
    python scripts/setup_tixcraft_login.py

  會彈出一個瀏覽器視窗（套用跟 tixcraft_booking.py 完全一樣的反偵測偽裝，
  避免被 Akamai Bot Manager 擋下），你在裡面手動登入拓元（Google / Facebook
  皆可，包含解驗證碼、簡訊二步驗證），登入完成後回到終端機按 Enter，
  程式就會把登入狀態存成 auth/tixcraft_state.json，供搶票機器人重複使用。
"""

from __future__ import annotations

import sys
from pathlib import Path
from patchright.sync_api import sync_playwright

# Windows 終端機預設編碼（cp950）印不出 emoji，統一轉成 UTF-8 避免結尾訊息噴錯
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

AUTH_STATE_PATH = Path(__file__).parent.parent / "auth" / "tixcraft_state.json"

# 與 tixcraft_booking.py 完全一致的反偵測設定，確保這裡登入時
# 看到的畫面（有沒有被 Akamai 擋）跟機器人實際執行時一致
LAUNCH_ARGS = [
    "--disable-blink-features=AutomationControlled",
    "--disable-infobars",
    "--no-sandbox",
    "--disable-dev-shm-usage",
]

INIT_SCRIPT = """
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    delete navigator.__proto__.webdriver;
    window.chrome = { runtime: {} };
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['zh-TW', 'zh', 'en-US', 'en'] });
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission }) :
            originalQuery(parameters)
    );
"""


def main() -> None:
    AUTH_STATE_PATH.parent.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=False,
            channel="chrome",
            args=LAUNCH_ARGS,
            ignore_default_args=["--enable-automation"],
        )
        context = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 800},
            locale="zh-TW",
            timezone_id="Asia/Taipei",
        )
        context.add_init_script(INIT_SCRIPT)

        page = context.new_page()
        page.goto("https://tixcraft.com/user/login", timeout=30000)

        print("\n" + "=" * 60)
        print("瀏覽器視窗已開啟，請在裡面手動完成拓元登入")
        print("（可用 Google / Facebook 登入，包含解驗證碼、簡訊驗證都正常操作即可）")
        print("登入成功、確認看到會員狀態後，回到這裡按 Enter 繼續...")
        print("=" * 60 + "\n")
        input()

        context.storage_state(path=str(AUTH_STATE_PATH))
        print(f"✅ 登入憑證已儲存至：{AUTH_STATE_PATH}")

        browser.close()


if __name__ == "__main__":
    main()
