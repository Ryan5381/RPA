"""
inline_booking.py — inline.app 美食訂位半自動化腳本

流程：
1. 從 Supabase 讀取 task config（餐廳/分店/日期/時段/人數/姓名/電話）
2. 啟動 headed Playwright（顯示視窗，避免 PerimeterX headless 偵測）
3. 導航至 inline.app 訂位頁面，選擇分店
4. 選擇日期 → 時段 → 人數 → 填寫聯絡資訊 → 用餐目的
5. 點擊確認 → 偵測 PerimeterX「按住不放」→ 模擬長按 8 秒通過
6. 偵測到 OTP 畫面 → 更新 Supabase status 為 "waiting_otp"
7. Polling Supabase 等待使用者透過前端 UI 輸入 OTP
8. 填入 OTP → 完成訂位 → 截圖 → 更新狀態為 success/failed
"""

from __future__ import annotations

import asyncio
import os
import time
import random
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

# ── 餐廳資料庫（支援的 inline.app 餐廳與分店）────────────────────────────────

RESTAURANT_DB = {
    "islandbuffet": {
        "name": "島語自助餐廳",
        "company_id": "-NeqTSgDQOAYi30lg4a7:inline-live-3",
        "branches": {
            "taipei_hanlai": {
                "name": "台北漢來店",
                "branch_id": "-NeqTStJZDIBQHEMSDI8",
            },
            "kaohsiung_hanshin": {
                "name": "高雄漢神店",
                "branch_id": "-OUYVD5L8af9l-fOxBi5",
            },
            "taoyuan_taomall": {
                "name": "桃園台茂店",
                "branch_id": "-OfXjSw3386qiY1yTpOZ",
            },
            "taichung_hanshin": {
                "name": "台中漢神洲際店",
                "branch_id": "-OuaB8PT0YWMRAavQhfS",
            },
        },
    },
    # 未來可加入更多餐廳
    # "example_restaurant": {
    #     "name": "範例餐廳",
    #     "company_id": "...",
    #     "branches": { ... }
    # }
}

# 時段映射
SESSION_LABEL_MAP = {
    "midday": "午餐 (11:30–14:00)",
    "afternoon": "下午茶 (14:30–17:00)",
    "evening": "晚餐 (17:30–)",
}

# 用餐目的映射
PURPOSE_MAP = {
    "birthday": "慶生",
    "date": "約會",
    "anniversary": "週年慶",
    "family": "家庭用餐",
    "friends": "朋友聚餐",
    "business": "商務聚餐",
}

# OTP 等待超時（秒）
OTP_WAIT_TIMEOUT = 300  # 5 分鐘


# ── 主腳本 ────────────────────────────────────────────────────────────────────

async def run_inline_booking(task_id: str) -> None:
    """
    inline.app 半自動訂位主流程。
    由 scripts/__init__.py 的 dispatch_script 呼叫。
    """
    from supabase import create_client, Client
    from playwright.async_api import async_playwright

    supabase: Client = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_KEY"],
    )

    print(f"[inline_booking] 任務 {task_id} 開始執行")

    # 1. 從 Supabase 讀取任務設定
    try:
        task_resp = supabase.table("tasks").select("config").eq("id", task_id).execute()
        if not task_resp.data:
            raise ValueError(f"找不到任務 task_id={task_id}")
        config: dict = task_resp.data[0]["config"]
        print(f"[inline_booking] Config 讀取成功：{config}")
    except Exception as e:
        print(f"[inline_booking] ❌ 讀取任務失敗：{e}")
        _update_status(supabase, task_id, "failed", {"error": str(e)})
        return

    # 解析 config
    restaurant_key = config.get("restaurant_key", "islanduffet")
    branch_key = config.get("branch_key", "kaohsiung_hanshin")
    target_date = config.get("target_date", "")           # YYYY-MM-DD
    session = config.get("session", "evening")             # midday/afternoon/evening
    adults = int(config.get("adults", 2))
    kids = int(config.get("kids", 0))
    last_name = config.get("last_name", "")
    first_name = config.get("first_name", "")
    gender = config.get("gender", "小姐")                  # 小姐/先生/其他
    phone = config.get("phone", "")                        # 09xxxxxxxx
    email = config.get("email", "")
    purpose = config.get("purpose", "")                    # birthday/date/...

    # 取得餐廳/分店資訊
    restaurant = RESTAURANT_DB.get(restaurant_key)
    if not restaurant:
        _update_status(supabase, task_id, "failed", {"error": f"找不到餐廳 key: {restaurant_key}"})
        return

    branch = restaurant["branches"].get(branch_key)
    if not branch:
        _update_status(supabase, task_id, "failed", {"error": f"找不到分店 key: {branch_key}"})
        return

    company_id = restaurant["company_id"]
    branch_id = branch["branch_id"]
    booking_url = f"https://inline.app/booking/{company_id}/{branch_id}"

    print(f"[inline_booking] 目標餐廳：{restaurant['name']} - {branch['name']}")
    print(f"[inline_booking] 訂位 URL：{booking_url}")
    print(f"[inline_booking] 日期：{target_date}，時段：{session}，人數：{adults} 大 {kids} 小")

    _update_status(supabase, task_id, "running", {"step": "starting_browser"})

    # 2. 啟動 Playwright（headed 模式，避免 PX 偵測 headless）
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-web-security",
                "--disable-features=IsolateOrigins,site-per-process",
            ],
        )
        context = await browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/126.0.0.0 Safari/537.36"
            ),
            locale="zh-TW",
            timezone_id="Asia/Taipei",
        )

        # 注入 JS 抹除 webdriver 特徵
        await context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
            Object.defineProperty(navigator, 'languages', { get: () => ['zh-TW', 'zh', 'en-US'] });
            window.chrome = { runtime: {} };
        """)

        page = await context.new_page()

        try:
            # 3. 開啟訂位頁面
            print(f"[inline_booking] 導航至 {booking_url}")
            _update_status(supabase, task_id, "running", {"step": "navigating"})
            await page.goto(booking_url, wait_until="networkidle", timeout=30000)
            await _random_sleep(1.5, 2.5)

            # 4. 確認在正確的分店頁面（點擊對應分店卡片，如果顯示的是多店選擇頁）
            await _select_branch_if_needed(page, branch["name"])

            # 5. 點擊「線上訂位」tab（如果有服務類型選擇）
            await _select_service_tab(page)

            # 6. 選擇日期
            print(f"[inline_booking] 選擇日期：{target_date}")
            _update_status(supabase, task_id, "running", {"step": "selecting_date"})
            await _select_date(page, target_date)

            # 7. 選擇時段
            print(f"[inline_booking] 選擇時段：{session}")
            _update_status(supabase, task_id, "running", {"step": "selecting_session"})
            await _select_session(page, session)

            # 8. 選擇人數
            print(f"[inline_booking] 選擇人數：大人 {adults}，小孩 {kids}")
            _update_status(supabase, task_id, "running", {"step": "selecting_party_size"})
            await _select_party_size(page, adults, kids)

            # 9. 點擊確認時段/繼續（進入聯絡資訊頁）
            await _click_continue(page)

            # 10. 填寫聯絡資訊
            print(f"[inline_booking] 填寫聯絡資訊：{last_name}{first_name}，{phone}")
            _update_status(supabase, task_id, "running", {"step": "filling_contact_info"})
            await _fill_contact_info(page, last_name, first_name, gender, phone, email)

            # 11. 選擇用餐目的（可選）
            if purpose:
                await _select_purpose(page, purpose)

            # 12. 點擊送出/確認預訂
            _update_status(supabase, task_id, "running", {"step": "submitting"})
            await _click_submit(page)
            await _random_sleep(1.0, 2.0)

            # 13. 處理 PerimeterX「按住不放」挑戰
            print("[inline_booking] 檢查是否有 PerimeterX 按住不放挑戰...")
            _update_status(supabase, task_id, "running", {"step": "solving_px_challenge"})
            px_solved = await _solve_px_hold_challenge(page)
            if px_solved:
                print("[inline_booking] ✅ PerimeterX 挑戰通過")
            else:
                print("[inline_booking] ⚠️ 未偵測到 PX 挑戰或已自動通過")

            await _random_sleep(1.5, 2.5)

            # 14. 等待 OTP 畫面
            print("[inline_booking] 等待 OTP 輸入畫面...")
            _update_status(supabase, task_id, "running", {"step": "waiting_for_otp_screen"})
            otp_appeared = await _wait_for_otp_screen(page)

            if not otp_appeared:
                # 可能已直接完成（無 OTP）或發生錯誤
                screenshot_path = await _take_screenshot(page, task_id)
                page_title = await page.title()
                print(f"[inline_booking] ⚠️ OTP 畫面未出現，頁面標題：{page_title}")
                _update_status(supabase, task_id, "failed", {
                    "error": "OTP 畫面未出現，請確認電話號碼格式或頁面狀態",
                    "screenshot": screenshot_path,
                    "page_title": page_title,
                })
                return

            # 15. 通知前端等待 OTP 輸入
            print("[inline_booking] ⏳ OTP 畫面出現，等待使用者輸入驗證碼...")
            _update_status(supabase, task_id, "waiting_otp", {
                "step": "waiting_otp",
                "message": "請查看手機簡訊，在前端輸入 4 位數驗證碼",
            })

            # 16. Polling Supabase 等待 otp_code
            otp_code = await _wait_for_otp_code(supabase, task_id, timeout=OTP_WAIT_TIMEOUT)

            if not otp_code:
                screenshot_path = await _take_screenshot(page, task_id)
                _update_status(supabase, task_id, "failed", {
                    "error": f"等待 OTP 超時（{OTP_WAIT_TIMEOUT} 秒）",
                    "screenshot": screenshot_path,
                })
                return

            # 17. 填入 OTP
            print(f"[inline_booking] 填入 OTP：{otp_code}")
            _update_status(supabase, task_id, "running", {"step": "filling_otp"})
            await _fill_otp(page, otp_code)
            await _random_sleep(1.0, 2.0)

            # 18. 等待訂位完成
            print("[inline_booking] 等待訂位完成確認...")
            success = await _wait_for_booking_confirmation(page)
            screenshot_path = await _take_screenshot(page, task_id)

            if success:
                print("[inline_booking] ✅ 訂位成功！")
                _update_status(supabase, task_id, "success", {
                    "message": "訂位成功！",
                    "screenshot": screenshot_path,
                    "restaurant": restaurant["name"],
                    "branch": branch["name"],
                    "date": target_date,
                    "session": SESSION_LABEL_MAP.get(session, session),
                    "adults": adults,
                    "kids": kids,
                })
            else:
                page_content = await page.content()
                print("[inline_booking] ❌ 訂位可能失敗，請查看截圖")
                _update_status(supabase, task_id, "failed", {
                    "error": "訂位完成頁面確認失敗，請查看截圖",
                    "screenshot": screenshot_path,
                })

        except Exception as e:
            print(f"[inline_booking] ❌ 執行期間發生錯誤：{e}")
            try:
                screenshot_path = await _take_screenshot(page, task_id)
            except Exception:
                screenshot_path = None
            _update_status(supabase, task_id, "failed", {
                "error": str(e),
                "screenshot": screenshot_path,
            })
        finally:
            await asyncio.sleep(3)  # 讓使用者看到最終狀態
            await browser.close()
            print(f"[inline_booking] 任務 {task_id} 執行結束，瀏覽器已關閉")


# ── 輔助函式：頁面操作 ────────────────────────────────────────────────────────

async def _select_branch_if_needed(page, branch_name: str) -> None:
    """若頁面顯示多店選擇，點擊對應分店"""
    try:
        # inline.app 有時會先顯示所有分店列表
        branch_card = page.locator(f"text={branch_name}").first
        if await branch_card.is_visible(timeout=3000):
            await branch_card.click()
            await _random_sleep(1.0, 1.5)
            print(f"[inline_booking] 已選擇分店：{branch_name}")
    except Exception:
        pass  # 可能已在正確分店頁面


async def _select_service_tab(page) -> None:
    """點擊「線上訂位」tab（若有服務類型選擇頁）"""
    try:
        booking_tab = page.locator("text=線上訂位").first
        if await booking_tab.is_visible(timeout=3000):
            await booking_tab.click()
            await _random_sleep(0.8, 1.2)
    except Exception:
        pass


async def _select_date(page, target_date: str) -> None:
    """選擇訂位日期（YYYY-MM-DD 格式）"""
    if not target_date:
        return

    try:
        # 解析日期
        parts = target_date.split("-")
        year, month, day = int(parts[0]), int(parts[1]), int(parts[2])

        # inline.app 使用月曆選擇器，先導航到正確月份
        max_nav = 6
        for _ in range(max_nav):
            # 取得目前顯示月份
            month_label = await page.locator(".calendar-month, [class*='month-label'], [class*='CalendarMonth']").first.text_content(timeout=3000)
            if month_label and str(month) in month_label:
                break
            # 點擊下一個月
            next_btn = page.locator("button[aria-label*='next'], button[aria-label*='下一'], [class*='next-month']").first
            if await next_btn.is_visible(timeout=2000):
                await next_btn.click()
                await _random_sleep(0.5, 0.8)

        # 點擊對應日期
        # inline.app 的日期按鈕通常是 aria-label 包含日期或 data-date
        date_selectors = [
            f"[data-date='{target_date}']",
            f"[aria-label*='{day}']",
            f"button:has-text('{day}')",
        ]
        for selector in date_selectors:
            try:
                btn = page.locator(selector).first
                if await btn.is_visible(timeout=2000):
                    await btn.click()
                    await _random_sleep(0.8, 1.2)
                    print(f"[inline_booking] 日期 {target_date} 選擇成功")
                    return
            except Exception:
                continue

        print(f"[inline_booking] ⚠️ 無法自動選擇日期 {target_date}，請手動操作")
    except Exception as e:
        print(f"[inline_booking] 選擇日期時發生錯誤：{e}")


async def _select_session(page, session: str) -> None:
    """選擇用餐時段（midday / afternoon / evening）"""
    session_keywords = {
        "midday": ["午餐", "11:30", "Midday", "Lunch"],
        "afternoon": ["下午", "14:30", "Afternoon", "Tea"],
        "evening": ["晚餐", "17:30", "Evening", "Dinner"],
    }
    keywords = session_keywords.get(session, ["晚餐"])
    for kw in keywords:
        try:
            btn = page.locator(f"text={kw}").first
            if await btn.is_visible(timeout=2000):
                await btn.click()
                await _random_sleep(0.8, 1.2)
                print(f"[inline_booking] 時段選擇成功：{kw}")
                return
        except Exception:
            continue
    print(f"[inline_booking] ⚠️ 無法自動選擇時段 {session}")


async def _select_party_size(page, adults: int, kids: int) -> None:
    """選擇用餐人數（大人 + 小孩）"""
    try:
        # 找大人人數選擇器（通常是 +/- 按鈕或下拉選單）
        # 方法一：下拉選單
        adult_select = page.locator("select").filter(has_text="大人").first
        if await adult_select.is_visible(timeout=2000):
            await adult_select.select_option(str(adults))
        else:
            # 方法二：+/- 按鈕
            await _click_counter_to_value(page, "adult", adults)

        if kids > 0:
            kid_select = page.locator("select").filter(has_text="小孩").first
            if await kid_select.is_visible(timeout=2000):
                await kid_select.select_option(str(kids))
            else:
                await _click_counter_to_value(page, "kid", kids)

        await _random_sleep(0.5, 1.0)
    except Exception as e:
        print(f"[inline_booking] 選擇人數時發生錯誤：{e}")


async def _click_counter_to_value(page, label_keyword: str, target: int) -> None:
    """透過 +/- 按鈕將數值調整到目標值"""
    try:
        # 找包含 label 的容器
        container = page.locator(f"[class*='counter'], [class*='stepper']").filter(
            has_text=label_keyword
        ).first
        plus_btn = container.locator("button").last
        minus_btn = container.locator("button").first
        current_text = await container.locator("[class*='value'], span").first.text_content()
        current = int(current_text.strip()) if current_text and current_text.strip().isdigit() else 1

        diff = target - current
        if diff > 0:
            for _ in range(diff):
                await plus_btn.click()
                await asyncio.sleep(0.3)
        elif diff < 0:
            for _ in range(-diff):
                await minus_btn.click()
                await asyncio.sleep(0.3)
    except Exception as e:
        print(f"[inline_booking] 調整計數器失敗：{e}")


async def _click_continue(page) -> None:
    """點擊「繼續」/「下一步」按鈕進入聯絡資訊頁"""
    continue_keywords = ["繼續", "下一步", "Continue", "Next", "確認時段"]
    for kw in continue_keywords:
        try:
            btn = page.locator(f"button:has-text('{kw}')").first
            if await btn.is_visible(timeout=2000):
                await btn.click()
                await _random_sleep(1.0, 1.8)
                print(f"[inline_booking] 點擊「{kw}」進入下一步")
                return
        except Exception:
            continue


async def _fill_contact_info(
    page, last_name: str, first_name: str, gender: str, phone: str, email: str
) -> None:
    """填寫聯絡資訊（姓、名、性別、電話、Email）"""
    try:
        # 姓氏輸入框
        last_name_input = page.locator("input[placeholder='姓']").first
        if await last_name_input.is_visible(timeout=3000):
            await last_name_input.click()
            await last_name_input.fill(last_name)
            await _random_sleep(0.3, 0.6)

        # 名字輸入框
        first_name_input = page.locator("input[placeholder='名']").first
        if await first_name_input.is_visible(timeout=2000):
            await first_name_input.click()
            await first_name_input.fill(first_name)
            await _random_sleep(0.3, 0.6)

        # 性別選擇（Radio button）
        gender_map = {"小姐": "小姐", "先生": "先生", "其他": "其他"}
        gender_label = gender_map.get(gender, "小姐")
        try:
            gender_radio = page.locator(f"label:has-text('{gender_label}')").first
            if await gender_radio.is_visible(timeout=2000):
                await gender_radio.click()
                await _random_sleep(0.2, 0.4)
        except Exception:
            pass

        # 手機號碼（去除 0 前綴，inline 使用 +886）
        phone_input = page.locator("input[type='tel'], input[placeholder*='手機'], input[placeholder*='電話']").first
        if await phone_input.is_visible(timeout=3000):
            await phone_input.click()
            # inline.app 的電話格式：+886 後接去掉首位 0 的號碼
            phone_number = phone.lstrip("0") if phone.startswith("0") else phone
            await phone_input.fill(phone_number)
            await _random_sleep(0.3, 0.6)

        # Email（可選）
        if email:
            email_input = page.locator("input[type='email'], input[placeholder*='Email'], input[placeholder*='email']").first
            if await email_input.is_visible(timeout=2000):
                await email_input.click()
                await email_input.fill(email)
                await _random_sleep(0.3, 0.6)

        print(f"[inline_booking] 聯絡資訊填寫完成")
    except Exception as e:
        print(f"[inline_booking] 填寫聯絡資訊時發生錯誤：{e}")


async def _select_purpose(page, purpose: str) -> None:
    """選擇用餐目的"""
    purpose_text = PURPOSE_MAP.get(purpose, purpose)
    try:
        purpose_btn = page.locator(f"text={purpose_text}").first
        if await purpose_btn.is_visible(timeout=2000):
            await purpose_btn.click()
            await _random_sleep(0.3, 0.6)
            print(f"[inline_booking] 用餐目的：{purpose_text}")
    except Exception as e:
        print(f"[inline_booking] 選擇用餐目的失敗：{e}")


async def _click_submit(page) -> None:
    """點擊最終送出按鈕"""
    submit_keywords = ["送出", "確認預訂", "Submit", "Confirm", "預約", "完成"]
    for kw in submit_keywords:
        try:
            btn = page.locator(f"button:has-text('{kw}')").first
            if await btn.is_visible(timeout=2000):
                await btn.click()
                await _random_sleep(1.0, 1.5)
                print(f"[inline_booking] 點擊送出：{kw}")
                return
        except Exception:
            continue


async def _solve_px_hold_challenge(page) -> bool:
    """
    處理 PerimeterX「按住不放」人機驗證。
    偵測按鈕 → 模擬滑鼠長按 8 秒（加入微小隨機移動）。
    """
    hold_button_selectors = [
        "text=按住不放",
        "text=Press & Hold",
        "[class*='px-hold'], [class*='hold-button']",
        "button[id*='px']",
    ]

    for selector in hold_button_selectors:
        try:
            btn = page.locator(selector).first
            if await btn.is_visible(timeout=4000):
                print(f"[inline_booking] 偵測到 PX 按住不放按鈕，開始模擬長按...")
                box = await btn.bounding_box()
                if not box:
                    continue

                center_x = box["x"] + box["width"] / 2
                center_y = box["y"] + box["height"] / 2

                # 移動到按鈕上方
                await page.mouse.move(center_x, center_y)
                await asyncio.sleep(0.3)

                # 按下滑鼠
                await page.mouse.down()

                # 持續按住 8 秒（期間做微小移動模擬人類行為）
                hold_duration = 8.0
                start = time.time()
                while time.time() - start < hold_duration:
                    jitter_x = center_x + random.uniform(-1.5, 1.5)
                    jitter_y = center_y + random.uniform(-1.5, 1.5)
                    await page.mouse.move(jitter_x, jitter_y)
                    await asyncio.sleep(0.1)

                # 放開滑鼠
                await page.mouse.up()
                await _random_sleep(1.5, 2.5)
                print(f"[inline_booking] PX 長按完成（{hold_duration:.1f}s）")
                return True
        except Exception as e:
            print(f"[inline_booking] PX 挑戰處理錯誤：{e}")
            continue

    return False


async def _wait_for_otp_screen(page, timeout: float = 20.0) -> bool:
    """等待 OTP 輸入畫面出現"""
    otp_indicators = [
        "text=驗證碼",
        "text=OTP",
        "text=簡訊",
        "text=已將驗證碼傳送",
        "input[maxlength='1']",   # inline 通常用 4 個 maxlength=1 的輸入框
        "input[type='number'][maxlength='1']",
    ]
    deadline = time.time() + timeout
    while time.time() < deadline:
        for selector in otp_indicators:
            try:
                el = page.locator(selector).first
                if await el.is_visible(timeout=1000):
                    print(f"[inline_booking] OTP 畫面出現（偵測：{selector}）")
                    return True
            except Exception:
                continue
        await asyncio.sleep(0.8)
    return False


async def _wait_for_otp_code(
    supabase, task_id: str, timeout: float = 300.0
) -> Optional[str]:
    """
    Polling Supabase，等待前端透過 POST /api/tasks/{task_id}/otp 提交驗證碼。
    超時回傳 None。
    """
    deadline = time.time() + timeout
    poll_interval = 3.0
    print(f"[inline_booking] 開始 polling OTP（每 {poll_interval}s，最長 {timeout}s）...")

    while time.time() < deadline:
        try:
            resp = supabase.table("tasks").select("otp_code").eq("id", task_id).execute()
            if resp.data:
                otp_code = resp.data[0].get("otp_code")
                if otp_code and str(otp_code).strip():
                    print(f"[inline_booking] ✅ 收到 OTP：{otp_code}")
                    return str(otp_code).strip()
        except Exception as e:
            print(f"[inline_booking] Polling OTP 時發生錯誤：{e}")
        await asyncio.sleep(poll_interval)

    print("[inline_booking] ⏰ 等待 OTP 超時")
    return None


async def _fill_otp(page, otp_code: str) -> None:
    """將 4 位數 OTP 填入輸入框"""
    try:
        # inline.app 的 OTP 通常是 4 個獨立的單字元輸入框
        otp_inputs = await page.locator("input[maxlength='1']").all()
        if len(otp_inputs) >= 4:
            for i, char in enumerate(otp_code[:4]):
                await otp_inputs[i].click()
                await otp_inputs[i].fill(char)
                await asyncio.sleep(0.15)
            print(f"[inline_booking] OTP {otp_code} 填入完成（個別輸入框）")
            return

        # 備案：單一輸入框
        single_input = page.locator("input[type='number'], input[inputmode='numeric']").first
        if await single_input.is_visible(timeout=2000):
            await single_input.fill(otp_code)
            print(f"[inline_booking] OTP {otp_code} 填入完成（單一輸入框）")

        # 點擊確認
        await _random_sleep(0.5, 1.0)
        confirm_keywords = ["確認", "驗證", "Confirm", "Verify", "送出"]
        for kw in confirm_keywords:
            try:
                btn = page.locator(f"button:has-text('{kw}')").first
                if await btn.is_visible(timeout=2000):
                    await btn.click()
                    return
            except Exception:
                continue
    except Exception as e:
        print(f"[inline_booking] 填入 OTP 時發生錯誤：{e}")


async def _wait_for_booking_confirmation(page, timeout: float = 15.0) -> bool:
    """等待訂位完成確認頁面"""
    success_indicators = [
        "text=訂位成功",
        "text=預約成功",
        "text=已完成",
        "text=Booking confirmed",
        "text=Successfully",
        "[class*='success']",
        "[class*='confirmed']",
    ]
    deadline = time.time() + timeout
    while time.time() < deadline:
        for selector in success_indicators:
            try:
                el = page.locator(selector).first
                if await el.is_visible(timeout=1000):
                    return True
            except Exception:
                continue
        await asyncio.sleep(1.0)
    return False


async def _take_screenshot(page, task_id: str) -> Optional[str]:
    """截圖並存到 scripts/ 目錄"""
    try:
        screenshot_dir = Path(__file__).parent / "screenshots"
        screenshot_dir.mkdir(exist_ok=True)
        path = screenshot_dir / f"inline_{task_id}_{int(time.time())}.png"
        await page.screenshot(path=str(path), full_page=True)
        print(f"[inline_booking] 截圖已存：{path}")
        return str(path)
    except Exception as e:
        print(f"[inline_booking] 截圖失敗：{e}")
        return None


async def _random_sleep(min_s: float, max_s: float) -> None:
    """模擬人類操作的隨機延遲"""
    await asyncio.sleep(random.uniform(min_s, max_s))


# ── Supabase 狀態更新 ─────────────────────────────────────────────────────────

def _update_status(supabase, task_id: str, status: str, result: dict) -> None:
    """更新 Supabase tasks 表的 status 和 result 欄位"""
    try:
        supabase.table("tasks").update({
            "status": status,
            "result": result,
        }).eq("id", task_id).execute()
        print(f"[inline_booking] 狀態更新：{status} | {result}")
    except Exception as e:
        print(f"[inline_booking] 更新 Supabase 狀態失敗：{e}")
