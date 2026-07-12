"""
booking_api.py — HTTP API 層（API Reverse Engineering）

職責：
1. LatencyTracker     — 動態計算 CapSolver 啟動時機
2. NetworkCapture     — 攔截 Playwright 請求，自動記錄 DoSubmit() 等 API
3. validate_captcha   — 直接 POST /api/api_captcha.aspx（httpx）
4. do_login           — ASP.NET 登入表單 POST（httpx，payload 由 NetworkCapture 確認）
5. extract_aspnet     — 從頁面 HTML 提取 __VIEWSTATE 等 hidden fields
"""

from __future__ import annotations

import json
import re
import statistics
import time
from pathlib import Path
from typing import Optional

try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False

# ── 常數 ──────────────────────────────────────────────────────────────────────

BASE_URL = "https://scr.cyc.org.tw"
CAPTCHA_API_PATH = "/api/api_captcha.aspx"
LOGIN_PAGE_PATH = "/tp11.aspx"

_THIS_DIR = Path(__file__).parent
LATENCY_FILE = _THIS_DIR / ".capsolver_latency.json"
CAPTURE_FILE  = _THIS_DIR / ".network_capture.json"

# ── LatencyTracker ────────────────────────────────────────────────────────────

class LatencyTracker:
    """
    記錄歷史 CapSolver 解題時間，動態決定「T-X 秒前開始解題」。

    策略：
      start_before = P90_latency + BUFFER_SECONDS
    P90 比平均更保守，確保 99%+ 的情況 token 都在 T=0 前就緒。
    """

    MAX_HISTORY = 30
    DEFAULT_P90 = 15.0      # 若無歷史，假設 P90 = 15s
    BUFFER_SECONDS = 8.0    # 固定緩衝（包含 Barrier 等待、網路抖動）
    MIN_START_BEFORE = 20.0 # 最少提前 20 秒（即使歷史很快也不能太冒險）
    MAX_START_BEFORE = 50.0 # 最多提前 50 秒（避免 token 過期）

    def __init__(self) -> None:
        self._history: list[float] = self._load()

    def _load(self) -> list[float]:
        try:
            if LATENCY_FILE.exists():
                return json.loads(LATENCY_FILE.read_text(encoding="utf-8"))[-self.MAX_HISTORY:]
        except Exception:
            pass
        return []

    def record(self, latency_seconds: float) -> None:
        """記錄一次解題時間"""
        self._history.append(round(latency_seconds, 2))
        self._history = self._history[-self.MAX_HISTORY:]
        try:
            LATENCY_FILE.write_text(
                json.dumps(self._history, indent=2), encoding="utf-8"
            )
        except Exception:
            pass

    def p90(self) -> float:
        if len(self._history) < 3:
            return self.DEFAULT_P90
        s = sorted(self._history)
        idx = min(int(len(s) * 0.9), len(s) - 1)
        return s[idx]

    def recommended_start_before(self) -> float:
        """返回建議的「在 T=0 前多少秒開始解題」"""
        raw = self.p90() + self.BUFFER_SECONDS
        return max(self.MIN_START_BEFORE, min(raw, self.MAX_START_BEFORE))

    def summary(self) -> str:
        n = len(self._history)
        if n == 0:
            return f"[LatencyTracker] 無歷史資料，使用預設 P90={self.DEFAULT_P90}s"
        avg = statistics.mean(self._history)
        rec = self.recommended_start_before()
        return (
            f"[LatencyTracker] n={n} avg={avg:.1f}s p90={self.p90():.1f}s "
            f"→ 建議 T-{rec:.0f}s 開始解題"
        )


# ── NetworkCapture ────────────────────────────────────────────────────────────

class NetworkCapture:
    """
    攔截 Playwright 頁面的 HTTP 請求/回應，
    用於逆向分析 DoSubmit() 等 API 的完整 payload。

    使用方式：
        capture = NetworkCapture()
        capture.attach(page)
        # ... 執行登入操作 ...
        path = capture.save()
        login_payload = capture.get_login_post()
    """

    _CAPTURE_URLS = ("api_captcha", "tp11.aspx")

    def __init__(self) -> None:
        self._entries: list[dict] = []

    def attach(self, page) -> None:
        """將攔截器掛到 Playwright page"""

        def _on_request(req):
            url = req.url
            if not any(k in url for k in self._CAPTURE_URLS):
                return
            entry: dict = {
                "ts": round(time.time(), 3),
                "dir": "REQ",
                "method": req.method,
                "url": url,
                "headers": dict(req.headers),
            }
            try:
                if req.post_data:
                    # 嘗試解析為 JSON
                    try:
                        entry["body"] = json.loads(req.post_data)
                    except Exception:
                        entry["body_raw"] = req.post_data[:2000]
            except Exception:
                pass
            self._entries.append(entry)

        def _on_response(resp):
            url = resp.url
            if not any(k in url for k in self._CAPTURE_URLS):
                return
            entry: dict = {
                "ts": round(time.time(), 3),
                "dir": "RESP",
                "status": resp.status,
                "url": url,
                "headers": dict(resp.headers),
            }
            try:
                body_bytes = resp.body()
                if body_bytes:
                    try:
                        entry["body"] = json.loads(body_bytes)
                    except Exception:
                        entry["body_raw"] = body_bytes[:500].decode("utf-8", errors="replace")
            except Exception:
                pass
            self._entries.append(entry)

        page.on("request", _on_request)
        page.on("response", _on_response)

    def save(self) -> Optional[str]:
        """附加到 .network_capture.json，並返回路徑"""
        try:
            existing: list = []
            if CAPTURE_FILE.exists():
                try:
                    existing = json.loads(CAPTURE_FILE.read_text(encoding="utf-8"))
                except Exception:
                    existing = []
            existing.extend(self._entries)
            CAPTURE_FILE.write_text(
                json.dumps(existing, indent=2, ensure_ascii=False),
                encoding="utf-8",
            )
            return str(CAPTURE_FILE)
        except Exception as e:
            return None

    def get_login_post(self) -> Optional[dict]:
        """從捕捉到的資料中找出登入 POST（tp11.aspx 的 POST 請求）"""
        for entry in self._entries:
            if (
                entry.get("dir") == "REQ"
                and entry.get("method") == "POST"
                and "tp11.aspx" in entry.get("url", "")
                and "body_raw" in entry  # 表單 POST 是 body_raw
            ):
                return entry
        return None

    def entries(self) -> list[dict]:
        return list(self._entries)


# ── ASP.NET Hidden Fields 提取 ────────────────────────────────────────────────

def extract_aspnet_fields(html: str) -> dict[str, str]:
    """
    從 HTML 提取 ASP.NET WebForms 的 hidden input 欄位：
    __VIEWSTATE, __EVENTVALIDATION, __VIEWSTATEGENERATOR 等
    """
    result: dict[str, str] = {}
    pattern = re.compile(
        r'<input[^>]+name=["\'](__[A-Z_]+)["\'][^>]+value=["\'](.*?)["\']',
        re.IGNORECASE | re.DOTALL,
    )
    for match in pattern.finditer(html):
        result[match.group(1)] = match.group(2)
    # 反向也找一下（value 在 name 前的情況）
    pattern2 = re.compile(
        r'<input[^>]+value=["\'](.*?)["\'][^>]+name=["\'](__[A-Z_]+)["\']',
        re.IGNORECASE | re.DOTALL,
    )
    for match in pattern2.finditer(html):
        result[match.group(2)] = match.group(1)
    return result


def extract_aspnet_fields_from_page(page) -> dict[str, str]:
    """從 Playwright page 物件提取 ASP.NET hidden fields"""
    fields = {}
    for field_name in ["__VIEWSTATE", "__EVENTVALIDATION", "__VIEWSTATEGENERATOR"]:
        try:
            val = page.get_attribute(f"input[name='{field_name}']", "value")
            if val:
                fields[field_name] = val
        except Exception:
            pass
    return fields


# ── HTTP API 呼叫 ─────────────────────────────────────────────────────────────

_COMMON_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/126.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7",
    "Origin": BASE_URL,
    "Referer": f"{BASE_URL}/tp11.aspx?module=login_page&files=login&PT=1",
}


def _make_cookie_jar(cookies: dict) -> dict:
    """將 cookie dict 轉換為 httpx Cookies 相容格式"""
    return {k: v for k, v in cookies.items()}


async def validate_captcha_http(
    token: str,
    cookies: dict,
    timeout: float = 8.0,
) -> tuple[bool, dict]:
    """
    POST /api/api_captcha.aspx { token } → { success: bool }
    
    這是 Cloudflare Turnstile server-side 驗證的第一步。
    驗證成功後，伺服器會在 session 中記錄「已通過驗證」。
    
    Returns: (success, response_data)
    """
    if not HTTPX_AVAILABLE:
        return False, {"error": "httpx 未安裝，請執行 pip install httpx"}

    headers = {
        **_COMMON_HEADERS,
        "Content-Type": "application/json",
    }
    try:
        async with httpx.AsyncClient(
            base_url=BASE_URL,
            cookies=cookies,
            headers=headers,
            follow_redirects=True,
            timeout=timeout,
            verify=False,  # 部分台灣政府/半官方網站 SSL 有問題
        ) as client:
            resp = await client.post(
                CAPTCHA_API_PATH,
                content=json.dumps({"token": token}).encode("utf-8"),
            )
            try:
                data = resp.json()
            except Exception:
                data = {"raw": resp.text[:200]}
            success = data.get("success", False)
            # 更新 cookies（伺服器可能設置新的 session cookie）
            new_cookies = dict(resp.cookies)
            merged = {**cookies, **new_cookies}

            print("=" * 60)
            print("[validate_captcha_http] HTTP status:", resp.status_code)
            print("[validate_captcha_http] Response   :", data)
            print("[validate_captcha_http] Set-Cookie header:", resp.headers.get("set-cookie", "無"))
            print("[validate_captcha_http] client.cookies   :", dict(client.cookies))
            print("=" * 60)

            return success, {"data": data, "cookies": merged, "status": resp.status_code}
    except Exception as e:
        return False, {"error": str(e)}


async def do_login_http(
    user_id: str,
    password: str,
    viewstate: str,
    event_validation: str,
    viewstate_generator: str,
    cookies: dict,
    timeout: float = 10.0,
) -> tuple[bool, dict]:
    """
    POST 登入表單 (根據 HTML DoSubmit() 原始碼精準模擬)
    - URL: /tp11.aspx?Module=login_page&files=login
    - 前端 DoSubmit() 只 append 了 loginid 與 loginpw
    - 且以 AJAX 接收逗號分隔字串 ("1,..."=帳密錯誤, "2,..."=訊息, "3,..."=改密碼)
    """
    if not HTTPX_AVAILABLE:
        return False, {"error": "httpx 未安裝，請執行 pip install httpx"}

    headers = {
        **_COMMON_HEADERS,
        "X-Requested-With": "XMLHttpRequest",
        "Origin": BASE_URL,
        "Referer": f"{BASE_URL}/tp11.aspx?Module=login_page&files=login",
    }

    # DoSubmit() 中僅有這兩個 FormData 欄位，無需 ViewState
    multipart_fields = {
        "loginid": (None, user_id),
        "loginpw": (None, password),
    }

    try:
        async with httpx.AsyncClient(
            base_url=BASE_URL,
            cookies=cookies,
            headers=headers,
            follow_redirects=True,
            timeout=timeout,
            verify=False,
        ) as client:
            print("=" * 60)
            print("[do_login_http] 發送 POST 前 client.cookies:")
            print(dict(client.cookies))
            print("=" * 60)

            resp = await client.post(
                "/tp11.aspx?Module=login_page&files=login",
                files=multipart_fields,
            )
            resp_text = resp.text.strip()
            final_url = str(resp.url)

            print("=" * 60)
            print("[do_login_http] HTTP status:", resp.status_code)
            print("[do_login_http] Final URL  :", final_url)
            print("[do_login_http] Response Cookies:", dict(resp.cookies))
            print("[do_login_http] Response Text (前 500 字):")
            print(resp_text[:500])
            print("=" * 60)

            # 根據 DoSubmit() 的成功判斷邏輯：
            # 回傳格式可能為逗號分隔代碼 (例如 "0", "1,密碼錯誤", "2,提示", "3,導向")
            success = False
            if resp.status_code == 200:
                parts = resp_text.split(",")
                code = parts[0].strip()
                # 當 AJAX 回傳 "0,0," 或 "0,..." 代表 ASP.NET 後端驗證成功
                if code == "0" or resp_text.startswith("0,"):
                    success = True
                elif code not in ("1", "2", "3") and "<html" not in resp_text.lower():
                    success = True
                elif "ind&files=ind" in final_url or "登出" in resp_text:
                    success = True

            new_cookies = dict(resp.cookies)
            merged = {**cookies, **new_cookies}
            return success, {
                "status": resp.status_code,
                "url": final_url,
                "cookies": merged,
                "success": success,
                "resp_text": resp_text[:500],
            }
    except Exception as e:
        return False, {"error": str(e)}


async def check_login_status_http(
    cookies: dict,
    timeout: float = 10.0,
) -> tuple[bool, str]:
    """
    登入後的下一步：驗證 Session 有效性並進入首頁 / 預約準備狀態
    """
    if not HTTPX_AVAILABLE:
        return False, "httpx 未安裝"

    headers = {
        **_COMMON_HEADERS,
        "Referer": f"{BASE_URL}/tp11.aspx?Module=login_page&files=login",
    }
    try:
        async with httpx.AsyncClient(
            base_url=BASE_URL,
            cookies=cookies,
            headers=headers,
            follow_redirects=True,
            timeout=timeout,
            verify=False,
        ) as client:
            resp = await client.get("/tp11.aspx?Module=ind&files=ind")
            text = resp.text
            is_logged_in = "登出" in text or "會員" in text or "預約查詢" in text
            return is_logged_in, text[:300]
    except Exception as e:
        return False, str(e)


async def do_book_court_http(
    date_str: str,
    court_id: str,
    time_slot: str,
    cookies: dict,
    timeout: float = 10.0,
) -> tuple[bool, dict]:
    """
    熱門時段羽球場地秒殺預約 API (完全根據官方網頁 JS 原始碼逆向)：
    1. Mapping 或自動解析 QPid 與 QTime (例如 '羽6' -> '88', '07' -> '7')
    2. 選擇場地時段進入確認資訊頁面 (StepFlag=25)
    3. 解析確認頁的 Step3TakeData 或代理單號，正式送出完成預約單 (StepFlag=3)
    """
    import re
    if not HTTPX_AVAILABLE:
        return False, {"error": "httpx 未安裝"}

    # 官方預設羽球場地代碼表 (根據使用者提供的官方網頁原始碼)
    COURT_ID_MAP = {
        "羽5": "87", "羽6": "88", "羽7": "2212", "羽8": "2213",
        "羽9": "2214", "羽10": "2215", "羽11": "2216", "羽12": "2217"
    }

    # 標準化時段代碼 (去前導零如 '07' -> '7')
    real_time = str(int(time_slot)) if time_slot.isdigit() else time_slot
    real_qpid = COURT_ID_MAP.get(court_id.strip(), court_id.strip())

    headers = {
        **_COMMON_HEADERS,
        "Referer": f"{BASE_URL}/tp11.aspx?module=net_booking&files=booking_place&StepFlag=2&PT=1&D={date_str}&D2=2",
    }
    try:
        async with httpx.AsyncClient(
            base_url=BASE_URL,
            cookies=cookies,
            headers=headers,
            follow_redirects=True,
            timeout=timeout,
            verify=False,
        ) as client:
            # 1. 如果仍不是數字，去列表頁抓取 Step3Action(QPid, QTime)
            if not real_qpid.isdigit():
                list_url = f"/tp11.aspx?module=net_booking&files=booking_place&StepFlag=2&PT=1&D={date_str}&D2=2"
                resp_list = await client.get(list_url)
                matches = re.findall(r"Step3Action\((\d+),\s*" + re.escape(real_time) + r"\)", resp_list.text)
                if matches:
                    real_qpid = matches[0]
                else:
                    return False, {"error": f"找不到時段 {real_time} 可預約的場地 QPid，該場地或時段目前可能無可預約名額。"}

            # 2. 選取指定場地時段進入確認預約資訊畫面 (StepFlag=25)
            url_step25 = f"/tp11.aspx?module=net_booking&files=booking_place&StepFlag=25&QPid={real_qpid}&QTime={real_time}&PT=1&D={date_str}"
            resp1 = await client.get(url_step25)

            # 3. 檢查確認頁是否有 Step3TakeData(divid, TargetUrl) 動態取得訂單單號 (ON)
            order_no = ""
            take_data_match = re.search(r"Step3TakeData\(['\"]?([^'\"),]+)['\"]?\s*,\s*['\"]?([^'\")]+)['\"]?\)", resp1.text)
            if take_data_match:
                divid, target_url = take_data_match.group(1), take_data_match.group(2)
                full_target_url = "https://tp11.xuanen.com.tw" + target_url
                proxy_url = f"/api/proxy.aspx?url={full_target_url}&divid={divid}"
                resp_proxy = await client.get(proxy_url)
                if "@" in resp_proxy.text:
                    order_no = resp_proxy.text.split("@")[1].strip()

            # 4. 發送最終確認訂單請求 (StepFlag=3)
            if order_no:
                url_step3 = f"/tp11.aspx?module=net_booking&files=booking_place&StepFlag=3&PT=1&D={date_str}&ON={order_no}"
            else:
                url_step3 = f"/tp11.aspx?module=net_booking&files=booking_place&PT=1&X=1&Y=527068&StepFlag=3&D={date_str}"
            resp2 = await client.get(url_step3)

            # 嚴格確認是否有產生預約成功文字或進入繳費畫面
            success = any(kw in resp2.text for kw in ["預約成功", "訂單", "繳費", "請選擇付費方式", "交易成功", "預約單號", "網路預約完成"])
            return success, {
                "status": resp2.status_code,
                "url": str(resp2.url),
                "qpid_used": real_qpid,
                "qtime_used": real_time,
                "order_no": order_no,
                "resp_snippet": resp2.text[:350],
            }
    except Exception as e:
        return False, {"error": str(e)}
