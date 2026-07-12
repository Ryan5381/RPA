"""
badminton_booking.py — 朝馬羽球場地自動預約（架構 v3）

架構層次：
  Browser Layer    — Playwright/patchright（persistent context per session）
  Capture Layer    — NetworkCapture（第一次執行記錄 DoSubmit() 等 API）
  Verification     — CapSolver（per-session token，不共用）
  Execution        — httpx（API first）→ Playwright UI（fallback）
  Concurrency      — threading.Barrier（精準同步 T=0）

Session State Machine：
  CREATED → WARMED → CAPTCHA_READY → LOGIN_READY → LOGIN_SUCCESS → BOOKING_SUCCESS
                                   ↘ FAILED（任何階段失敗）

動態 Solver 時機：
  start_before = P90(歷史解題時間) + 8s 緩衝
  由 LatencyTracker 自動調整，首次使用保守預設 15s
"""

from __future__ import annotations

import asyncio
import datetime
import json
import os
import random
import tempfile
import threading
import time
import urllib.request
from enum import Enum
from pathlib import Path
from typing import Optional

try:
    from patchright.sync_api import sync_playwright
    USING_PATCHRIGHT = True
except ImportError:
    from playwright.sync_api import sync_playwright
    USING_PATCHRIGHT = False

from tasks_dispatcher import log_execution, supabase
from .booking_api import (
    LatencyTracker,
    NetworkCapture,
    extract_aspnet_fields_from_page,
    validate_captcha_http,
    do_login_http,
    check_login_status_http,
    do_book_court_http,
    HTTPX_AVAILABLE,
    CAPTURE_FILE,
)

# ── 常數 ──────────────────────────────────────────────────────────────────────

CAPSOLVER_BASE_URL = "https://api.capsolver.com"
LOGIN_URL = "https://scr.cyc.org.tw/tp11.aspx?module=login_page&files=login&PT=1"
TURNSTILE_SITEKEY = "0x4AAAAAAAL0IWcUxrtPm2Ba"
MAX_SESSIONS = 2  # 先限制 2 session，確認成功率後再擴展
TOKEN_EXPIRE_MARGIN = 60  # token 剩餘有效期 < 60s 時重新解題

_TEMP_BASE = Path(tempfile.gettempdir()) / "rpa_badminton"


# ── SessionState ──────────────────────────────────────────────────────────────

class SessionState(Enum):
    CREATED         = "CREATED"
    WARMED          = "WARMED"          # 瀏覽器已開，頁面已載，帳密已填
    CAPTCHA_READY   = "CAPTCHA_READY"   # CapSolver token 已取得
    LOGIN_READY     = "LOGIN_READY"     # /api/api_captcha.aspx 驗證已通過
    LOGIN_SUCCESS   = "LOGIN_SUCCESS"   # 登入成功
    BOOKING_SUCCESS = "BOOKING_SUCCESS" # 預約成功
    FAILED          = "FAILED"


# ── CapSolver ─────────────────────────────────────────────────────────────────

def _capsolver_request(endpoint: str, payload: dict) -> dict:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        f"{CAPSOLVER_BASE_URL}{endpoint}",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())


def _solve_turnstile(api_key: str) -> tuple[Optional[str], float]:
    """
    解 Cloudflare Turnstile。
    返回 (token | None, elapsed_seconds)
    """
    t_start = time.time()
    try:
        resp = _capsolver_request("/createTask", {
            "clientKey": api_key,
            "task": {
                "type": "AntiTurnstileTaskProxyless",
                "websiteURL": LOGIN_URL,
                "websiteKey": TURNSTILE_SITEKEY,
            },
        })
    except Exception:
        return None, time.time() - t_start

    if resp.get("errorId", 0) != 0:
        return None, time.time() - t_start

    task_id = resp.get("taskId")
    for _ in range(120):
        time.sleep(1)
        try:
            result = _capsolver_request("/getTaskResult", {
                "clientKey": api_key,
                "taskId": task_id,
            })
        except Exception:
            continue
        status = result.get("status")
        if status == "ready":
            token = result.get("solution", {}).get("token")
            return token, time.time() - t_start
        elif status != "processing":
            return None, time.time() - t_start

    return None, time.time() - t_start


# ── BookingSession ────────────────────────────────────────────────────────────

class BookingSession:
    """
    每個 BookingSession 代表一個獨立的預約嘗試，擁有：
    - 獨立的 Chrome profile（不共用 cookies / fingerprint）
    - 獨立的 CapSolver token
    - 完整的 State Machine 生命週期
    - NetworkCapture（逆向工程用）
    """

    def __init__(
        self,
        idx: int,
        task_id: str,
        target_date: str = "2026/07/14",
        target_time_slot: str = "13",
        target_court: str = "2213",
    ) -> None:
        self.idx = idx
        self.task_id = task_id
        self.target_date = target_date
        self.target_time_slot = target_time_slot
        self.target_court = target_court

        # State Machine
        self.state: SessionState = SessionState.CREATED
        self.error: Optional[str] = None

        # Browser
        self._profile_dir = str(_TEMP_BASE / f"s{idx}")
        self._pw_ctx = None
        self._context = None
        self._page = None

        # Session Bindings（每個 session 獨立）
        self.cookies: dict = {}
        self.asp_session_id: Optional[str] = None
        self.viewstate: str = ""
        self.event_validation: str = ""
        self.viewstate_generator: str = ""
        self.captcha_token: Optional[str] = None
        self.captcha_ts: float = 0.0  # 取得 token 的時間戳

        # Network Capture
        self.capture = NetworkCapture()

        # Results
        self.login_url: Optional[str] = None

    # ── Logging ───────────────────────────────────────────────────────────────

    def _log(self, status: str, msg: str, t0: Optional[float] = None) -> None:
        if t0 is not None:
            delta = time.time() - t0
            sign = "+" if delta >= 0 else ""
            ts = f"[T{sign}{delta:.2f}s]"
        else:
            ts = f"[{datetime.datetime.now().strftime('%H:%M:%S.%f')[:-3]}]"
        log_execution(self.task_id, status, f"{ts}[S{self.idx}|{self.state.value}] {msg}")

    def _transition(self, new_state: SessionState, t0: Optional[float] = None) -> None:
        self._log("info", f"→ {new_state.value}", t0=t0)
        self.state = new_state

    def _fail(self, reason: str, t0: Optional[float] = None) -> None:
        self.error = reason
        self._log("error", f"FAILED: {reason}", t0=t0)
        self.state = SessionState.FAILED

    # ── Phase 1: CREATED → WARMED ─────────────────────────────────────────────

    def prewarm(self, user_id: str, password: str) -> bool:
        """
        開瀏覽器 → 載入登入頁 → 關閉彈窗 → 填帳密 → 取得 ViewState + cookies
        同時附加 NetworkCapture 監聽器（記錄 DoSubmit() 等請求）
        """
        if self.state != SessionState.CREATED:
            return False
        try:
            if USING_PATCHRIGHT:
                from patchright.sync_api import sync_playwright as _sp
            else:
                from playwright.sync_api import sync_playwright as _sp

            self._pw_ctx = _sp()
            p = self._pw_ctx.__enter__()
            os.makedirs(self._profile_dir, exist_ok=True)

            launch_args = {
                "user_data_dir": self._profile_dir,
                "headless": False,
                "slow_mo": 0,
                "args": [
                    "--disable-blink-features=AutomationControlled",
                    "--no-sandbox",
                    "--disable-infobars",
                    "--window-size=1280,800",
                ],
                "viewport": {"width": 1280, "height": 800},
                "locale": "zh-TW",
                "timezone_id": "Asia/Taipei",
            }

            try:
                self._context = p.chromium.launch_persistent_context(
                    channel="chrome", **launch_args
                )
            except Exception:
                self._context = p.chromium.launch_persistent_context(**launch_args)

            self._page = (
                self._context.pages[0]
                if self._context.pages
                else self._context.new_page()
            )
            self._page.on("dialog", lambda d: d.accept())

            # ── 掛上 NetworkCapture（記錄所有登入相關請求）
            self.capture.attach(self._page)

            # ── 前往登入頁面
            self._page.goto(LOGIN_URL, wait_until="domcontentloaded", timeout=30000)
            time.sleep(0.8)

            # ── 關閉防詐騙彈窗
            try:
                self._page.wait_for_selector(".swal2-confirm", timeout=5000)
                time.sleep(0.3)
                self._page.click(".swal2-confirm")
                time.sleep(0.3)
            except Exception:
                pass

            # ── 提取 ASP.NET hidden fields（ViewState 等）
            fields = extract_aspnet_fields_from_page(self._page)
            self.viewstate = fields.get("__VIEWSTATE", "")
            self.event_validation = fields.get("__EVENTVALIDATION", "")
            self.viewstate_generator = fields.get("__VIEWSTATEGENERATOR", "")
            self._log("info", f"ViewState 取得：{len(self.viewstate)} 字元")

            # ── 提取 cookies（ASP.NET_SessionId 等）
            raw_cookies = self._context.cookies()
            self.cookies = {c["name"]: c["value"] for c in raw_cookies}
            self.asp_session_id = self.cookies.get("ASP.NET_SessionId")
            self._log("info", f"ASP.NET_SessionId：{self.asp_session_id}")

            # ── 填寫帳號密碼
            try:
                self._page.wait_for_selector("#ContentPlaceHolder1_loginid", timeout=5000)
                self._type_fast(self._page, "#ContentPlaceHolder1_loginid", user_id)
                self._type_fast(self._page, "#loginpw", password)
            except Exception as e:
                self._fail(f"填寫帳密失敗：{e}")
                return False

            self._transition(SessionState.WARMED)
            return True

        except Exception as e:
            self._fail(f"Prewarm 失敗：{e}")
            return False

    @staticmethod
    def _type_fast(page, selector: str, text: str) -> None:
        page.click(selector)
        time.sleep(0.08)
        for ch in text:
            page.keyboard.type(ch)
            time.sleep(random.uniform(0.03, 0.08))

    # ── Phase 2: WARMED → CAPTCHA_READY ──────────────────────────────────────

    def solve_captcha(
        self,
        api_key: str,
        latency_tracker: LatencyTracker,
        t0: Optional[float] = None,
    ) -> bool:
        """解 Turnstile token，記錄延遲至 LatencyTracker"""
        if self.state not in (SessionState.WARMED, SessionState.CAPTCHA_READY):
            return False

        self._log("action", "🤖 CapSolver 解題中...", t0=t0)
        token, elapsed = _solve_turnstile(api_key)
        latency_tracker.record(elapsed)

        if not token:
            self._fail("CapSolver 解題失敗", t0=t0)
            return False

        self.captcha_token = token
        self.captcha_ts = time.time()
        self._log("action", f"✅ Token 已取得（耗時 {elapsed:.1f}s）", t0=t0)
        self._transition(SessionState.CAPTCHA_READY, t0=t0)
        return True

    def is_token_fresh(self) -> bool:
        """Token 是否仍在有效期內（留 TOKEN_EXPIRE_MARGIN 秒緩衝）"""
        if not self.captcha_token or not self.captcha_ts:
            return False
        age = time.time() - self.captcha_ts
        return age < (300 - TOKEN_EXPIRE_MARGIN)

    # ── Phase 3: CAPTCHA_READY → LOGIN_READY → LOGIN_SUCCESS ─────────────────

    def attack(
        self,
        user_id: str,
        password: str,
        t0: Optional[float] = None,
    ) -> bool:
        """
        T=0 攻擊：
        1. 注入 captchaToken cookie
        2. POST /api/api_captcha.aspx（httpx，若可用）
        3. POST 登入表單（httpx）→ Playwright fallback
        """
        if self.state != SessionState.CAPTCHA_READY:
            self._log("warning", "狀態不是 CAPTCHA_READY，跳過", t0=t0)
            return False

        if not self.is_token_fresh():
            self._log("warning", "Token 已接近過期，需重新解題", t0=t0)
            self._fail("Token 過期", t0=t0)
            return False

        # 更新 cookies dictionary（加入剛取得的 captchaToken）
        if self.captcha_token:
            self.cookies["captchaToken"] = self.captcha_token

        # ── 方案 A：httpx 直接 API 呼叫（毫秒級）
        if HTTPX_AVAILABLE:
            success = self._attack_http(user_id, password, t0=t0)
            if success:
                return True
            self._log("warning", "httpx 方案失敗，切換 Playwright fallback", t0=t0)

        # ── 方案 B：Playwright UI fallback
        return self._attack_playwright(t0=t0)

    def _inject_token_cookie(self) -> None:
        """將 captchaToken 注入 browser context cookie"""
        if not self._page or not self.captcha_token:
            return
        try:
            self._page.evaluate(f"""
                (() => {{
                    const d = new Date();
                    d.setTime(d.getTime() + (300 * 1000));
                    document.cookie = "captchaToken={self.captcha_token}; expires=" + d.toUTCString() + ";";
                }})();
            """)
        except Exception:
            pass

    def _attack_http(
        self,
        user_id: str,
        password: str,
        t0: Optional[float] = None,
    ) -> bool:
        """httpx 版攻擊：validate_captcha + do_login（非同步在同步 thread 中執行）"""
        self._log("action", "🚀 [httpx] POST /api/api_captcha.aspx...", t0=t0)

        # 在 thread 中執行 asyncio（每個 BookingSession 在自己的 thread 裡）
        loop = asyncio.new_event_loop()
        try:
            ok, resp_data = loop.run_until_complete(
                validate_captcha_http(self.captcha_token, self.cookies)
            )
        finally:
            loop.close()

        if not ok:
            self._log("warning", f"captcha 驗證失敗：{resp_data}", t0=t0)
            return False

        self._log("action", f"✅ captcha 驗證通過（{resp_data.get('status')}）", t0=t0)
        # 更新 cookies（伺服器可能設置新的）
        self.cookies = resp_data.get("cookies", self.cookies)
        self._transition(SessionState.LOGIN_READY, t0=t0)

        # POST 登入表單
        self._log("action", "🚀 [httpx] POST 登入表單...", t0=t0)
        loop2 = asyncio.new_event_loop()
        try:
            ok2, resp2 = loop2.run_until_complete(
                do_login_http(
                    user_id, password,
                    self.viewstate, self.event_validation, self.viewstate_generator,
                    self.cookies,
                )
            )
        finally:
            loop2.close()

        resp_snippet = resp2.get("resp_text", "")
        if ok2:
            self.login_url = resp2.get("url")
            self.cookies = resp2.get("cookies", self.cookies)
            self._log("success", f"✅ [httpx] 登入 AJAX 成功！回應摘要: {resp_snippet[:100]}", t0=t0)
            self._transition(SessionState.LOGIN_SUCCESS, t0=t0)

            # ── 下一步：驗證會員首頁狀態並過渡到預約成功/就緒流程
            self._log("action", "🚀 [下一步] 驗證會員首頁會話與進入場地預約流程...", t0=t0)
            loop3 = asyncio.new_event_loop()
            try:
                is_logged_in, ind_snippet = loop3.run_until_complete(
                    check_login_status_http(self.cookies)
                )
            finally:
                loop3.close()

            if is_logged_in:
                self._log("success", f"🎉 [授權確認] 會員會話驗證通過！進入最終下訂單驟...", t0=t0)
            else:
                self._log("info", f"✅ 登入步驟完成，首頁回應片段: {ind_snippet[:120]}", t0=t0)

            # ── 最終關卡: 毫秒級送出場地訂單 (StepFlag=25 & StepFlag=3)
            self._log("action", f"⚡ [秒殺下單] 日期:{self.target_date} 時段:{self.target_time_slot} 球場:{self.target_court}...", t0=t0)
            loop4 = asyncio.new_event_loop()
            try:
                book_ok, book_res = loop4.run_until_complete(
                    do_book_court_http(self.target_date, self.target_court, self.target_time_slot, self.cookies)
                )
            finally:
                loop4.close()

            if book_ok:
                self._log("success", f"🎉 [秒殺訂購成功] QPid({book_res.get('qpid_used')}) 預約成功！官網回應: {book_res.get('resp_snippet')[:100]}", t0=t0)
                self._transition(SessionState.BOOKING_SUCCESS, t0=t0)
                return True
            else:
                self._log("warning", f"⚠️ 官網送單回應未成功建立訂單！回應片段: {book_res.get('resp_snippet', str(book_res))[:180]}", t0=t0)
                return False
        else:
            self._log("warning", f"httpx 登入回應未通過驗證: HTTP {resp2.get('status')} 回應前150字: {resp_snippet[:150]}", t0=t0)
            return False

    def _attack_playwright(self, t0: Optional[float] = None) -> bool:
        """Playwright UI fallback：點擊登入按鈕"""
        if not self._page:
            return False
        try:
            self._log("action", "🖱️ [Playwright fallback] 點擊登入按鈕...", t0=t0)
            self._page.click("#login_but")
            self._page.wait_for_url(
                lambda url: (
                    "login_page" not in url
                    and "login" not in url.split("?")[0].lower()
                ),
                timeout=15_000,
            )
            self.login_url = self._page.url
            self._log("success", f"✅ 登入成功（UI）！{self.login_url}", t0=t0)
            self._transition(SessionState.LOGIN_SUCCESS, t0=t0)
            return True
        except Exception as e:
            self._fail(f"Playwright 登入失敗：{e}", t0=t0)
            return False

    # ── Fallback: 重新解題 ─────────────────────────────────────────────────────

    def re_solve_and_retry(
        self,
        api_key: str,
        user_id: str,
        password: str,
        latency_tracker: LatencyTracker,
        t0: Optional[float] = None,
    ) -> bool:
        """Fallback：重新解題後再嘗試一次登入"""
        self._log("action", "🔄 Fallback：重新解題中...", t0=t0)
        self.state = SessionState.WARMED  # 回退狀態讓 solve_captcha 可以執行
        if not self.solve_captcha(api_key, latency_tracker, t0=t0):
            return False
        return self.attack(user_id, password, t0=t0)

    # ── Cleanup ────────────────────────────────────────────────────────────────

    def cleanup(self, t0: Optional[float] = None) -> None:
        """關閉瀏覽器，儲存 NetworkCapture"""
        # 儲存 NetworkCapture（逆向工程用）
        capture_path = self.capture.save()
        if capture_path:
            self._log("info",
                f"📁 NetworkCapture 已儲存：{capture_path}（請分析 DoSubmit() 請求）",
                t0=t0,
            )
            # 嘗試找出登入 POST
            login_post = self.capture.get_login_post()
            if login_post:
                self._log("info",
                    f"🔍 發現登入 POST：{login_post.get('url')} "
                    f"body_raw 前 200 字：{str(login_post.get('body_raw',''))[:200]}",
                    t0=t0,
                )

        try:
            if self._context:
                self._context.close()
        except Exception:
            pass
        try:
            if self._pw_ctx:
                self._pw_ctx.__exit__(None, None, None)
        except Exception:
            pass


# ── 主流程 ────────────────────────────────────────────────────────────────────

def _run_badminton_bot_sync(task_id: str) -> None:
    mode = "(patchright ✓)" if USING_PATCHRIGHT else "(playwright)"
    log_execution(task_id, "start", f"🏸 羽球預約機器人啟動！{mode}")
    log_execution(task_id, "info",
        f"httpx: {'✓' if HTTPX_AVAILABLE else '✗ 未安裝（將使用 Playwright fallback）'}")

    # ── 讀取設定 ──────────────────────────────────────────────────────────────
    res = supabase.table("tasks").select("config").eq("id", task_id).execute()
    if not res.data:
        log_execution(task_id, "error", "找不到任務資料！")
        return
    config = res.data[0].get("config", {})

    user_id           = config.get("user_id", "")
    password          = config.get("password", "")
    capsolver_api_key = config.get("capsolver_api_key", "") or os.environ.get("CAPSOLVER_API_KEY", "")
    target_time_str   = config.get("target_time", "")
    session_count     = min(int(config.get("session_count", 1) or 1), MAX_SESSIONS)

    target_date       = config.get("target_date", "2026/07/14").replace("-", "/")
    target_time_slot  = config.get("target_time_slot", "13")
    target_court      = config.get("target_courts", "2213").split(",")[0]

    log_execution(task_id, "info", f"Session 數：{session_count} | 目標預訂：{target_date} 時段:{target_time_slot}")

    # ── LatencyTracker：動態解題時機 ─────────────────────────────────────────
    latency_tracker = LatencyTracker()
    log_execution(task_id, "info", latency_tracker.summary())

    # ── 計算各階段時間 ────────────────────────────────────────────────────────
    t0_ref: Optional[float] = None   # 目標時間的 UNIX timestamp
    prewarm_at: Optional[float] = None
    solve_at: Optional[float] = None

    if target_time_str:
        try:
            now = datetime.datetime.now()
            # 支援 'YYYY-MM-DD HH:MM:SS' 完整發動日期時間，或單純 'HH:MM:SS'
            if " " in target_time_str.strip():
                d_part, t_part = target_time_str.strip().split(" ", 1)
                y, mon, d = [int(x) for x in d_part.replace("/", "-").split("-")]
                parts = [int(p) for p in t_part.split(":")]
                h, m = parts[0], parts[1] if len(parts) > 1 else 0
                s = parts[2] if len(parts) > 2 else 0
                target_dt = datetime.datetime(year=y, month=mon, day=d, hour=h, minute=m, second=s)
            else:
                parts = [int(p) for p in target_time_str.strip().split(":")]
                h = parts[0]
                m = parts[1] if len(parts) > 1 else 0
                s = parts[2] if len(parts) > 2 else 0
                target_dt = now.replace(hour=h, minute=m, second=s, microsecond=0)
                if target_dt <= now:
                    target_dt += datetime.timedelta(days=1)

            t0_ref = target_dt.timestamp()
            start_before = latency_tracker.recommended_start_before()

            prewarm_at  = max(time.time(), t0_ref - 600)
            solve_at    = t0_ref - start_before

            log_execution(task_id, "info",
                f"⏰ 已設定定時搶單！發動時間：{target_dt.strftime('%Y-%m-%d %H:%M:%S')} | "
                f"解題時間：T-{start_before:.0f}s"
            )
        except Exception as e:
            log_execution(task_id, "warning", f"target_time 解析失敗（{e}），改為立即執行")

    def _wait_until(ts: float, label: str) -> None:
        wait = ts - time.time()
        if wait > 60:
            log_execution(task_id, "waiting",
                f"⏰ 等待 {label}（{wait:.0f}s 後）...")
            time.sleep(wait - 5)
        while time.time() < ts:
            time.sleep(0.01)

    # ── 建立 Sessions ─────────────────────────────────────────────────────────
    sessions = [
        BookingSession(i, task_id, target_date, target_time_slot, target_court)
        for i in range(session_count)
    ]

    # ── Phase 1: Pre-warm（T-10min 或立即）────────────────────────────────────
    if prewarm_at:
        _wait_until(prewarm_at, "Pre-warm（T-10min）")

    log_execution(task_id, "action",
        f"🌡️ [{datetime.datetime.now().strftime('%H:%M:%S')}] "
        f"開始預熱 {session_count} 個 Session...")

    prewarm_threads = [
        threading.Thread(
            target=lambda s=s: s.prewarm(user_id, password),
            daemon=True,
        )
        for s in sessions
    ]
    for t in prewarm_threads:
        t.start()
    for t in prewarm_threads:
        t.join()

    warmed = [s for s in sessions if s.state == SessionState.WARMED]
    log_execution(task_id, "action",
        f"✅ 預熱完成：{len(warmed)}/{session_count} 個 Session 就緒")

    if not warmed:
        log_execution(task_id, "error", "所有 Session 預熱失敗，中止")
        return

    # ── Phase 2: 解題（T-Xs 或立即）─────────────────────────────────────────
    if solve_at:
        _wait_until(solve_at, f"解題（T-{latency_tracker.recommended_start_before():.0f}s）")

    if capsolver_api_key:
        log_execution(task_id, "action",
            f"🤖 [{datetime.datetime.now().strftime('%H:%M:%S')}] "
            f"同時解 {len(warmed)} 個 Turnstile token...")

        solve_threads = [
            threading.Thread(
                target=lambda s=s: s.solve_captcha(capsolver_api_key, latency_tracker, t0=t0_ref),
                daemon=True,
            )
            for s in warmed
        ]
        for t in solve_threads:
            t.start()
        for t in solve_threads:
            t.join()

        ready = [s for s in warmed if s.state == SessionState.CAPTCHA_READY]
        log_execution(task_id, "action",
            f"✅ Token Pool 就緒：{len(ready)}/{len(warmed)} 個成功")

        # ── Phase 2.5: 過期檢查（T-5s 前確認）
        if t0_ref:
            _wait_until(t0_ref - 5, "最終 token 有效性確認（T-5s）")
        expired = [s for s in ready if not s.is_token_fresh()]
        if expired:
            log_execution(task_id, "warning",
                f"⚠️ {len(expired)} 個 token 即將過期，立即重新解題...")
            re_solve_threads = [
                threading.Thread(
                    target=lambda s=s: s.solve_captcha(capsolver_api_key, latency_tracker, t0=t0_ref),
                    daemon=True,
                )
                for s in expired
            ]
            for t in re_solve_threads:
                t.start()
            for t in re_solve_threads:
                t.join()
    else:
        log_execution(task_id, "warning", "未設定 CapSolver Key，跳過自動解題")
        ready = []

    # ── Phase 3: 等待 T=0，同時出擊 ─────────────────────────────────────────
    if t0_ref:
        _wait_until(t0_ref, "T=0 搶票時刻")

    attack_sessions = [s for s in warmed if s.state == SessionState.CAPTCHA_READY]
    if not attack_sessions and not capsolver_api_key:
        attack_sessions = warmed  # 沒有 CapSolver，直接用 Playwright fallback

    if not attack_sessions:
        log_execution(task_id, "error", "沒有準備好的 Session，中止")
        for s in sessions:
            s.cleanup(t0=t0_ref)
        return

    log_execution(task_id, "action",
        f"🚀 [{datetime.datetime.now().strftime('%H:%M:%S.%f')[:-3]}] "
        f"T=0！{len(attack_sessions)} 個 Session 同時出擊！")

    success_event = threading.Event()
    barrier = threading.Barrier(len(attack_sessions))

    def _attack(session: BookingSession) -> None:
        try:
            barrier.wait()  # 精準同步到毫秒
        except threading.BrokenBarrierError:
            return
        if success_event.is_set():
            return
        ok = session.attack(user_id, password, t0=t0_ref)
        if ok:
            success_event.set()

    attack_threads = [
        threading.Thread(target=_attack, args=(s,), daemon=True)
        for s in attack_sessions
    ]
    for t in attack_threads:
        t.start()
    for t in attack_threads:
        t.join()

    # ── Phase 4: Fallback ──────────────────────────────────────────────────────
    if not success_event.is_set() and capsolver_api_key:
        log_execution(task_id, "action", "🔄 Fallback：對失敗 Session 重新解題...")
        failed = [s for s in attack_sessions if s.state == SessionState.FAILED]
        fallback_threads = [
            threading.Thread(
                target=lambda s=s: (
                    success_event.set()
                    if s.re_solve_and_retry(capsolver_api_key, user_id, password, latency_tracker, t0=t0_ref)
                    else None
                ),
                daemon=True,
            )
            for s in failed
        ]
        for t in fallback_threads:
            t.start()
        for t in fallback_threads:
            t.join()

    # ── 結果 ──────────────────────────────────────────────────────────────────
    if success_event.is_set():
        log_execution(task_id, "success", "🎉 搶票任務完成！")
        log_execution(task_id, "info",
            f"📊 Session 狀態：{[(s.idx, s.state.value) for s in sessions]}")
    else:
        log_execution(task_id, "error", "❌ 所有 Session 均未成功")
        log_execution(task_id, "info",
            f"📊 失敗原因：{[(s.idx, s.error) for s in sessions if s.error]}")

    # ── Cleanup（儲存 NetworkCapture）────────────────────────────────────────
    for s in sessions:
        s.cleanup(t0=t0_ref)

    # ── LatencyTracker 統計 ────────────────────────────────────────────────────
    log_execution(task_id, "info", latency_tracker.summary())
    if CAPTURE_FILE.exists():
        log_execution(task_id, "info",
            f"📁 網路捕捉記錄：{CAPTURE_FILE}（可分析 DoSubmit() API payload）")


async def run_badminton_booking(task_id: str) -> None:
    """朝馬羽球場地自動預約（入口點）"""
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, _run_badminton_bot_sync, task_id)
