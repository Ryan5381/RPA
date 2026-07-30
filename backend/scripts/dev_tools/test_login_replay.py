"""
test_login_replay.py — httpx 登入 API 完整 Replay 測試

目的：
  確認是否可以完全用 httpx（不用 Playwright）完成：
  Step 1. GET 登入頁   → 取得 ViewState + ASP.NET_SessionId
  Step 2. CapSolver   → 取得 Turnstile token
  Step 3. POST /api/api_captcha.aspx { token }  → 驗證 Turnstile
  Step 4. POST 登入表單                          → 完成登入

用法：
  .\venv\Scripts\python.exe scripts\test_login_replay.py
  （需先 pip install httpx）

輸出：
  每個步驟的時間戳、請求/回應摘要、最終成功/失敗
  成功 → 印出最終 URL 和 cookies（確認已登入）
"""

import sys
import json
import re
import time
import datetime
import urllib.request
import urllib.parse
from pathlib import Path

try:
    import httpx
except ImportError:
    print("❌ 請先安裝 httpx：")
    print("   .\\venv\\Scripts\\pip.exe install httpx")
    sys.exit(1)

# ── 設定（直接在這裡填，或執行後互動輸入）────────────────────────────────────

USER_ID           = ""   # 身分證字號（留空則執行時詢問）
PASSWORD          = ""   # 密碼
CAPSOLVER_API_KEY = ""   # CapSolver API Key

BASE_URL      = "https://scr.cyc.org.tw"
LOGIN_URL     = f"{BASE_URL}/tp11.aspx?module=login_page&files=login&PT=1"
CAPTCHA_API   = f"{BASE_URL}/api/api_captcha.aspx"
CAPSOLVER_URL = "https://api.capsolver.com"
SITEKEY       = "0x4AAAAAAAL0IWcUxrtPm2Ba"

RESULT_FILE   = Path(__file__).parent / ".test_login_result.json"

# ── 計時工具 ──────────────────────────────────────────────────────────────────

_t_start = time.time()

def ts() -> str:
    elapsed = time.time() - _t_start
    return f"[+{elapsed:6.2f}s]"

def log(step: str, msg: str) -> None:
    print(f"{ts()} [{step}] {msg}")

# ── ASP.NET Hidden Fields 提取 ────────────────────────────────────────────────

def extract_hidden_fields(html: str) -> dict[str, str]:
    """從 HTML 提取所有 ASP.NET hidden input fields"""
    result: dict[str, str] = {}
    # 正向匹配：name 在前
    for m in re.finditer(
        r'<input[^>]+name=["\'](__[A-Z_]+)["\'][^>]+value=["\'](.*?)["\']',
        html, re.IGNORECASE | re.DOTALL,
    ):
        result[m.group(1)] = m.group(2)
    # 反向匹配：value 在前
    for m in re.finditer(
        r'<input[^>]+value=["\'](.*?)["\'][^>]+name=["\'](__[A-Z_]+)["\']',
        html, re.IGNORECASE | re.DOTALL,
    ):
        result[m.group(2)] = m.group(1)
    return result

# ── CapSolver ─────────────────────────────────────────────────────────────────

def capsolver_request(endpoint: str, payload: dict) -> dict:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        f"{CAPSOLVER_URL}{endpoint}",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())

def solve_turnstile(api_key: str) -> tuple[str | None, float]:
    t0 = time.time()
    log("CAPSOLVER", "建立解題任務...")
    try:
        resp = capsolver_request("/createTask", {
            "clientKey": api_key,
            "task": {
                "type": "AntiTurnstileTaskProxyless",
                "websiteURL": LOGIN_URL,
                "websiteKey": SITEKEY,
            },
        })
    except Exception as e:
        log("CAPSOLVER", f"createTask 失敗：{e}")
        return None, time.time() - t0

    if resp.get("errorId", 0) != 0:
        log("CAPSOLVER", f"錯誤：{resp.get('errorDescription')}")
        return None, time.time() - t0

    task_id = resp["taskId"]
    log("CAPSOLVER", f"任務 ID：{task_id}，輪詢中（每 1s）...")

    for attempt in range(120):
        time.sleep(1)
        try:
            result = capsolver_request("/getTaskResult", {
                "clientKey": api_key,
                "taskId": task_id,
            })
        except Exception:
            continue
        status = result.get("status")
        if status == "ready":
            token = result["solution"]["token"]
            elapsed = time.time() - t0
            log("CAPSOLVER", f"✅ 解題成功！耗時 {elapsed:.1f}s，token 長度 {len(token)}")
            return token, elapsed
        elif status != "processing":
            log("CAPSOLVER", f"失敗：{result.get('errorDescription', status)}")
            return None, time.time() - t0
        if (attempt + 1) % 5 == 0:
            log("CAPSOLVER", f"  解題中... ({attempt+1}s)")

    return None, time.time() - t0

# ── 主要測試流程 ──────────────────────────────────────────────────────────────

def main():
    global USER_ID, PASSWORD, CAPSOLVER_API_KEY

    print("=" * 60)
    print("  朝馬羽球 — httpx Login Replay 測試")
    print("=" * 60)

    # 互動式輸入（若未在上方設定）
    if not USER_ID:
        USER_ID = input("身分證字號：").strip()
    if not PASSWORD:
        import getpass
        PASSWORD = getpass.getpass("密碼：").strip()
    if not CAPSOLVER_API_KEY:
        CAPSOLVER_API_KEY = input("CapSolver API Key：").strip()

    print()
    results: dict = {"steps": [], "success": False}

    # ── 設定共用 HTTP headers ─────────────────────────────────────────────────
    HEADERS = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/126.0.0.0 Safari/537.36"
        ),
        "Accept-Language": "zh-TW,zh;q=0.9,en-US;q=0.8",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }

    # 使用一個 httpx.Client（帶 cookie jar，自動管理 session）
    client = httpx.Client(
        base_url=BASE_URL,
        headers=HEADERS,
        follow_redirects=True,
        timeout=15.0,
        verify=False,   # 部分台灣網站 SSL 有問題
    )

    # ══════════════════════════════════════════════════════════════════════════
    # Step 1: GET 登入頁面 → 取得 ViewState + ASP.NET_SessionId
    # ══════════════════════════════════════════════════════════════════════════
    print("─" * 60)
    log("STEP 1", f"GET {LOGIN_URL}")

    t1 = time.time()
    try:
        resp1 = client.get(LOGIN_URL)
        step1_time = time.time() - t1

        asp_session = client.cookies.get("ASP.NET_SessionId", "（未取得）")
        log("STEP 1", f"HTTP {resp1.status_code}  耗時 {step1_time*1000:.0f}ms")
        log("STEP 1", f"ASP.NET_SessionId = {asp_session}")

        # 提取 ASP.NET hidden fields
        fields = extract_hidden_fields(resp1.text)
        viewstate           = fields.get("__VIEWSTATE", "")
        event_validation    = fields.get("__EVENTVALIDATION", "")
        viewstate_generator = fields.get("__VIEWSTATEGENERATOR", "")

        log("STEP 1", f"__VIEWSTATE 長度：{len(viewstate)}")
        log("STEP 1", f"__EVENTVALIDATION 長度：{len(event_validation)}")
        log("STEP 1", f"__VIEWSTATEGENERATOR：{viewstate_generator[:20]}...")

        if not viewstate:
            print("\n❌ 無法取得 __VIEWSTATE，頁面可能有反爬蟲保護")
            print(f"   回應前 500 字：\n{resp1.text[:500]}")
            return

        results["steps"].append({
            "step": 1, "name": "GET_LOGIN_PAGE",
            "status": resp1.status_code, "time_ms": round(step1_time * 1000),
            "asp_session": asp_session,
            "viewstate_len": len(viewstate),
        })

    except Exception as e:
        log("STEP 1", f"❌ 失敗：{e}")
        return

    # ══════════════════════════════════════════════════════════════════════════
    # Step 2: CapSolver → 取得 Turnstile token
    # ══════════════════════════════════════════════════════════════════════════
    print("─" * 60)
    log("STEP 2", "CapSolver 解 Turnstile...")

    token, solver_elapsed = solve_turnstile(CAPSOLVER_API_KEY)
    if not token:
        log("STEP 2", "❌ 解題失敗，中止")
        return

    results["steps"].append({
        "step": 2, "name": "CAPSOLVER",
        "elapsed_s": round(solver_elapsed, 1),
        "token_len": len(token),
    })

    # ══════════════════════════════════════════════════════════════════════════
    # Step 3: POST /api/api_captcha.aspx { token }
    # ══════════════════════════════════════════════════════════════════════════
    print("─" * 60)
    log("STEP 3", f"POST {CAPTCHA_API}")

    t3 = time.time()
    try:
        resp3 = client.post(
            CAPTCHA_API,
            content=json.dumps({"token": token}).encode("utf-8"),
            headers={"Content-Type": "application/json",
                     "Referer": LOGIN_URL,
                     "Origin": BASE_URL},
        )
        step3_time = time.time() - t3

        log("STEP 3", f"HTTP {resp3.status_code}  耗時 {step3_time*1000:.0f}ms")
        log("STEP 3", f"Response: {resp3.text[:300]}")

        try:
            data3 = resp3.json()
        except Exception:
            data3 = {"raw": resp3.text}

        captcha_ok = data3.get("success", False)
        log("STEP 3", f"Captcha 驗證：{'✅ 成功' if captcha_ok else '❌ 失敗'}")
        log("STEP 3", f"Set-Cookie: {dict(resp3.cookies)}")

        results["steps"].append({
            "step": 3, "name": "CAPTCHA_VALIDATE",
            "status": resp3.status_code, "time_ms": round(step3_time * 1000),
            "response": data3, "success": captcha_ok,
        })

        if not captcha_ok:
            print("\n❌ Captcha 驗證失敗，httpx 方案可能需要帶正確的 browser fingerprint")
            print("   這可能代表 Cloudflare 在伺服器端也驗證了 User-Agent / IP / cookies")
            return

    except Exception as e:
        log("STEP 3", f"❌ 失敗：{e}")
        return

    # ══════════════════════════════════════════════════════════════════════════
    # Step 4: POST 登入表單
    # ══════════════════════════════════════════════════════════════════════════
    print("─" * 60)
    log("STEP 4", "POST 登入表單（ASP.NET WebForms）")

    # 目前推測的欄位名稱（從頁面 input 分析）
    # 若此步驟失敗，需要用 Playwright NetworkCapture 確認實際欄位名
    form_data = {
        "__EVENTTARGET": "",
        "__EVENTARGUMENT": "",
        "__VIEWSTATE": viewstate,
        "__EVENTVALIDATION": event_validation,
        "__VIEWSTATEGENERATOR": viewstate_generator,
        "ctl00$ContentPlaceHolder1$loginid": USER_ID,
        "loginpw": PASSWORD,
    }

    log("STEP 4", "表單欄位：")
    for k, v in form_data.items():
        if k.startswith("__VIEWSTATE"):
            print(f"           {k} = [{len(v)} 字元]")
        else:
            print(f"           {k} = {v if k != 'loginpw' else '***'}")

    t4 = time.time()
    try:
        resp4 = client.post(
            f"/tp11.aspx?module=login_page&files=login&PT=1",
            data=form_data,
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "Referer": LOGIN_URL,
                "Origin": BASE_URL,
            },
        )
        step4_time = time.time() - t4
        final_url = str(resp4.url)

        log("STEP 4", f"HTTP {resp4.status_code}  耗時 {step4_time*1000:.0f}ms")
        log("STEP 4", f"最終 URL：{final_url}")
        log("STEP 4", f"Set-Cookie: {dict(resp4.cookies)}")

        success = (
            "login_page" not in final_url
            and "login" not in final_url.lower().split("?")[0]
            and resp4.status_code in (200, 302)
        )

        # 額外確認：頁面內容是否有登入成功的標誌
        if "module=ind" in final_url or "ind&files=ind" in final_url:
            success = True
        if "login_page" in final_url or "login_failed" in resp4.text.lower():
            success = False

        log("STEP 4", f"登入結果：{'✅ 成功！' if success else '❌ 失敗（仍在登入頁）'}")

        # 若失敗，印出 response 前 1000 字幫助診斷
        if not success:
            print("\n  Response 前 1000 字（診斷用）：")
            print(f"  {resp4.text[:1000]}")
        else:
            # 成功，顯示 session cookies
            all_cookies = dict(client.cookies)
            log("STEP 4", f"Session cookies：{all_cookies}")

        results["steps"].append({
            "step": 4, "name": "LOGIN_POST",
            "status": resp4.status_code, "time_ms": round(step4_time * 1000),
            "final_url": final_url, "success": success,
        })
        results["success"] = success

    except Exception as e:
        log("STEP 4", f"❌ 失敗：{e}")
        import traceback; traceback.print_exc()

    # ── 最終報告 ──────────────────────────────────────────────────────────────
    total_time = time.time() - _t_start
    print()
    print("=" * 60)
    print(f"  httpx 登入 Replay 測試結果")
    print("=" * 60)
    for step in results["steps"]:
        name = step["name"]
        if "time_ms" in step:
            print(f"  Step {step['step']} {name:25s}  {step['time_ms']} ms")
        elif "elapsed_s" in step:
            print(f"  Step {step['step']} {name:25s}  {step['elapsed_s']} s")
    print(f"  {'─'*40}")
    print(f"  總計耗時：{total_time:.1f}s")
    print()
    if results["success"]:
        print("  ✅ httpx 可以完全取代 Playwright 完成登入！")
        print("  ✅ 下一步：用 httpx 實作預約 API")
    else:
        print("  ❌ httpx 登入失敗")
        print()
        print("  可能原因：")
        print("  1. DoSubmit() 的 POST 欄位名稱與推測不符")
        print("     → 需要 Playwright NetworkCapture 確認實際 body")
        print("  2. Cloudflare 在伺服器端驗證 token 時也檢查 IP 或 fingerprint")
        print("     → token 由 CapSolver 解，但 POST 請求由不同 IP 發出")
        print("  3. /api/api_captcha.aspx 需要特定的 cookie 或 header")
        print("     → 檢查 Step 3 的 Set-Cookie 是否正確傳遞到 Step 4")

    # 儲存結果供分析
    results["total_time_s"] = round(total_time, 2)
    results["timestamp"] = datetime.datetime.now().isoformat()
    RESULT_FILE.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    print()
    print(f"  📁 詳細結果已儲存：{RESULT_FILE}")
    print("=" * 60)

    client.close()


if __name__ == "__main__":
    main()
