import os
import re
import json
import base64
import asyncio
from pathlib import Path

import nodriver as uc
from nodriver import cdp

from tasks_dispatcher import log_execution, supabase
from utils.line_notifier import send_line_notification


# 針對拓元驗證碼樣式的專用 ddddocr 模型，來自開源專案 tickets_hunter
# （https://github.com/bouob/tickets_hunter），並非自行訓練——自己嘗試過用約 2000 張
# 圖片訓練，成功率只有 16%，時間也不夠，改採用這個現成模型。
# 放在 backend/models/ 底下，找不到就靜靜略過、退回通用模型，不影響原有行為。
_CUSTOM_MODEL_DIR = Path(__file__).parent.parent / "models"
_CUSTOM_ONNX_PATH = _CUSTOM_MODEL_DIR / "custom.onnx"
_CUSTOM_CHARSETS_PATH = _CUSTOM_MODEL_DIR / "charsets.json"

_custom_ocr_engine = None  # 模組層級快取，避免每次辨識都重新載入模型
_custom_ocr_load_failed = False


def _get_custom_ocr_engine():
    """延遲載入、快取拓元專用模型；載入失敗只記錄一次，之後直接跳過不再重試。"""
    global _custom_ocr_engine, _custom_ocr_load_failed
    if _custom_ocr_engine is not None or _custom_ocr_load_failed:
        return _custom_ocr_engine
    if not (_CUSTOM_ONNX_PATH.exists() and _CUSTOM_CHARSETS_PATH.exists()):
        _custom_ocr_load_failed = True
        return None
    try:
        import ddddocr

        _custom_ocr_engine = ddddocr.DdddOcr(
            show_ad=False,
            import_onnx_path=str(_CUSTOM_ONNX_PATH),
            charsets_path=str(_CUSTOM_CHARSETS_PATH),
        )
        print(f"[OCR] 已載入拓元專屬模型 (tickets_hunter): {_CUSTOM_ONNX_PATH}")
    except Exception as e:
        print(f"[OCR Error] 專用模型載入失敗，將退回通用模型: {e}")
        _custom_ocr_load_failed = True
    return _custom_ocr_engine


def _recognize_captcha_ocr(image_bytes: bytes) -> str:
    """
    優先使用針對拓元驗證碼樣式的專用模型辨識（來自開源專案 tickets_hunter）；
    模型不存在、載入失敗、或辨識不出乾淨的 4 碼結果時，
    退回通用 ddddocr 搭配多道影像前處理與嚴格校驗（保留原有邏輯當保險）。
    """
    # 0. 優先嘗試拓元專用模型（單一次辨識，不需要額外前處理——
    #    charsets.json 裡已定義好模型預期的圖片尺寸/色彩通道，ddddocr 會自動依此處理）
    custom_engine = _get_custom_ocr_engine()
    if custom_engine is not None:
        try:
            custom_res = custom_engine.classification(image_bytes)
            clean_custom = ''.join([c for c in (custom_res or "") if c.isalnum()])
            if len(clean_custom) == 4:
                return clean_custom
        except Exception as e:
            print(f"[OCR Error] 專用模型辨識失敗，將退回通用模型: {e}")

    try:
        import io
        import ddddocr
        from PIL import Image, ImageEnhance

        ocr = ddddocr.DdddOcr(show_ad=False)

        # 第一道：原始圖片直接辨識
        raw_res = ocr.classification(image_bytes)
        clean_raw = ''.join([c for c in (raw_res or "") if c.isalpha()])
        if len(clean_raw) == 4:
            return clean_raw.lower()

        # 第二道：圖片放大 2 倍並加強對比與銳利度 (改善邊緣模糊與雜訊)
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img_large = img.resize((img.width * 2, img.height * 2), Image.Resampling.LANCZOS)
        enhancer = ImageEnhance.Contrast(img_large)
        img_contrast = enhancer.enhance(2.5)

        buf = io.BytesIO()
        img_contrast.save(buf, format="PNG")
        res_contrast = ocr.classification(buf.getvalue())
        clean_contrast = ''.join([c for c in (res_contrast or "") if c.isalpha()])
        if len(clean_contrast) == 4:
            return clean_contrast.lower()

        # 第三道：轉為灰階高對比後辨識
        img_gray = img_contrast.convert("L")
        buf_gray = io.BytesIO()
        img_gray.save(buf_gray, format="PNG")
        res_gray = ocr.classification(buf_gray.getvalue())
        clean_gray = ''.join([c for c in (res_gray or "") if c.isalpha()])
        if len(clean_gray) == 4:
            return clean_gray.lower()

        # 若多道前處理後未能剛好辨識出 4 碼英文字母，傳回空字串觸發自動點圖刷新驗證碼
        return ""
    except Exception as e:
        print(f"[OCR Error] 驗證碼辨識失敗: {e}")
        return ""


# --- Yii2 驗證碼雜湊校驗 ---------------------------------------------------
# 拓元用 Yii2 框架，前端為了做即時驗證，會把「正確答案的雜湊值」放在頁面上
# （jQuery("body").data("yiiCaptcha/ticket/captcha")）。演算法是公開的，
# 我們可以在「送出之前」就檢查 OCR 結果對不對，避免用錯誤答案浪費一次提交；
# 而且雜湊是各字元加權和，單一字元辨識錯誤時還能反推出唯一正解直接修正。


def _yii_captcha_hash(code: str) -> int:
    """Yii2 CaptchaAction 的 generateValidationHash：sum(ord(c) << i)，且不分大小寫。"""
    return sum(ord(c) << i for i, c in enumerate(code.lower()))


def _yii_captcha_verify(answer: str, hash1: int) -> bool:
    return bool(answer) and len(answer) == 4 and _yii_captcha_hash(answer) == hash1


def _yii_captcha_edit1(pred: str, expected_hash: int) -> list:
    """找出與 expected_hash 相符、且只差一個字元的修正候選（字元集 a-z、長度 4）。

    因為雜湊是 sum(ord(c) << i)，固定其他三個字元後，剩下那一位的字元碼可被
    唯一反推出來，所以單字元辨識錯誤幾乎都能被救回來。
    """
    pred = pred.lower()
    length = 4
    if len(pred) != length:
        return []
    candidates = []
    for pos in range(length):
        fixed_sum = sum(ord(pred[j]) << j for j in range(length) if j != pos)
        remainder = expected_hash - fixed_sum
        shift = 1 << pos
        if remainder > 0 and remainder % shift == 0:
            c_code = remainder // shift
            if 97 <= c_code <= 122 and chr(c_code) != pred[pos]:
                corrected = list(pred)
                corrected[pos] = chr(c_code)
                candidates.append("".join(corrected))
    return candidates


_SAME_SITE_MAP = {
    "Strict": cdp.network.CookieSameSite.STRICT,
    "Lax": cdp.network.CookieSameSite.LAX,
    "None": cdp.network.CookieSameSite.NONE,
}


def _set_status(task_id: str, status: str) -> None:
    """更新 tasks.status（跟 flight_scraper.py 同一套慣例）。

    這支腳本原本只寫 execution_logs（畫面上的訊息流），從沒更新過 tasks.status，
    導致任務永遠停在 execute_task 設定的初始值 "running"：主控台看起來像卡住了，
    而 scripts/__init__.py 的 LINE 通知邏輯是靠檢查這個欄位是不是 success/failed
    才決定要不要發送，狀態沒被更新，通知自然永遠不會觸發。
    """
    try:
        supabase.table("tasks").update({"status": status}).eq("id", task_id).execute()
    except Exception as e:
        print(f"[tixcraft_booking] 無法更新 status：{e}")


def _set_result(task_id: str, result: dict) -> None:
    """把結構化的執行結果（節目名稱/場次/區域/張數/價格）寫回 tasks.result，
    跟 inline_booking.py 用同一個欄位。這裡額外放一個 line_notified 標記——
    scripts/__init__.py 的通用 LINE 通知看到這個標記就會跳過它自己的制式訊息，
    避免這支腳本自己發了一則有節目資訊的通知後，又被發一則沒有內容的重複通知。
    """
    try:
        supabase.table("tasks").update({"result": result}).eq("id", task_id).execute()
    except Exception as e:
        print(f"[tixcraft_booking] 無法更新 result：{e}")


def _extract_ticket_price(area_label: str) -> str:
    """從區域列文字（例如 'Sunshine Hill 3樓B區980 剩餘 46'）擷取票價。
    拓元的區域標籤把價格直接接在區域名稱後面，緊接著才是「剩餘/已售完」等狀態字樣，
    所以用「剩餘/已售完前面那組數字」當作票價，而不是後面的剩餘張數。"""
    match = re.search(r"(\d+)\s*(?:剩餘|已售完|no tickets available|sold out)", area_label, re.IGNORECASE)
    return match.group(1) if match else ""


def _load_storage_state_cookies(path: str) -> list:
    """讀取 Playwright storage_state 格式的登入憑證檔，轉成 nodriver/CDP 的 CookieParam 清單"""
    if not os.path.exists(path):
        return []
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception:
        return []

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


async def _find_by_text_or_css(tab, css_selectors=(), texts=(), timeout: float = 3, poll_interval: float = 0.4):
    """在同一個總時限內反覆巡覽所有候選（CSS 選擇器 + 文字），任一個先出現就立刻回傳。

    注意：每次巡覽對單一候選只用很短的 timeout 探測一次，不對每個候選各自套用
    完整的 timeout——否則 N 個候選 × timeout 秒會疊加成非常長的總等待時間
    （例如 6 個候選、每個 25 秒，全部找不到時實際要等 150 秒），這對分秒必爭
    的搶票場景是不可接受的，也會拖到 nodriver 跟瀏覽器的連線逾時中斷。
    """
    probe_timeout = 0.3
    elapsed = 0.0
    while True:
        for sel in css_selectors:
            try:
                el = await tab.select(sel, timeout=probe_timeout)
                if el:
                    return el
            except Exception:
                continue
        for text in texts:
            try:
                el = await tab.find(text, timeout=probe_timeout)
                if el:
                    return el
            except Exception:
                continue
        if elapsed >= timeout:
            return None
        await tab.sleep(poll_interval)
        elapsed += poll_interval


async def _wait_until_url_contains(tab, substr: str, timeout: float = 10, interval: float = 0.5) -> bool:
    """輪詢等待網址包含指定字串，最長等待 timeout 秒；網頁背後常有風控驗證要跑，
    給足夠耐心比固定睡幾秒後就放棄更可靠。回傳最後是否等到。"""
    elapsed = 0.0
    while elapsed < timeout:
        if substr in tab.url:
            return True
        await tab.sleep(interval)
        elapsed += interval
    return substr in tab.url


async def _run_tixcraft_bot(task_id: str):
    log_execution(task_id, "start", "🎟️ 拓元售票自動化搶票機器人啟動！準備讀取任務設定...")

    # 1. 從 Supabase 讀取任務設定 (Config)
    try:
        task_data = supabase.table("tasks").select("config").eq("id", task_id).execute()
        config = task_data.data[0]["config"] if task_data.data else {}
        log_execution(task_id, "start", "成功載入演唱會搶票任務設定")
    except Exception as e:
        config = {}
        log_execution(task_id, "error", f"無法讀取任務設定，使用預設值: {e}")

    activity_url = config.get("activity_url", "https://tixcraft.com/activity")
    target_date = config.get("target_date", "")
    target_area = config.get("target_area", "特區")
    ticket_count = str(config.get("ticket_count", "2"))
    auth_state_path = config.get("storage_state", "auth/tixcraft_state.json")

    browser = None
    try:
        # 2. 啟動實體 Chrome 瀏覽器
        #    改用 nodriver：它不透過 Selenium/Playwright 那種容易被偵測的 CDP 遙控模式
        #    （不注入 WebDriver 專屬旗標、不留下常見自動化痕跡），
        #    用真正安裝的 Chrome（如果找得到）取代 Playwright 內建的 Chromium。
        chrome_path = Path("C:/Program Files/Google/Chrome/Application/chrome.exe")
        browser = await uc.start(
            headless=False,
            browser_executable_path=str(chrome_path) if chrome_path.exists() else None,
            browser_args=["--disable-dev-shm-usage"],
            lang="zh-TW",
        )

        # 載入已保存的 Cookie 狀態 (維持 Google/FB 會員登入)
        cookie_params = _load_storage_state_cookies(auth_state_path)
        if cookie_params:
            await browser.cookies.set_all(cookie_params)
            log_execution(task_id, "start", f"已載入會員登入授權憑證: {auth_state_path}")
        else:
            log_execution(task_id, "start", "提示：未偵測到預先儲存的會員 Cookie，若需登入請先於瀏覽器完成登入")

        # 3. 直達活動場次頁面 (/activity/game/...)，省去簡介頁點擊轉址的時間
        if "/activity/detail/" in activity_url:
            activity_url = activity_url.replace("/activity/detail/", "/activity/game/")
            log_execution(task_id, "action", f"為極速搶票，自動轉換至場次表直達網址: {activity_url}")

        log_execution(task_id, "navigating", f"正在直接前往場次購票頁面: {activity_url}")
        tab = await browser.get(activity_url)

        await tab.sleep(2)

        # 偵測是否被 Akamai Bot Manager 風控攔截：用分頁標題判斷比整頁原始碼找關鍵字準確，
        # 因為風控 JS 函式庫本身可能就寫死含有這些關鍵字，就算沒被攔截也會在原始碼裡出現。
        page_title = await tab.evaluate("document.title")
        if "Browsing Activity Has Been Paused" in (page_title or "") or "unusual behavior" in (page_title or ""):
            log_execution(task_id, "error", "⚠️ 偵測到 Akamai / Ticketmaster 風控攔截畫面！請在彈出的瀏覽器視窗完成驗證，或切換手機 4G/5G 網路 IP 後再試")

        # 檢查登入狀態：未登入時拓元點「立即訂購」會彈出登入視窗、頁面停在原地不動，
        # 症狀跟「找不到按鈕」很像但成因完全不同，所以這裡先明確驗證並記錄下來。
        try:
            is_logged_in = await tab.evaluate(
                "!!document.querySelector(\"a[href*='logout']\")"
            )
        except Exception:
            is_logged_in = None
        if is_logged_in is False:
            log_execution(task_id, "error", "⚠️ 目前是【未登入】狀態！憑證 auth/tixcraft_state.json 可能已過期，請重新執行 setup_tixcraft_login.py 匯出登入狀態，否則點擊購票按鈕會被擋下")
        elif is_logged_in:
            log_execution(task_id, "action", "已確認會員登入狀態有效")

        # 取節目名稱，供成功時的 LINE 通知使用（活動頁面的 <h1 id="synopsisEventTitle">
        # 比 document.title 乾淨，title 常會多帶「| tixcraft拓元售票」這類尾綴）
        event_title = ""
        try:
            event_title = await tab.evaluate(
                "(document.querySelector('#synopsisEventTitle') || {}).innerText || document.title || ''"
            )
            event_title = (event_title or "").strip()
        except Exception:
            pass

        # 如果還停留在活動簡介首頁 (/activity/detail/...)，才需要找「立即購票」分頁點過去；
        # 若已經在場次表頁面 (/activity/game/...，我們一開始就強制轉址過來了)，這裡就不必再找，
        # 否則會誤點到場次列表裡同樣寫著「立即訂購」文字的購票按鈕，導致提早跳轉到選區頁面。
        if "/activity/game/" not in tab.url:
            buy_tab_el = await _find_by_text_or_css(
                tab,
                css_selectors=["a[href*='/activity/game/']", "li.buy a"],
                texts=["立即購票", "Buy Tickets"],
                timeout=8,
            )
            if buy_tab_el:
                log_execution(task_id, "action", "點擊活動頁面【立即購票 / Buy Tickets】分頁進入場次表")
                await buy_tab_el.click()
                await tab.sleep(2)
            elif "/activity/detail/" in tab.url:
                game_url = tab.url.replace("/activity/detail/", "/activity/game/")
                log_execution(task_id, "action", f"自動切換至節目場次清單網址: {game_url}")
                tab = await tab.get(game_url)
                await tab.sleep(1.5)

        # 4. 場次選擇步驟 (尋找 Find tickets / 立即訂購 按鈕進入選區)
        log_execution(task_id, "action", f"尋找目標場次與進入選區按鈕 (Find tickets / 立即訂購): '{target_date or '預設第一場'}'")
        buy_btn_css = [
            "button[data-href*='/ticket/area/']",
            "a[href*='/ticket/area/']",
            "table.table button.btn-primary",
        ]
        buy_btn_text = ["立即訂購", "Find tickets", "立即購票", "Start ordering"]

        target_btn = None
        try:
            if target_date:
                # 用「整列」文字比對日期，而不是用 tab.find() 抓到日期文字本身所在的那個 <td>——
                # 場次表是 <tr><td>日期</td>...<td><button>立即訂購</button></td></tr> 的結構，
                # 按鈕跟日期文字不在同一個節點裡，直接對日期節點 query_selector 永遠找不到按鈕。
                date_variants = [target_date, target_date.replace("/", "-"), target_date.replace("-", "/")]
                try:
                    rows = await tab.select_all("#gameList tbody tr, table.table-bordered tbody tr", timeout=8)
                except Exception:
                    rows = []
                for row in rows or []:
                    row_text = row.text_all or ""
                    if not any(dt in row_text for dt in date_variants):
                        continue
                    for sel in buy_btn_css:
                        try:
                            candidate = await row.query_selector(sel)
                        except Exception:
                            candidate = None
                        if candidate:
                            target_btn = candidate
                            log_execution(task_id, "action", f"已成功匹配並定位到指定日期場次: {target_date}")
                            break
                    if target_btn:
                        break

            if not target_btn:
                log_execution(task_id, "action", "正在等待頁面購票按鈕顯示 (最長等待 25 秒以容許網頁渲染或背景風控驗證跑完)...")
                target_btn = await _find_by_text_or_css(tab, css_selectors=buy_btn_css, texts=buy_btn_text, timeout=25)

            if target_btn:
                data_href = target_btn.attrs.get("data-href") or target_btn.attrs.get("href")
                await target_btn.click()
                log_execution(task_id, "action", "已點擊【Find tickets / 立即訂購】按鈕，等待跳轉選區 (最長等待 10 秒)...")

                jumped = await _wait_until_url_contains(tab, "/ticket/area/", timeout=10)
                # 確保成功跳轉至選區頁面：若點擊事件未跳轉，直接使用 data-href 導航
                if not jumped and data_href and "/ticket/area/" in data_href:
                    full_url = data_href if data_href.startswith("http") else f"https://tixcraft.com{data_href}"
                    log_execution(task_id, "action", f"為確保穩定跳轉，直接導航至區域選擇頁面: {full_url}")
                    tab = await tab.get(full_url)
                    await tab.sleep(2)
                elif not jumped:
                    # 沒跳轉又拿不到 data-href，把當下實際狀態記下來（網址／標題／畫面上的提示訊息），
                    # 才能分辨是「被登入攔截」「尚未開賣」還是「按鈕點了沒反應」。
                    try:
                        alert_text = await tab.evaluate(
                            "(document.querySelector('.fancybox-message, .modal-body, .alert') || {}).innerText || ''"
                        )
                    except Exception:
                        alert_text = ""
                    log_execution(
                        task_id,
                        "error",
                        f"⚠️ 點擊後頁面未跳轉！目前網址: {tab.url}｜畫面提示訊息: {(alert_text or '(無)').strip()[:200]}",
                    )
            else:
                log_execution(task_id, "error", "當前頁面超過 25 秒仍找不到任何可用的【Find tickets / 立即訂購】按鈕 (可能是尚未開賣、售罄或處於驗證攔截中)")
        except Exception as e:
            log_execution(task_id, "error", f"選擇場次步驟遇到例外: {e}")

        # 驗證是否成功進入區域選擇或張數選擇頁面
        reached_area_or_ticket = False
        area_click_succeeded = False
        ticket_count_selected = False
        captcha_submitted = False
        selected_area_label = ""  # 實際選到的區域列文字，供成功通知顯示區域名稱與票價

        # 5. 區域選擇步驟 (/ticket/area/...)
        area_list_el = None
        try:
            area_list_el = await tab.select(".zone, .area-list", timeout=8)
        except Exception:
            pass

        if "/ticket/area/" in tab.url or area_list_el:
            reached_area_or_ticket = True

            SOLD_OUT_KEYWORDS = ["選購一空", "已售完", "no tickets available", "sold out"]

            def _is_sold_out(text: str) -> bool:
                lower = text.lower()
                return any(kw.lower() in lower for kw in SOLD_OUT_KEYWORDS)

            # 區域清單一律走 JS 取得／點擊，不經過 nodriver 的元素包裝：
            # 1) 只要一次往返就能拿到整份清單（搶票是毫秒之爭，N 次 CDP 呼叫太慢）
            # 2) 不受 nodriver 元素查詢的眉角影響（例如 .text 只取到第一個文字節點
            #    &nbsp;、跨網域廣告 iframe 讓查詢回傳 None 等），行為跟瀏覽器所見一致
            AREA_SELECTOR = "ul.area-list a, .zone a"

            async def _get_area_candidates():
                """回傳 (index, text) 清單；index 對應頁面上第幾個區域連結，供後續點擊用。"""
                try:
                    raw = await tab.evaluate(
                        f"""
                        JSON.stringify(
                            Array.from(document.querySelectorAll({AREA_SELECTOR!r})).map(
                                function (a, i) {{
                                    return {{ i: i, text: (a.innerText || a.textContent || '').trim() }};
                                }}
                            )
                        )
                        """
                    )
                except Exception:
                    raw = None
                if not raw:
                    return []
                try:
                    items = json.loads(raw)
                except Exception:
                    return []
                return [(it["i"], it["text"]) for it in items if it.get("text")]

            async def _click_area(index: int) -> bool:
                """依索引用 JS 觸發點擊，回傳是否真的點到元素。"""
                try:
                    ok = await tab.evaluate(
                        f"""
                        (function () {{
                            var els = document.querySelectorAll({AREA_SELECTOR!r});
                            var el = els[{index}];
                            if (!el) return false;
                            el.click();
                            return true;
                        }})()
                        """
                    )
                    return bool(ok)
                except Exception:
                    return False

            # 建立嘗試清單：首選 + 候補
            target_list = []
            if target_area:
                target_list.append({"area": target_area, "count": ticket_count, "label": "首選"})
            for idx, opt in enumerate(config.get("fallback_options", [])):
                if opt.get("target_area"):
                    target_list.append({
                        "area": opt.get("target_area", ""),
                        "count": str(opt.get("ticket_count", "2")),
                        "label": f"候補 {idx + 1}",
                    })
            if not target_list:
                target_list.append({"area": "", "count": ticket_count, "label": "自動選取"})

            candidates = await _get_area_candidates()
            log_execution(task_id, "action", f"畫面上共找到 {len(candidates)} 個票價區域選項")

            matched = False
            for target in target_list:
                t_area = target["area"]
                t_count = target["count"]
                t_label = target["label"]

                log_execution(task_id, "action", f"▶️ 開始嘗試 {t_label} (區域: {t_area or '不限'}, 張數: {t_count}張)")

                if not t_area:
                    continue
                try:
                    for area_index, text in candidates:
                        if t_area not in text or _is_sold_out(text):
                            continue
                        # 以點擊是否真的成功為準，不再「找到就當作選好了」
                        if not await _click_area(area_index):
                            log_execution(task_id, "warning", f"⚠️ 找到區域「{text}」但點擊失敗，改試下一個")
                            continue
                        matched = True
                        ticket_count = t_count
                        selected_area_label = text
                        log_execution(task_id, "action", f"🎯 成功鎖定並選取指定票價區域: {text}")
                        break
                    if matched:
                        break
                except Exception as e:
                    log_execution(task_id, "warning", f"⚠️ 嘗試 {t_label} 發生例外: {e}")

            if matched:
                area_click_succeeded = True
            else:
                # 全都失敗（或都售罄），選第一個非售罄的區域
                try:
                    # 注意用 is not None 判斷：索引 0（畫面上第一個區域）是合法值，
                    # 直接用真假值判斷會讓「第一個區域中選」被誤判成沒找到。
                    fallback_index, fallback_text = None, ""
                    for area_index, text in candidates:
                        if _is_sold_out(text):
                            continue
                        fallback_index, fallback_text = area_index, text
                        break
                    if fallback_index is not None and await _click_area(fallback_index):
                        area_click_succeeded = True
                        selected_area_label = fallback_text
                        log_execution(task_id, "action", f"⚠️ 所有指定區域均售罄或找不到，已自動選擇剩餘開放區域: {fallback_text}")
                    elif fallback_index is not None:
                        log_execution(task_id, "error", f"❌ 找到可購買區域「{fallback_text}」但點擊沒有生效")
                    else:
                        log_execution(task_id, "error", "❌ 當前所有票價區域皆顯示為售罄或找不到任何區域選項")
                except Exception as e:
                    log_execution(task_id, "error", f"區域選取異常: {e}")

            await tab.sleep(2)

        # 6. 張數選取與驗證碼步驟 (/ticket/ticket/...)
        ticket_select_el = None
        try:
            ticket_select_el = await tab.select("select[id^='TicketForm_ticketPrice']", timeout=8)
        except Exception:
            pass

        if "/ticket/ticket/" in tab.url or ticket_select_el:
            reached_area_or_ticket = True
            log_execution(task_id, "action", f"進入訂單票數選取頁面，自動選取張數: {ticket_count} 張")
            try:
                option_el = await tab.select(
                    f"select[id^='TicketForm_ticketPrice'] option[value='{ticket_count}']", timeout=2
                )
                if option_el:
                    await option_el.select_option()
                    ticket_count_selected = True
                    log_execution(task_id, "action", f"已完成張數選取：{ticket_count} 張")
            except Exception as e:
                log_execution(task_id, "error", f"選取票數發生問題: {e}")

            # 勾選同意會員服務條款
            try:
                agree_checkbox = await tab.select("input#TicketForm_agree", timeout=2)
                if agree_checkbox:
                    is_checked = await agree_checkbox.apply("(el) => el.checked")
                    if not is_checked:
                        await agree_checkbox.click()
                        log_execution(task_id, "action", "已自動勾選【我已閱讀並同意服務條款】")
            except Exception as e:
                log_execution(task_id, "error", f"勾選同意條款失敗: {e}")

            # 7. 驗證碼辨識：OCR + Yii2 雜湊校驗（送出前先確認答案正確，錯了就刷新重試）
            log_execution(task_id, "action", "正在定位驗證碼圖片 (#TicketForm_verifyCode-image) 並進行辨識...")

            async def _grab_captcha_bytes():
                """用 canvas 讀取驗證碼原始像素，而不是截圖。
                截圖是有損 JPEG、且抓到的是瀏覽器渲染後（可能被 CSS 縮放）的尺寸，
                跟模型預期的原始圖片不一致，會明顯拉低辨識率。"""
                try:
                    data_url = await tab.evaluate(
                        """
                        (async function() {
                            var img = document.getElementById('TicketForm_verifyCode-image');
                            if (!img || !img.src) return null;
                            if (img.naturalWidth === 0 || !img.complete) {
                                await new Promise(function(resolve) {
                                    var timer = setTimeout(resolve, 3000);
                                    img.onload = function() { clearTimeout(timer); resolve(); };
                                    img.onerror = function() { clearTimeout(timer); resolve(); };
                                });
                            }
                            if (img.naturalWidth === 0 || img.naturalHeight === 0) return null;
                            var canvas = document.createElement('canvas');
                            var context = canvas.getContext('2d');
                            canvas.width = img.naturalWidth;
                            canvas.height = img.naturalHeight;
                            context.drawImage(img, 0, 0);
                            return canvas.toDataURL();
                        })();
                        """,
                        await_promise=True,
                    )
                except Exception:
                    return None
                if data_url and "," in data_url:
                    return base64.b64decode(data_url.split(",", 1)[1])
                return None

            async def _reload_captcha():
                """用 Yii2 自己的 refresh 換一張新驗證碼。
                重要副作用：refresh 後 Yii2 會把新答案的雜湊寫進 body data，
                我們才能在送出前校驗答案（首次載入頁面時是取不到雜湊的）。"""
                try:
                    return bool(await tab.evaluate(
                        """
                        (async function() {
                            if (typeof jQuery === "undefined") return false;
                            var $img = jQuery("#TicketForm_verifyCode-image");
                            if (!$img.length || typeof $img.yiiCaptcha !== "function") return false;
                            var oldSrc = $img.attr("src") || "";
                            $img.yiiCaptcha("refresh");
                            for (var i = 0; i < 20; i++) {
                                await new Promise(function(r) { setTimeout(r, 100); });
                                if (($img.attr("src") || "") !== oldSrc) break;
                            }
                            return true;
                        })()
                        """,
                        await_promise=True,
                    ))
                except Exception:
                    return False

            async def _get_yii_hash():
                try:
                    result = await tab.evaluate(
                        """
                        (function() {
                            if (typeof jQuery === "undefined") return 0;
                            var data = jQuery("body").data("yiiCaptcha/ticket/captcha");
                            return (data && data[0]) ? data[0] : 0;
                        })()
                        """
                    )
                    return int(result) if result else 0
                except Exception:
                    return 0

            async def _solve_captcha_once():
                """辨識出一個「有把握」的答案，回傳 (答案, 是否經雜湊確認)。

                只在雜湊反推出【唯一】候選時才採用自動修正：實測顯示若把所有候選
                都拿來用，單字元錯誤雖能修回 68%，但也有 31.7% 會湊出雜湊相符卻
                實際錯誤的答案；限定候選唯一時修正率降為 45.7%，但錯誤率是 0%。
                寧可換一張重新辨識，也不要帶著假信心送出。
                """
                for attempt in range(1, 6):
                    captcha_bytes = await _grab_captcha_bytes()
                    if not captcha_bytes:
                        log_execution(task_id, "action", f"第 {attempt} 次取不到驗證碼圖片，換一張重試...")
                        if not await _reload_captcha():
                            return "", False
                        continue

                    candidate_code = _recognize_captcha_ocr(captcha_bytes)
                    hash1 = await _get_yii_hash()

                    if hash1 > 0 and len(candidate_code) == 4:
                        if _yii_captcha_verify(candidate_code, hash1):
                            log_execution(task_id, "action", f"第 {attempt} 次辨識為 '{candidate_code.lower()}'，通過雜湊校驗 ✅")
                            return candidate_code.lower(), True
                        fixes = _yii_captcha_edit1(candidate_code, hash1)
                        if len(fixes) == 1:
                            log_execution(task_id, "action", f"第 {attempt} 次辨識為 '{candidate_code}' 校驗不符，依雜湊反推出唯一解 '{fixes[0]}' ✅")
                            return fixes[0], True
                        if len(fixes) > 1:
                            log_execution(task_id, "action", f"第 {attempt} 次辨識為 '{candidate_code}'，雜湊反推出 {len(fixes)} 個候選無法確定，換一張重試...")
                        else:
                            log_execution(task_id, "action", f"第 {attempt} 次辨識為 '{candidate_code}' 未通過雜湊校驗，換一張重試...")
                    elif hash1 == 0 and len(candidate_code) == 4 and candidate_code.isalnum():
                        # 頁面上取不到雜湊時無從校驗，只能直接相信 OCR
                        log_execution(task_id, "action", f"第 {attempt} 次辨識為 '{candidate_code}'（頁面無雜湊可校驗，直接採用）")
                        return candidate_code, False
                    else:
                        log_execution(task_id, "action", f"第 {attempt} 次辨識結果 '{candidate_code}' 未達 4 碼標準，換一張重試...")

                    if not await _reload_captcha():
                        return "", False
                return "", False

            try:
                # 先主動刷新一次驗證碼，讓 Yii2 把答案雜湊寫進頁面，
                # 首次載入頁面時是取不到雜湊的，刷新後才有得校驗。
                await _reload_captcha()

                # 外層迴圈：送出後若被伺服器打回（雜湊只是前端便利機制，
                # 伺服器是拿真正的答案比對，仍可能不通過），自動換一張重新辨識再送。
                for submit_round in range(1, 4):
                    ocr_code, hash_verified = await _solve_captcha_once()
                    if len(ocr_code) != 4:
                        break

                    verified_note = "（已雜湊確認）" if hash_verified else "（未校驗）"
                    log_execution(task_id, "action", f"第 {submit_round} 次送出：填入驗證碼 '{ocr_code}' {verified_note}")

                    url_before = tab.url
                    verify_input = await tab.select("input#TicketForm_verifyCode", timeout=2)
                    if verify_input:
                        # 先清空再輸入，避免重試時殘留舊答案疊加成 8 碼
                        await verify_input.apply("(el) => { el.value = ''; }")
                        await verify_input.send_keys(ocr_code)
                    submit_btn = await _find_by_text_or_css(
                        tab, css_selectors=["button[type='submit']", "button.btn-green"], timeout=2
                    )
                    if not submit_btn:
                        log_execution(task_id, "error", "找不到送出按鈕，請於瀏覽器視窗手動完成")
                        break
                    await submit_btn.click()

                    # 確認伺服器有沒有收單：離開這一頁才算真的成功，
                    # 不再「按了送出就當作完成」。
                    await tab.sleep(1.5)
                    still_on_form = await tab.evaluate(
                        "!!document.querySelector('#TicketForm_verifyCode')"
                    )
                    if not still_on_form or tab.url != url_before:
                        captcha_submitted = True
                        log_execution(task_id, "success", f"✅ 驗證碼通過，已成功送出訂單！目前頁面: {tab.url}")
                        break

                    # 還停在同一張表單 -> 驗證碼被打回，抓錯誤訊息後重試
                    try:
                        err_text = await tab.evaluate(
                            "(document.querySelector('.help-block, .has-error, .alert-danger') || {}).innerText || ''"
                        )
                    except Exception:
                        err_text = ""
                    log_execution(
                        task_id,
                        "warning",
                        f"⚠️ 第 {submit_round} 次驗證碼未被接受{('：' + err_text.strip()[:80]) if err_text and err_text.strip() else ''}，換一張重新辨識...",
                    )
                    await _reload_captcha()

                if not captcha_submitted:
                    log_execution(task_id, "action", "自動辨識連續失敗，已保留瀏覽器視窗！請直接手動敲 4 碼按 Enter 完成結帳")
            except Exception as e:
                log_execution(task_id, "error", f"驗證碼辨識與處理失敗: {e}")

        # 依實際完成到哪一步給出誠實的最終狀態，不再只憑「有沒有到過某個頁面」就報成功
        # 同時把結果寫回 tasks.status——這支腳本以前只寫 execution_logs，從沒更新過
        # 這個欄位，導致主控台永遠顯示 running、LINE 通知也因為狀態沒變成
        # success/failed 而永遠不會被 scripts/__init__.py 的通用通知邏輯觸發。
        # 「success」觸發開關沿用設定頁的 LINE 通知設定（跟 scripts/__init__.py
        # 讀的是同一份 line_config.json），避免使用者關掉成功通知後這裡還是硬發。
        success_notify_enabled = True
        try:
            line_cfg_path = Path(__file__).parent.parent / "line_config.json"
            if line_cfg_path.exists():
                with open(line_cfg_path, "r", encoding="utf-8") as f:
                    success_notify_enabled = "success" in json.load(f).get("triggers", ["success", "fail"])
        except Exception:
            pass

        price = _extract_ticket_price(selected_area_label)
        price_line = f"💰 票價：NT${price} / 張\n" if price else ""
        info_lines = (
            f"🎫 節目：{event_title or '（未知節目）'}\n"
            f"📅 場次：{target_date or '（未指定）'}\n"
            f"📍 區域：{selected_area_label or '（未知區域）'}\n"
            f"🎟️ 張數：{ticket_count} 張\n"
            f"{price_line}"
        )

        if captcha_submitted:
            log_execution(task_id, "success", "🎉 拓元選票流程執行完畢！已自動完成選區、選張數並送出驗證碼，請確認結帳狀態")
            _set_status(task_id, "success")
            _set_result(task_id, {
                "line_notified": True,
                "event_title": event_title,
                "target_date": target_date,
                "area": selected_area_label,
                "ticket_count": ticket_count,
                "price": price,
            })
            if success_notify_enabled:
                send_line_notification(f"🎉 [RPA 拓元搶票] 搶票成功，請盡快至瀏覽器完成付款！\n{info_lines}")
        elif ticket_count_selected:
            log_execution(task_id, "success", "已完成選區與張數選取，驗證碼辨識信心不足，請於瀏覽器視窗手動輸入驗證碼完成結帳")
            _set_status(task_id, "success")
            _set_result(task_id, {
                "line_notified": True,
                "event_title": event_title,
                "target_date": target_date,
                "area": selected_area_label,
                "ticket_count": ticket_count,
                "price": price,
                "needs_manual_captcha": True,
            })
            if success_notify_enabled:
                send_line_notification(f"⚠️ [RPA 拓元搶票] 已選好區域與張數，驗證碼需要你手動輸入！\n{info_lines}請盡快到瀏覽器視窗完成，逾時視窗會自動關閉。")
        elif area_click_succeeded:
            log_execution(task_id, "error", "⚠️ 已選取票價區域，但未能進入張數/驗證碼頁面，請查看瀏覽器視窗確認實際狀況")
            _set_status(task_id, "failed")
        elif reached_area_or_ticket:
            log_execution(task_id, "error", "⚠️ 已進入選區頁面，但未能成功選取任何票價區域（可能全數售罄或找不到目標區域）")
            _set_status(task_id, "failed")
        else:
            log_execution(task_id, "error", "❌ 未能成功進入選區或選張數頁面！請確認活動是否開放購票，或是否遇到登入攔截")
            _set_status(task_id, "failed")

        # 延長等待時間至 60 秒以保留充裕時間確認與付款
        await tab.sleep(60)

    except Exception as e:
        log_execution(task_id, "error", f"執行發生錯誤: {str(e)}")
        _set_status(task_id, "failed")
    finally:
        if browser:
            try:
                browser.stop()
            except Exception:
                pass


def _run_in_dedicated_proactor_loop(task_id: str) -> None:
    """
    在獨立執行緒中建立一個全新的 ProactorEventLoop 來執行 nodriver。

    背景：這個專案的 uvicorn 在 Windows 上主事件迴圈用的是 SelectorEventLoop，
    不支援 asyncio 建立子行程（nodriver 底層靠這個機制啟動 Chrome），
    直接 await 會噴出訊息為空的 NotImplementedError。
    （flight_scraper.py 之前用 Playwright 也踩過同一個坑，是用完全不同的
    sync_playwright + run_in_executor 方式繞過；nodriver 沒有同步 API，
    所以這裡改成幫它另外開一個支援子行程的 event loop。）
    """
    loop = asyncio.ProactorEventLoop()
    try:
        asyncio.set_event_loop(loop)
        loop.run_until_complete(_run_tixcraft_bot(task_id))
    finally:
        loop.close()


async def run_tixcraft_booking(task_id: str):
    """FastAPI BackgroundTask 入口點"""
    await asyncio.to_thread(_run_in_dedicated_proactor_loop, task_id)
