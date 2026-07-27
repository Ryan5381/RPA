"""
convert_cookies_to_storage_state.py — 把 Cookie-Editor 匯出的 cookie 轉成
Playwright/patchright 需要的 storage_state 格式 (auth/tixcraft_state.json)。

用法：
  1. 用你平常的 Chrome + Cookie-Editor 擴充功能，登入 tixcraft.com 後
     匯出 cookie，存成 backend/auth/exported_cookies.json
  2. 在 backend 目錄下執行：
       python scripts/convert_cookies_to_storage_state.py
  3. 完成後會產生 auth/tixcraft_state.json，供 tixcraft_booking.py 直接使用
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

# Windows 終端機預設編碼（cp950）印不出 emoji，統一轉成 UTF-8 避免結尾訊息噴錯
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

AUTH_DIR = Path(__file__).parent.parent / "auth"
INPUT_PATH = AUTH_DIR / "exported_cookies.json"
OUTPUT_PATH = AUTH_DIR / "tixcraft_state.json"

# Cookie-Editor 的 sameSite 值是小寫、Playwright 要求首字大寫的三選一
SAME_SITE_MAP = {
    "no_restriction": "None",
    "unspecified": "None",
    "lax": "Lax",
    "strict": "Strict",
}


def convert_cookie(raw: dict) -> dict:
    expires = -1
    if not raw.get("session", False) and raw.get("expirationDate") is not None:
        expires = raw["expirationDate"]

    same_site_raw = str(raw.get("sameSite", "unspecified")).lower()
    same_site = SAME_SITE_MAP.get(same_site_raw, "Lax")

    return {
        "name": raw["name"],
        "value": raw["value"],
        "domain": raw["domain"],
        "path": raw.get("path", "/"),
        "expires": expires,
        "httpOnly": bool(raw.get("httpOnly", False)),
        "secure": bool(raw.get("secure", False)),
        "sameSite": same_site,
    }


def main() -> None:
    if not INPUT_PATH.exists():
        print(f"❌ 找不到 {INPUT_PATH}，請先用 Cookie-Editor 匯出 cookie 並存成這個檔名")
        return

    with open(INPUT_PATH, "r", encoding="utf-8") as f:
        raw_cookies = json.load(f)

    if not isinstance(raw_cookies, list):
        print("❌ 檔案內容格式不對，預期是一個 cookie 物件的陣列（Cookie-Editor 匯出的原始格式）")
        return

    cookies = [convert_cookie(c) for c in raw_cookies]

    storage_state = {"cookies": cookies, "origins": []}

    AUTH_DIR.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(storage_state, f, ensure_ascii=False, indent=2)

    print(f"✅ 已轉換 {len(cookies)} 筆 cookie，儲存至：{OUTPUT_PATH}")


if __name__ == "__main__":
    main()
