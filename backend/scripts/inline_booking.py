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
import re
import time
import random
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

from tasks_dispatcher import log_execution

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
    "wuma": {
        "name": "屋馬燒肉",
        "company_id": "-Kbsjto8qbSr0Yza-1gk:inline-live-wuma",
        "branches": {
            "wenxin": {
                "name": "屋馬燒肉文心店",
                "branch_id": "-KbyW5SmQykgA3BRcyCF",
            },
            "zhonggang": {
                "name": "屋馬燒肉中港店",
                "branch_id": "-KbyW5SxxkVi6Bf3dk8X",
            },
            "guoan": {
                "name": "屋馬燒肉國安店",
                "branch_id": "-KbyW5SzWAkzCNdWCmt4",
            },
            "chongde": {
                "name": "屋馬燒肉崇德店",
                "branch_id": "-Lv-4hj0uVLeKXYzkbJh",
            },
            "zhongyou": {
                "name": "屋馬燒肉中友店",
                "branch_id": "-LzG5ZHpkT3bldgr00Vh",
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

# OTP 等待超時（秒）
OTP_WAIT_TIMEOUT = 300  # 5 分鐘


# ── 主腳本 ────────────────────────────────────────────────────────────────────

async def _run_inline_bot(task_id: str) -> None:
    """
    inline.app 半自動訂位主流程。
    """
    from supabase import create_client, Client
    try:
        from patchright.async_api import async_playwright
    except ImportError:
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
    restaurant_key = config.get("restaurant_key", "islandbuffet")
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
    table_type = config.get("table_type", "")              # 一般/吧台板前（僅部分分店有此欄位）

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
    booking_url = (
        f"https://inline.app/booking/{company_id}/{branch_id}"
        if branch_id
        else f"https://inline.app/booking/{company_id}"
    )

    print(f"[inline_booking] 目標餐廳：{restaurant['name']} - {branch['name']}")
    print(f"[inline_booking] 訂位 URL：{booking_url}")
    print(f"[inline_booking] 日期：{target_date}，時段：{session}，人數：{adults} 大 {kids} 小")

    _update_status(supabase, task_id, "running", {"step": "starting_browser"})

    # 2. 啟動瀏覽器（headed 模式，避免 PX 偵測 headless）。
    # 改用 patchright（找不到就退回原生 playwright）：手動按住不放的挑戰能不能過，
    # 前提是瀏覽器本身沒有先被判定成自動化工具——這裡跟 tixcraft 踩的是同一種坑。
    # 原生 playwright 的 CDP 連線帶有 Runtime.enable 等自動化痕跡，PerimeterX 會
    # 直接偵測到，不管按住不放的手勢模擬得多逼真都沒用；手動用 JS 蓋掉
    # navigator.webdriver 這類 patch 本身也是可被偵測的訊號，反而弄巧成拙，
    # 所以這裡拿掉，改交給 patchright 在協定層處理。
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False, channel="chrome")
        context = await browser.new_context(
            viewport={"width": 1280, "height": 800},
            locale="zh-TW",
            timezone_id="Asia/Taipei",
        )

        page = await context.new_page()

        try:
            # 3. 開啟訂位頁面
            print(f"[inline_booking] 導航至 {booking_url}")
            _update_status(supabase, task_id, "running", {"step": "navigating"})

            # 用 domcontentloaded 而非 networkidle：inline.app 有持續不斷的背景
            # 請求（分析、PerimeterX 心跳），networkidle 要等網路完全靜止，實測
            # 光這一步就卡 12 秒；改用 domcontentloaded 只要 2.7 秒。
            # 後面改成「明確等待訂位選單出現」，比固定的隨機等待又快又可靠——
            # 該等的時候會等，頁面早就好了就立刻往下走。
            # 實測整體從 14.97s 縮短到 9.23s。
            await page.goto(booking_url, wait_until="domcontentloaded", timeout=30000)
            try:
                await page.locator("#adult-picker").wait_for(state="visible", timeout=20000)
            except Exception:
                # 選單沒出現不一定是失敗（可能是多分店選擇頁，要先點分店卡片），
                # 交給後續步驟處理，這裡只補一個短暫緩衝。
                await _random_sleep(1.0, 1.5)

            # 4. 確認在正確的分店頁面（點擊對應分店卡片，如果顯示的是多店選擇頁）
            await _select_branch_if_needed(page, branch["name"])

            # 5. 點擊「線上訂位」tab（如果有服務類型選擇）
            await _select_service_tab(page)

            # 6. 選擇人數（要排在日期/時段之前：改人數會讓時段清單重新篩選渲染，
            #    先選時段再改人數會把剛選好的時段清掉。順序跟頁面由上而下一致）
            print(f"[inline_booking] 選擇人數：大人 {adults}，小孩 {kids}")
            _update_status(supabase, task_id, "running", {"step": "selecting_party_size"})
            await _select_party_size(page, adults, kids)

            # 6-2. 選擇用餐桌型（只有部分分店有這個欄位，例如島語高雄漢神店）。
            #      要排在日期/時段之前：不同桌型的可訂日期與時段不一樣，
            #      先選好桌型，後面抓到的才是正確的可選清單。
            _update_status(supabase, task_id, "running", {"step": "selecting_table_type"})
            await _select_table_type(page, table_type)

            # 7. 選擇日期
            print(f"[inline_booking] 選擇日期：{target_date}")
            _update_status(supabase, task_id, "running", {"step": "selecting_date"})
            date_selected, date_fail_reason = await _select_date(page, target_date)
            if not date_selected:
                # 選不到目標日期就不能繼續——後面的時段/人數/送出全部都會
                # 套用在錯誤的日期上，不如在這裡就誠實回報並中止。
                # 回報 _select_date 給的實際原因，不要自己猜「可能額滿或公休」：
                # 這個猜測曾經把單純的月曆重繪競態講成餐廳沒位子，害人白跑一趟去對帳。
                screenshot_path = await _take_screenshot(page, task_id)
                _update_status(supabase, task_id, "failed", {
                    "error": f"無法選擇目標日期 {target_date}：{date_fail_reason}",
                    "screenshot": screenshot_path,
                })
                return

            # 7. 選擇時段
            print(f"[inline_booking] 選擇時段：{session}")
            _update_status(supabase, task_id, "running", {"step": "selecting_session"})
            if not await _select_session(page, session):
                # 時段沒選到就不能繼續——底下的「完成預訂」按鈕可能仍可點擊，
                # 但送出的會是空的或系統預設時段，不是使用者要的那一場。
                screenshot_path = await _take_screenshot(page, task_id)
                _update_status(supabase, task_id, "failed", {
                    "error": f"無法選擇目標時段 {session}（可能已額滿或頁面結構改變）",
                    "screenshot": screenshot_path,
                })
                return

            # 8. 點擊底部行動列的「完成預訂」（進入聯絡資訊頁）
            _update_status(supabase, task_id, "running", {"step": "clicking_continue"})
            if not await _click_continue(page):
                # 沒進到下一頁就不能繼續——後面填聯絡資訊、送出、等 OTP
                # 全都會在同一頁上空轉，最後誤報成「OTP 畫面未出現」。
                screenshot_path = await _take_screenshot(page, task_id)
                _update_status(supabase, task_id, "failed", {
                    "error": "找不到「完成預訂」按鈕，無法進入聯絡資訊頁（可能該時段已額滿或頁面結構改變）",
                    "screenshot": screenshot_path,
                })
                return

            # 9. 同意「規則與注意事項」彈窗（要先捲到底按鈕才會啟用）
            _update_status(supabase, task_id, "running", {"step": "accepting_house_rules"})
            if not await _accept_house_rules(page):
                screenshot_path = await _take_screenshot(page, task_id)
                _update_status(supabase, task_id, "failed", {
                    "error": "無法通過「規則與注意事項」彈窗，未能進入聯絡資訊頁",
                    "screenshot": screenshot_path,
                })
                return

            # 10. 填寫聯絡資訊
            print(f"[inline_booking] 填寫聯絡資訊：{last_name}{first_name}，{phone}")
            _update_status(supabase, task_id, "running", {"step": "filling_contact_info"})
            name_filled = await _fill_contact_info(page, last_name, first_name, gender, phone, email)
            if f"{last_name}{first_name}".strip() and not name_filled:
                # 姓名是必填欄位。填不進去就別再往下送——否則會在送出那一步
                # 以「找不到送出按鈕」之類不相干的理由失敗，看不出真正原因是這裡。
                screenshot_path = await _take_screenshot(page, task_id)
                _update_status(supabase, task_id, "failed", {
                    "error": "找不到訂位人姓名欄位，姓名未填入（表單版型可能已改變）",
                    "screenshot": screenshot_path,
                })
                return

            # 11. 選擇用餐目的（多數餐廳為必填，所以就算使用者選「不指定」
            #     也要進去挑一個預設選項，否則必填欄位空著會送不出去；
            #     這家餐廳沒有這個欄位時函式會自行放行）
            _update_status(supabase, task_id, "running", {"step": "selecting_purpose"})
            if not await _select_purpose(page, purpose):
                # 這是必填欄位，沒選到的話送出按鈕很可能維持停用，若不在這裡
                # 攔下來，只會在後面 _click_submit 冒出一個不相干的「找不到
                # 送出按鈕」錯誤訊息，讓人搞不清楚真正原因是這裡。
                screenshot_path = await _take_screenshot(page, task_id)
                _update_status(supabase, task_id, "failed", {
                    "error": "無法選擇用餐目的（必填欄位），可能導致送出按鈕維持停用",
                    "screenshot": screenshot_path,
                })
                return

            # 12. 點擊送出/確認預訂
            _update_status(supabase, task_id, "running", {"step": "submitting"})
            submit_clicked = await _click_submit(page)
            if not submit_clicked:
                # 表單根本沒送出，不能再往下走 PX 挑戰／等 OTP，
                # 那只會誤判成功並跳出根本不存在的驗證碼畫面。
                screenshot_path = await _take_screenshot(page, task_id)
                page_title = await page.title()
                print(f"[inline_booking] ❌ 找不到送出按鈕，頁面標題：{page_title}")
                _update_status(supabase, task_id, "failed", {
                    "error": "找不到送出/確認預訂按鈕，表單未送出，請確認頁面上按鈕文字",
                    "screenshot": screenshot_path,
                    "page_title": page_title,
                })
                return
            await _random_sleep(1.0, 2.0)

            # 12-2. 送出後先確認表單有沒有跳出欄位驗證錯誤。
            #       按鈕確實點下去了不代表表單有送出——欄位格式不對時
            #       inline.app 只會在欄位下方顯示紅字，頁面停在原地。
            #       但只有在「OTP 畫面還沒出現」時才需要這個檢查：OTP 畫面一旦
            #       出現就代表表單已經送出成功了，此時頁面上的提示文字（例如
            #       「請填寫4位數驗證碼」）屬於正常流程，不能當成欄位錯誤。
            otp_already_up = await _is_otp_screen_present(page)
            validation_error = "" if otp_already_up else await _find_form_validation_error(page)
            if validation_error:
                screenshot_path = await _take_screenshot(page, task_id)
                print(f"[inline_booking] ❌ 表單驗證未通過：{validation_error}")
                _update_status(supabase, task_id, "failed", {
                    "error": f"表單欄位驗證未通過，訂位未送出：{validation_error}（請檢查任務設定的聯絡資訊）",
                    "screenshot": screenshot_path,
                })
                return

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
                # 不是每家餐廳都需要簡訊驗證碼——沒出現 OTP 畫面有兩種可能：
                # (a) 這家餐廳不需要 OTP，送出後直接完成訂位
                # (b) 真的出了問題（電話格式錯、頁面卡住等）
                # 原本這裡不分青紅皂白一律當失敗，會讓「不需要 OTP、其實訂位
                # 已經成功」的餐廳被誤判。改成先檢查訂位確認頁面是否已經出現。
                print("[inline_booking] OTP 畫面未出現，檢查是否已直接完成訂位（此餐廳可能不需要簡訊驗證）...")
                success = await _wait_for_booking_confirmation(page, timeout=10.0)
                screenshot_path = await _take_screenshot(page, task_id)

                if success:
                    print("[inline_booking] ✅ 訂位成功！（此餐廳不需要簡訊驗證碼）")
                    _update_status(supabase, task_id, "success", {
                        "message": "訂位成功！（此餐廳不需要簡訊驗證碼）",
                        "screenshot": screenshot_path,
                        "restaurant": restaurant["name"],
                        "branch": branch["name"],
                        "date": target_date,
                        "session": SESSION_LABEL_MAP.get(session, session),
                        "adults": adults,
                        "kids": kids,
                    })
                else:
                    page_title = await page.title()
                    print(f"[inline_booking] ⚠️ OTP 畫面未出現，也未偵測到訂位完成，頁面標題：{page_title}")
                    _update_status(supabase, task_id, "failed", {
                        "error": "OTP 畫面未出現，也未偵測到訂位完成，請確認電話號碼格式或頁面狀態",
                        "screenshot": screenshot_path,
                        "page_title": page_title,
                    })
                return

            # 15. 通知前端等待 OTP 輸入
            # 這裡先存一張截圖：如果之後又發生「跳出 OTP 但根本沒送出表單」的
            # 誤判，直接比對這張截圖就能確認是不是真的看到簡訊驗證碼輸入畫面，
            # 不必再靠使用者口頭描述去猜測。
            otp_screenshot_path = await _take_screenshot(page, task_id)
            print(f"[inline_booking] ⏳ OTP 畫面出現，等待使用者輸入驗證碼...（截圖：{otp_screenshot_path}）")
            _update_status(supabase, task_id, "waiting_otp", {
                "step": "waiting_otp",
                "message": "請查看手機簡訊，在前端輸入 4 位數驗證碼",
                "screenshot": otp_screenshot_path,
            })

            # 16. 等待驗證碼——前端輸入或直接在瀏覽器手動輸入都支援，看哪個先發生
            outcome, otp_code = await _wait_for_otp_code(supabase, task_id, page, timeout=OTP_WAIT_TIMEOUT)

            if outcome == "closed":
                _update_status(supabase, task_id, "failed", {
                    "error": "瀏覽器頁面在等待驗證碼時被關閉",
                })
                return

            if outcome == "timeout":
                screenshot_path = await _take_screenshot(page, task_id)
                _update_status(supabase, task_id, "failed", {
                    "error": f"等待驗證碼超時（{OTP_WAIT_TIMEOUT} 秒），前端未輸入、瀏覽器也未手動處理",
                    "screenshot": screenshot_path,
                })
                return

            if outcome == "code":
                # 17. 填入前端送來的 OTP（手動在瀏覽器輸入的情況下 outcome 會是
                # "manual"，代表使用者自己填完了，不用再填一次）
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


def _run_in_dedicated_proactor_loop(task_id: str) -> None:
    """
    在獨立執行緒中建立一個全新的 ProactorEventLoop 來執行 Playwright 的 async API。

    背景：這個專案的 uvicorn 在 Windows 上主事件迴圈用的是 SelectorEventLoop，
    不支援 asyncio 建立子行程（Playwright async API 底層要用這個機制啟動瀏覽器
    driver 行程），直接在主迴圈 await async_playwright() 會噴出
    NotImplementedError（subprocess_exec）。跟 tixcraft_booking.py 用 nodriver
    遇到的是同一個坑，這裡沿用同一套解法——在專屬執行緒開一個全新的
    ProactorEventLoop（支援子行程），而不是把整支腳本改寫成 sync Playwright API
    （像 hospital_booking.py / thsr_booking.py 那樣），改動範圍小很多。
    """
    loop = asyncio.ProactorEventLoop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(_run_inline_bot(task_id))
    finally:
        loop.close()


async def run_inline_booking(task_id: str) -> None:
    """由 scripts/__init__.py 的 dispatch_script 呼叫的進入點。"""
    await asyncio.to_thread(_run_in_dedicated_proactor_loop, task_id)


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


async def _robust_click(locator, timeout: float = 3000) -> bool:
    """先用原生點擊（比較接近真人操作），被浮動元素擋住時退回 JS 觸發 click。

    inline.app 一旦選了人數，底部就會滑出固定的行動列（book-now-action-bar），
    它會蓋住月曆下半部與部分時段按鈕，原生點擊會因為
    「subtree intercepts pointer events」而逾時——這是取決於捲動位置的競態，
    同樣的操作順序有時成功有時失敗。JS 點擊不受畫面遮擋影響，當後備最可靠。
    """
    try:
        await locator.click(timeout=timeout)
        return True
    except Exception:
        pass
    try:
        await locator.evaluate("el => el.click()")
        return True
    except Exception:
        return False


async def _select_service_tab(page) -> None:
    """點擊「線上訂位」tab（若有服務類型選擇頁）"""
    try:
        booking_tab = page.locator("text=線上訂位").first
        if await booking_tab.is_visible(timeout=3000):
            await booking_tab.click()
            await _random_sleep(0.8, 1.2)
    except Exception:
        pass


async def _is_date_already_selected(picker_trigger, day_cell, target_date: str) -> bool:
    """判斷目標日期是不是「已經是目前選取的日期」。

    inline.app 會把已選取的那一格日期按鈕標成 disabled（避免重複點選），
    所以不能光看 disabled 就當作不可訂——實測 2026-08-01 明明可訂、頁面也
    已經選好它並列出 11:30／14:30 兩個時段，那一格卻同時帶著 disabled，
    導致誤報「已額滿或公休」。

    優先看格子自身的選取標記，讀不到再退回比對「用餐日期」欄位顯示的文字
    （該欄位就是使用者看到的值，格式如「8月1日週六」）。
    """
    try:
        if (await day_cell.get_attribute("aria-selected") or "").lower() == "true":
            return True
        cls = (await day_cell.get_attribute("class") or "").lower()
        if "selected" in cls or "active" in cls:
            return True
    except Exception:
        pass

    try:
        parts = target_date.split("-")
        if len(parts) != 3:
            return False
        label = (await picker_trigger.text_content()) or ""
        return f"{int(parts[1])}月{int(parts[2])}日" in label
    except Exception:
        return False


async def _select_date(page, target_date: str) -> tuple[bool, str]:
    """選擇訂位日期（YYYY-MM-DD 格式）。回傳 (是否選到, 失敗原因)。

    回傳原因字串而不是只回 bool，是因為這幾種失敗成因的處理方式完全不同
    （超出開放範圍 / 真的額滿 / 被遮擋點不到 / 頁面結構改變），過去呼叫端
    一律報「可能已額滿或公休」，實際上常常不是額滿，反而誤導判讀。

    inline.app 的日期欄位是一個「收合的觸發器」：<div id="date-picker"
    data-cy="date-picker" aria-expanded="false">7月28日週二 (今日)</div>，
    要先點開才會出現月曆彈窗（data-cy="calendar-picker"）。

    關鍵：這個月曆會把「所有可訂月份」一次全部渲染在同一個可捲動的彈窗裡
    （實測 7/28 當天打開，DOM 內同時存在 2026-07-01～2026-08-31 共 62 格、
    兩個月份標題），所以「下一月」按鈕才會帶 hidden——是因為根本不需要翻頁，
    不是因為不開放跨月訂位。因此這裡直接用 data-date 定位目標格子點下去即可，
    不要去點那顆永遠不可見的翻頁按鈕。

    不可訂的日期（已過期/額滿/公休）格子會帶 disabled 屬性，用這個判斷才準確。
    """
    if not target_date:
        return True, ""

    try:
        # 先點開收合的日期選擇器。
        # 注意這個觸發器是 toggle：已經打開時再點一次會關掉。因此先確認
        # 月曆目前是不是已經可見，只有在收合狀態才點，避免把已開啟的月曆關掉。
        picker_trigger = page.locator("#date-picker, [data-cy='date-picker']").first
        calendar = page.locator("#calendar-picker, [data-cy='calendar-picker']").first

        if not await calendar.is_visible():
            await picker_trigger.click(timeout=5000)
            await _race_sleep()

        await calendar.wait_for(state="visible", timeout=5000)

        # 等月曆格子真的長出來再開始找日期。
        # 這一步不能省：上一步剛改完用餐桌型（或人數），inline.app 會重新查詢
        # 該桌型的可訂日期並重繪整份月曆，而關鍵路徑上的 _race_sleep 只等
        # 0.25~0.5 秒，往往趕不上這次重繪。月曆「容器」在重繪期間仍然可見，
        # 所以上面的 wait_for(visible) 會立刻通過，接著就在空的月曆裡查到 0 格，
        # 把「還沒渲染完」誤判成「這天不能訂」——實測 2026-08-01 明明可訂，
        # 卻回報額滿/公休，就是踩到這個競態。
        try:
            await calendar.locator("[data-cy='bt-cal-day']").first.wait_for(
                state="attached", timeout=8000
            )
        except Exception:
            pass

        day_locator = calendar.locator(f"[data-cy='bt-cal-day'][data-date='{target_date}']")

        # 整份月曆已經渲染，不代表目標那一格也到位（跨月的格子可能晚一步才補上），
        # 所以再針對目標日期本身等一小段時間，等不到才往下走翻頁/判定不存在。
        try:
            await day_locator.first.wait_for(state="attached", timeout=5000)
        except Exception:
            pass

        # 若目標日期不在 DOM 裡，才嘗試翻頁（保留給月曆是分頁式的其他餐廳）
        if await day_locator.count() == 0:
            for _ in range(12):
                next_btn = calendar.locator(".nextMonth, [class*='NextMonth']").first
                if await next_btn.count() == 0 or not await next_btn.is_visible(timeout=1000):
                    break
                await next_btn.click(timeout=3000)
                await _race_sleep()
                if await day_locator.count() > 0:
                    break

        if await day_locator.count() == 0:
            reason = f"月曆中沒有 {target_date} 這一格，可能超出訂位開放範圍（或頁面結構已改變）"
            print(f"[inline_booking] ❌ {reason}")
            return False, reason

        day_cell = day_locator.first
        if await day_cell.get_attribute("disabled") is not None:
            # disabled 有兩種完全相反的意思：真的不可訂，或是「這格已經被選起來了」。
            # 先確認是不是後者，否則會把已經選好的目標日期誤報成額滿（實測踩過）。
            if await _is_date_already_selected(picker_trigger, day_cell, target_date):
                print(f"[inline_booking] 日期 {target_date} 已是目前選取的日期，略過點擊")
                return True, ""
            reason = f"{target_date} 在月曆上是不可選狀態（已額滿、公休或已過期）"
            print(f"[inline_booking] ❌ {reason}")
            return False, reason

        # 月曆是可捲動的長清單，目標日期可能在可視範圍外，先捲進畫面再點
        try:
            await day_cell.scroll_into_view_if_needed(timeout=3000)
        except Exception:
            pass
        if not await _robust_click(day_cell):
            reason = f"{target_date} 這一格點不下去（可能被浮動元素遮擋）"
            print(f"[inline_booking] ❌ {reason}")
            return False, reason
        await _race_sleep()

        selected_label = await picker_trigger.text_content()
        print(f"[inline_booking] 日期 {target_date} 選擇成功（欄位顯示：{(selected_label or '').strip()}）")
        return True, ""
    except Exception as e:
        reason = f"選擇日期 {target_date} 時發生例外：{e}"
        print(f"[inline_booking] ⚠️ {reason}")
        return False, reason


async def _select_session(page, session: str) -> bool:
    """選擇用餐時段。回傳是否真的選到。

    大部分餐廳（如島語自助餐廳）只有午餐/下午茶/晚餐三個粗略時段；
    但屋馬燒肉等餐廳的訂位頁會直接列出精確的 15 分鐘時段按鈕
    （例如 data-cy="book-now-time-slot-box-17-00"，顯示文字為 "17:00"），
    此時 session 會是 "HH:MM" 格式的精確時間。

    原本這裡找不到時段只印警告就返回，呼叫端完全不檢查，會帶著沒選時段的
    狀態繼續往下走（點完成預訂、填聯絡資訊…），等於整張訂單的時段是空的
    或維持系統預設值。跟其他步驟一樣改成回傳成功與否，讓呼叫端可以中止。
    """
    # 換日期後整份時段清單會重新渲染，太早去點會抓到正在被替換掉的舊元素，
    # 於是 data-cy 精確定位失敗、掉進底下比較脆弱的文字比對。先等新清單出現。
    #
    # 這個等待對「粗略時段」那條路徑同樣必要——原本只寫在下面的精確時段分支裡，
    # 但島語這類只有午餐/下午茶/晚餐的餐廳走的是粗略路徑，一樣得等清單重繪完，
    # 否則會在空清單上比對文字、把「還沒渲染完」誤判成「這個時段已額滿」。
    try:
        await page.locator("[data-cy^='book-now-time-slot']").first.wait_for(
            state="visible", timeout=8000
        )
        await _race_sleep()
    except Exception:
        pass

    exact_time_match = re.fullmatch(r"(\d{1,2}):(\d{2})", session)
    if exact_time_match:
        hh, mm = exact_time_match.groups()

        # 優先用穩定的 data-cy 屬性定位（不受時區/文案影響）。
        # 兩種寫法都試：實際屬性是照顯示文字補零的（11:00 -> ...-11-00），
        # 但早於 10 點的時段究竟是 "09-00" 還是 "9-00" 沒有實例可證，兩個都試最保險。
        for hour_form in {hh, str(int(hh))}:
            try:
                btn = page.locator(f"[data-cy='book-now-time-slot-box-{hour_form}-{mm}']").first
                if await btn.is_visible(timeout=2000) and await _robust_click(btn):
                    await _race_sleep()
                    print(f"[inline_booking] 時段選擇成功（data-cy 精確定位）：{session}")
                    return True
            except Exception:
                continue
        # 找不到就退回用畫面上顯示的時間文字比對
        try:
            btn = page.locator(f"text={session}").first
            if await btn.is_visible(timeout=2000) and await _robust_click(btn):
                await _race_sleep()
                print(f"[inline_booking] 時段選擇成功（文字比對）：{session}")
                return True
        except Exception:
            pass
        print(f"[inline_booking] ⚠️ 無法自動選擇精確時段 {session}")
        return False

    # 各家餐廳的時段標題與實際開始時間都不一樣（島語高雄漢神店是
    # 中午 11:30 / 下午 14:30 / 晚上 18:00，不是預期的午餐/下午茶/晚餐 17:30），
    # 所以每個時段都準備多組同義詞，避免只認一種寫法就找不到。
    session_keywords = {
        "midday": ["午餐", "中午", "11:30", "12:00", "Midday", "Lunch"],
        "afternoon": ["下午茶", "下午", "14:30", "15:00", "Afternoon", "Tea"],
        "evening": ["晚餐", "晚上", "17:30", "18:00", "Evening", "Dinner"],
    }
    keywords = session_keywords.get(session, ["晚餐"])

    # 先在真正的時段按鈕裡面找。
    # 不要直接用 page.locator("text=…") 掃全頁：頁面上方那一大段訂位須知
    # 也可能出現「午餐」「下午」「11:30」等字眼（例如「11:30 開始營業」），
    # 掃全頁會點到純說明文字——點了完全沒有作用，卻會回報選擇成功，
    # 最後送出一張沒有選到時段的訂單，比直接失敗更難查。
    slots = page.locator("[data-cy^='book-now-time-slot']")
    try:
        slot_count = await slots.count()
    except Exception:
        slot_count = 0

    for idx in range(slot_count):
        slot = slots.nth(idx)
        try:
            text = ((await slot.text_content()) or "").strip()
            if not any(kw in text for kw in keywords):
                continue
            if await slot.get_attribute("disabled") is not None:
                print(f"[inline_booking] 時段「{text}」已額滿（disabled），略過")
                continue
            if await _robust_click(slot):
                await _race_sleep()
                print(f"[inline_booking] 時段選擇成功：{text}")
                return True
        except Exception:
            continue

    # 找不到時段按鈕結構時（其他餐廳可能沒有 book-now-time-slot），
    # 才退回原本的全頁文字比對當保險。
    for kw in keywords:
        try:
            btn = page.locator(f"text={kw}").first
            if await btn.is_visible(timeout=2000):
                await btn.click()
                await _race_sleep()
                print(f"[inline_booking] 時段選擇成功（全頁文字比對）：{kw}")
                return True
        except Exception:
            continue
    print(f"[inline_booking] ⚠️ 無法自動選擇時段 {session}")
    return False


async def _select_table_type(page, table_type: str) -> bool:
    """選擇用餐桌型（部分餐廳才有的欄位，例如島語高雄漢神店的「一般 / 吧台板前」）。

    這個欄位是 <select id="table-picker">，但 option 的 value 是 Firebase 亂數 ID
    （例如 '-Ouq8xpdoxxy-HgR9Ldj'），每家分店都不一樣，所以「絕對不能寫死 ID」，
    必須用畫面上顯示的文字去比對出對應的 value。

    沒有這個欄位的餐廳（屋馬、輕井澤等）直接放行；使用者沒指定桌型時沿用
    頁面預設值（通常是第一個選項「一般」），不強制改動。
    """
    picker = page.locator("#table-picker")
    try:
        if await picker.count() == 0:
            return True  # 這家餐廳沒有桌型欄位
    except Exception:
        return True

    try:
        options = await picker.first.evaluate(
            "s => Array.from(s.options).map(o => ({v: o.value, t: (o.text || '').trim()}))"
        )
    except Exception as e:
        print(f"[inline_booking] 讀取用餐桌型選項失敗：{e}")
        return True  # 讀不到就沿用預設值，不阻斷流程

    labels = [o["t"] for o in options]
    print(f"[inline_booking] 此分店的用餐桌型選項：{labels}")

    if not table_type:
        print("[inline_booking] 未指定用餐桌型，沿用頁面預設值")
        return True

    target = table_type.strip()
    matched = next(
        (o for o in options if o["t"] == target),
        None,
    ) or next(
        (o for o in options if target in o["t"] or o["t"] in target),
        None,
    )

    if not matched:
        print(f"[inline_booking] ⚠️ 找不到用餐桌型「{target}」，沿用預設值（可選：{labels}）")
        return True

    try:
        await picker.first.select_option(matched["v"])
        await _race_sleep()
        print(f"[inline_booking] 用餐桌型已選：「{matched['t']}」")
        return True
    except Exception as e:
        print(f"[inline_booking] ⚠️ 選擇用餐桌型失敗：{e}")
        return False


async def _select_party_size(page, adults: int, kids: int) -> None:
    """選擇用餐人數（大人 + 小孩）。

    inline.app 實際上是 <select id="adult-picker">/<select id="kid-picker">
    的標準下拉選單，value 直接就是人數字串（"1","2"...），比原本用
    has_text 猜文字內容準確且快得多——select 元素的文字內容不見得會被
    Playwright 的 has_text 篩選抓到，之前這條路徑常常整個 fallback 到
    +/- 按鈕那條，而那條路徑本身也只是憑 class 名稱猜測。
    """
    try:
        adult_select = page.locator("#adult-picker").first
        if await adult_select.is_visible(timeout=2000):
            await adult_select.select_option(str(adults))
        else:
            adult_select = page.locator("select").filter(has_text="大人").first
            if await adult_select.is_visible(timeout=2000):
                await adult_select.select_option(str(adults))
            else:
                await _click_counter_to_value(page, "adult", adults)

        kid_select = page.locator("#kid-picker").first
        if await kid_select.is_visible(timeout=2000):
            await kid_select.select_option(str(kids))
        elif kids > 0:
            kid_select = page.locator("select").filter(has_text="小孩").first
            if await kid_select.is_visible(timeout=2000):
                await kid_select.select_option(str(kids))
            else:
                await _click_counter_to_value(page, "kid", kids)

        await _race_sleep()
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


async def _click_continue(page) -> bool:
    """點擊底部行動列的按鈕進入聯絡資訊頁。回傳是否真的點到。

    inline.app 選完人數/日期/時段後，底部會滑出一條行動列
    （<div data-cy="book-now-action-bar">），裡面那顆按鈕是
    <button data-cy="book-now-action-button">完成預訂</button>。

    注意按鈕文字是「完成預訂」——原本這裡只找「繼續/下一步/Continue/Next/
    確認時段」，一個都對不上，於是靜靜地什麼都沒做就返回，後面的填聯絡資訊、
    送出、等 OTP 全都在同一頁上空轉。優先用 data-cy 定位（不受文案改動影響），
    文字比對只當後備。
    """
    try:
        btn = page.locator("[data-cy='book-now-action-button']").first
        if await btn.is_visible(timeout=5000):
            await btn.click()
            await _random_sleep(1.0, 1.8)
            print("[inline_booking] 點擊「完成預訂」進入下一步（data-cy 定位）")
            return True
    except Exception:
        pass

    continue_keywords = ["完成預訂", "繼續", "下一步", "Continue", "Next", "確認時段"]
    for kw in continue_keywords:
        try:
            btn = page.locator(f"button:has-text('{kw}')").first
            if await btn.is_visible(timeout=2000):
                await btn.click()
                await _random_sleep(1.0, 1.8)
                print(f"[inline_booking] 點擊「{kw}」進入下一步（文字比對）")
                return True
        except Exception:
            continue

    print(f"[inline_booking] ⚠️ 找不到進入下一步的按鈕！嘗試過的關鍵字：{continue_keywords}")
    return False


async def _accept_house_rules(page) -> bool:
    """處理「規則與注意事項」彈窗：捲到規則底部使同意按鈕啟用後點擊。

    按下「完成預訂」後，inline.app 會跳出一個 ReactModal（#house-rules），
    底部是 <button data-cy="confirm-house-rule">我已閱讀並同意規則與注意事項</button>，
    預設 disabled=True，必須把規則內文的捲動容器（#house-rules 內 overflow-y
    為 scroll/auto 的那個 div）捲到底並觸發 scroll 事件才會啟用。

    這個步驟原本整個不存在，所以流程會停在彈窗前面空轉，後續填聯絡資訊、
    送出、等 OTP 全部失效，最後才誤報成「OTP 畫面未出現」。
    實測：捲動前 disabled=True，捲到底後 disabled=False，點下去網址才會
    前進到 .../form（真正的聯絡資訊頁）。
    """
    btn = page.locator("[data-cy='confirm-house-rule']")
    try:
        if await btn.count() == 0:
            return True  # 這家餐廳沒有規則彈窗，直接放行
        await btn.first.wait_for(state="visible", timeout=5000)
    except Exception:
        return True

    for _ in range(5):
        if not await btn.first.is_disabled():
            break
        await page.evaluate(
            """() => {
                const modal = document.querySelector('#house-rules');
                if (!modal) return;
                modal.querySelectorAll('*').forEach(e => {
                    const oy = getComputedStyle(e).overflowY;
                    if ((oy === 'scroll' || oy === 'auto') && e.scrollHeight > e.clientHeight) {
                        e.scrollTop = e.scrollHeight;
                        e.dispatchEvent(new Event('scroll', { bubbles: true }));
                    }
                });
            }"""
        )
        await _random_sleep(0.4, 0.7)

    if await btn.first.is_disabled():
        print("[inline_booking] ⚠️ 規則同意按鈕仍為停用狀態（可能捲動判定未通過）")
        return False

    if not await _robust_click(btn.first):
        print("[inline_booking] ⚠️ 規則同意按鈕點擊失敗")
        return False

    await _random_sleep(1.0, 1.5)
    print("[inline_booking] 已同意「規則與注意事項」，進入聯絡資訊頁")
    return True


# 在瀏覽器裡實際盤點表單上的 input，找出「姓」「名」兩格是第幾個。
# 回傳索引而不是選擇器字串，讓 Python 端用 page.locator("input").nth(i) 去填——
# querySelectorAll('input') 與 Playwright 的 input 定位順序一致。
_NAME_INPUTS_PROBE_JS = """
() => {
  const all = Array.from(document.querySelectorAll('input'));
  const isVis = (el) => !!(el.offsetParent || el.getClientRects().length);
  const isText = (el) => {
    const t = (el.type || 'text').toLowerCase();
    return t === 'text' || t === 'search';
  };
  const inv = all.map((el, i) => ({
    i,
    id: el.id || '',
    name: el.name || '',
    type: el.type || '',
    ph: el.placeholder || '',
    cy: el.getAttribute('data-cy') || '',
    aria: el.getAttribute('aria-label') || '',
    vis: isVis(el),
  }));

  // 1) placeholder / aria-label 直接比對（去空白後精確等於「姓」或「名」）
  const pick = (want) => inv.find(
    (o) => o.vis && (o.ph.trim() === want || o.aria.trim() === want)
  );
  const byPhLast = pick('姓');
  const byPhFirst = pick('名');
  if (byPhLast && byPhFirst) {
    return { inv, last: byPhLast.i, first: byPhFirst.i, how: 'placeholder' };
  }

  // 2) 找到「訂位人姓名」這個標籤，往上找出同一區塊裡的前兩個文字輸入框。
  //    不依賴 placeholder 文案，版型改了也還能定位。
  //    注意不能要求標籤「沒有子元素」——實際結構是
  //    <div>訂位人姓名 <span>*</span></div>，那顆必填星號就是子元素。
  //    改成取「包含這段文字的最深層元素」：只有祖先鏈上的元素會包含該文字，
  //    而文件順序中最後一個即為最深的那一個。
  const chain = Array.from(document.querySelectorAll('*')).filter(
    (el) => (el.textContent || '').includes('訂位人姓名')
  );
  const label = chain.length ? chain[chain.length - 1] : null;
  if (label) {
    let node = label.parentElement;
    for (let up = 0; up < 4 && node; up++) {
      const ins = Array.from(node.querySelectorAll('input')).filter(
        (el) => isText(el) && isVis(el)
      );
      if (ins.length >= 2) {
        return {
          inv,
          last: all.indexOf(ins[0]),
          first: all.indexOf(ins[1]),
          how: 'label:' + up,
        };
      }
      node = node.parentElement;
    }
  }

  return { inv, last: -1, first: -1, how: 'none' };
}
"""


async def _fill_contact_info(
    page, last_name: str, first_name: str, gender: str, phone: str, email: str
) -> bool:
    """填寫聯絡資訊（姓名、性別、電話）。回傳姓名是否確實填入。

    實測 inline.app 訂位表單（.../form）的實際結構：
      - 訂位人姓名有「兩種版型」，不同分店不一樣，必須兩種都支援：
        (A) 分成「姓」「名」兩格（島語高雄漢神店就是這種，
            placeholder 分別是「姓」和「名」）
        (B) 單一個 <input id="name" data-cy="name">，標籤寫「請留全名」
        之前只認 (B)，遇到 (A) 版型時 is_visible() 直接回 False、
        整段被 if 跳過，姓名靜靜留白也沒有任何錯誤訊息，最後才在送出時
        以不相干的理由失敗。
      - 性別是三個 radio：value="1" 小姐、value="0" 先生、value="2" 其他。
      - 電話是 <input id="phone" type="tel">，旁邊有國碼選單（預設 +886），
        所以要填去掉開頭 0 的號碼。
      - 這張表單沒有 Email 欄位（保留參數是為了相容既有呼叫端）。
    """
    name_filled = False
    try:
        want_name = bool(f"{last_name}{first_name}".strip())

        # 版型 A：「姓」「名」分成兩格
        # 這裡不寫死 CSS 選擇器，而是先在瀏覽器裡實際盤點所有 input，
        # 依序用 placeholder → 「訂位人姓名」標籤往上找容器 兩種方式定位。
        # 原因：先前寫死 input[placeholder='姓'] 在這張表單上選不到（畫面上
        # 明明看得到「姓」「名」兩格），猜選擇器只會一直來回試；盤點結果會
        # 一併印進 log，萬一之後版型再改，可以直接從 log 看出真實屬性。
        if want_name:
            try:
                probe = await page.evaluate(_NAME_INPUTS_PROBE_JS)
            except Exception as e:
                probe = None
                print(f"[inline_booking] 盤點姓名欄位失敗：{e}")

            if probe:
                print(f"[inline_booking] 表單 input 盤點（定位方式={probe.get('how')}）：{probe.get('inv')}")
                last_idx = probe.get("last", -1)
                first_idx = probe.get("first", -1)
                if last_idx is not None and last_idx >= 0:
                    try:
                        inputs = page.locator("input")
                        # 用 Playwright 的 fill 而不是 JS 直接塞 value：
                        # 這是 React 表單，直接改 value 不會觸發 onChange，
                        # 畫面看起來有字、送出時卻是空的。
                        await inputs.nth(last_idx).click()
                        await inputs.nth(last_idx).fill(last_name)
                        await _random_sleep(0.2, 0.4)
                        if first_idx is not None and first_idx >= 0:
                            await inputs.nth(first_idx).click()
                            await inputs.nth(first_idx).fill(first_name)
                            await _random_sleep(0.2, 0.4)
                        name_filled = True
                        print(f"[inline_booking] 姓名已填寫（姓／名兩格）：{last_name} {first_name}")
                    except Exception as e:
                        print(f"[inline_booking] 以「姓／名兩格」版型填寫姓名失敗：{e}")

        # 版型 B：單一個「請留全名」欄位
        if want_name and not name_filled:
            full_name = f"{last_name}{first_name}".strip()
            name_input = page.locator("#name, [data-cy='name']").first
            if await name_input.count() > 0 and await name_input.is_visible():
                await name_input.click()
                await name_input.fill(full_name)
                await _random_sleep(0.3, 0.6)
                name_filled = True
                print(f"[inline_booking] 姓名已填寫（單一全名欄位）：{full_name}")

        if want_name and not name_filled:
            print("[inline_booking] ⚠️ 找不到訂位人姓名欄位（姓／名兩格與單一全名欄位皆不存在）")

        # 性別 radio：優先用 value 定位（不受文案改動影響），其次用標籤文字
        gender_value = {"小姐": "1", "先生": "0", "其他": "2"}.get(gender, "1")
        try:
            radio = page.locator(f"input[type='radio'][value='{gender_value}']").first
            if await radio.count() > 0:
                await _robust_click(radio)
            else:
                await _robust_click(page.locator(f"label:has-text('{gender}')").first)
            await _random_sleep(0.2, 0.4)
        except Exception:
            pass

        if phone:
            phone_input = page.locator("#phone, [data-cy='phone'], input[type='tel']").first
            if await phone_input.is_visible(timeout=3000):
                await phone_input.click()
                # 國碼選單已是 +886，這裡只填去掉開頭 0 的號碼
                await phone_input.fill(phone.lstrip("0"))
                await _random_sleep(0.3, 0.6)

        # 必填的同意條款（「我同意上述預付訂金及取消訂位退款須知 *」）。
        # 這個 checkbox 沒有包在 label 裡，得靠父層文字辨識；不勾選無法送出。
        # 只勾這一個，行銷訊息那個可選的維持不勾。
        checkboxes = page.locator("input[type='checkbox']")
        for i in range(await checkboxes.count()):
            cb = checkboxes.nth(i)
            try:
                around = await cb.evaluate("el => (el.parentElement && el.parentElement.innerText) || ''")
            except Exception:
                continue
            if "我同意" in around and ("退款須知" in around or "訂金" in around):
                if not await cb.is_checked():
                    await _robust_click(cb)
                    print("[inline_booking] 已勾選必填同意條款")
                break

        print("[inline_booking] 聯絡資訊填寫完成")
    except Exception as e:
        print(f"[inline_booking] 填寫聯絡資訊時發生錯誤：{e}")
    return name_filled


# 找出「用餐目的」區塊裡實際存在的選項文字。
# 選項是純文字的 <span>（styled-components 亂數 class，不能拿來當選擇器），
# 所以改用「先找到『用餐目的』這個標籤，再往上找到同時包含多個選項的容器」。
_PURPOSE_OPTIONS_JS = """
() => {
    let label = null;
    document.querySelectorAll('*').forEach(e => {
        if (!label && e.children.length === 0 && (e.innerText || '').trim() === '用餐目的') label = e;
    });
    if (!label) return null;
    let box = label.parentElement;
    for (let i = 0; i < 4 && box; i++) {
        const spans = Array.from(box.querySelectorAll('span')).filter(
            s => s.children.length === 0
                 && (s.innerText || '').trim()
                 && (s.innerText || '').trim() !== '用餐目的'
        );
        if (spans.length >= 2) return spans.map(s => s.innerText.trim());
        box = box.parentElement;
    }
    return [];
}
"""

_PURPOSE_CLICK_JS = """
(idx) => {
    let label = null;
    document.querySelectorAll('*').forEach(e => {
        if (!label && e.children.length === 0 && (e.innerText || '').trim() === '用餐目的') label = e;
    });
    if (!label) return false;
    let box = label.parentElement;
    for (let i = 0; i < 4 && box; i++) {
        const spans = Array.from(box.querySelectorAll('span')).filter(
            s => s.children.length === 0
                 && (s.innerText || '').trim()
                 && (s.innerText || '').trim() !== '用餐目的'
        );
        if (spans.length >= 2) {
            const el = spans[idx];
            if (!el) return false;
            el.click();
            return true;
        }
        box = box.parentElement;
    }
    return false;
}
"""

# 前端固定的 6 種用餐目的代碼，對應到各餐廳自訂選項可能出現的關鍵字。
# 關鍵字依「specific → general」排序，避免例如 friends 的「聚餐」誤中「商務聚餐」。
PURPOSE_KEYWORDS = {
    "birthday": ["壽星", "生日", "慶生", "birthday"],
    "date": ["約會", "情侶", "date"],
    "anniversary": ["週年", "周年", "紀念", "anniversary"],
    "family": ["家庭", "親子", "family"],
    "friends": ["朋友", "friends"],
    "business": ["商務", "公司", "business"],
}


async def _select_purpose(page, purpose: str) -> bool:
    """選擇用餐目的。

    這一欄在多數餐廳是「必填」（標題帶紅色 *），但選項文字完全由各餐廳自訂：
    屋馬燒肉是「一般用餐 / 有其他慶祝事項… / 當月壽星（需攜帶證件）/
    當日壽星（需攜帶證件）/ 週年慶祝 / 商務聚餐」，跟前端固定的
    「慶生 / 約會 / 週年慶 …」對不起來。原本用寫死的 PURPOSE_MAP 做字串比對
    （birthday -> 「慶生」），在屋馬永遠找不到元素，必填欄位空著就送不出去。

    改成執行時讀取畫面上「實際存在」的選項再比對，順序為：
      1) 設定值與選項文字完全相同 → 直接用（保留讓使用者填精確文字的彈性）
      2) 關鍵字比對（birthday -> 含「壽星」的選項）
      3) 都配不到 → 退回第一個選項（通常是「一般用餐」），確保必填欄位有值
    """
    try:
        options = await page.evaluate(_PURPOSE_OPTIONS_JS)
    except Exception as e:
        print(f"[inline_booking] 讀取用餐目的選項失敗：{e}")
        return False

    if options is None:
        return True  # 這家餐廳沒有「用餐目的」欄位
    if not options:
        print("[inline_booking] ⚠️ 找到「用餐目的」欄位但讀不到任何選項")
        return False

    print(f"[inline_booking] 此餐廳的用餐目的選項：{options}")

    chosen_idx, reason = None, ""
    for i, text in enumerate(options):
        if purpose and purpose.strip() == text:
            chosen_idx, reason = i, "設定值與選項文字完全相同"
            break
    if chosen_idx is None and purpose:
        for kw in PURPOSE_KEYWORDS.get(purpose, []):
            for i, text in enumerate(options):
                if kw.lower() in text.lower():
                    chosen_idx, reason = i, f"關鍵字「{kw}」比對"
                    break
            if chosen_idx is not None:
                break
    if chosen_idx is None:
        chosen_idx = 0
        reason = "未指定或無相符選項，採用第一個選項（必填欄位不能留空）"

    if not await page.evaluate(_PURPOSE_CLICK_JS, chosen_idx):
        print(f"[inline_booking] ⚠️ 點擊用餐目的「{options[chosen_idx]}」失敗")
        return False

    await _random_sleep(0.3, 0.6)
    print(f"[inline_booking] 用餐目的已選：「{options[chosen_idx]}」（{reason}）")
    return True


# 送出後掃描頁面上的欄位驗證錯誤訊息。
# 只看「葉節點且文字很短」的元素，避免把整個表單容器的文字整段抓回來。
_VALIDATION_ERROR_JS = """
({ hints, ignore }) => {
  const els = Array.from(document.querySelectorAll('body *'));
  for (const el of els) {
    if (el.children.length) continue;
    const t = (el.textContent || '').trim();
    if (!t || t.length > 60) continue;
    if (!(el.offsetParent || el.getClientRects().length)) continue;
    if (ignore.some((g) => t.includes(g))) continue;
    if (hints.some((h) => t.includes(h))) return t;
  }
  return '';
}
"""


async def _find_form_validation_error(page) -> str:
    """找出表單上目前顯示的欄位驗證錯誤訊息（沒有就回空字串）。

    inline.app 的欄位驗證訊息不會擋住「確認訂位」按鈕的點擊——按下去按鈕確實
    被點到了，但表單不會送出，頁面就停在原地（實測手機號碼多打幾碼時，欄位
    變紅框並顯示「您填寫的手機號碼格式有誤」）。若不在這裡攔下來，後面會一路
    空轉到等不到 OTP，最後以「訂位完成頁面確認失敗」作收，完全看不出真正原因
    是某個欄位填錯，只能一張張翻截圖才找得到。
    """
    hints = ["格式有誤", "格式錯誤", "不正確", "請填寫", "尚未填寫"]
    # OTP 畫面上的「請填寫4位數驗證碼」是流程走到最後一步的正常提示，不是欄位錯誤。
    # 沒排除掉的話，會在簡訊都還沒送達時就把成功的流程判定成失敗。
    ignore = ["驗證碼"]
    try:
        return await page.evaluate(_VALIDATION_ERROR_JS, {"hints": hints, "ignore": ignore})
    except Exception:
        return ""


async def _click_submit(page) -> bool:
    """點擊最終送出按鈕。回傳是否真的點到了按鈕。

    實測按鈕是 <button data-cy="submit">確認訂位</button>——注意是「確認訂位」，
    原本的關鍵字清單裡只有「確認預訂」，一字之差全部對不上，於是靜靜什麼都
    沒做就返回，後續流程卻毫無所覺地繼續（檢查 PX 挑戰、等待 OTP 畫面），
    導致表單根本沒送出卻誤判成「OTP 畫面出現」，叫使用者去收根本不存在的簡訊。
    因此優先用穩定的 data-cy 定位，文字比對只當後備。
    """
    try:
        btn = page.locator("[data-cy='submit']").first
        if await btn.is_visible(timeout=5000) and await _robust_click(btn):
            await _random_sleep(1.0, 1.5)
            print("[inline_booking] 點擊「確認訂位」送出（data-cy 定位）")
            return True
    except Exception:
        pass

    submit_keywords = ["確認訂位", "送出", "確認預訂", "Submit", "Confirm", "預約", "完成"]
    for kw in submit_keywords:
        try:
            btn = page.locator(f"button:has-text('{kw}')").first
            if await btn.is_visible(timeout=2000) and await _robust_click(btn):
                await _random_sleep(1.0, 1.5)
                print(f"[inline_booking] 點擊送出：{kw}（文字比對）")
                return True
        except Exception:
            continue
    print(f"[inline_booking] ⚠️ 找不到送出按鈕！嘗試過的關鍵字：{submit_keywords}")
    return False


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


async def _is_otp_screen_present(page) -> bool:
    """OTP 輸入畫面是否已經出現（單次檢查、不等待）。

    只認「一組 4 個 maxlength=1 輸入框」這個最明確的特徵，不用文字比對——
    這個函式是用來判斷「表單是否已成功送出」，寧可漏判也不要因為頁面上剛好
    有「驗證碼」字樣就誤判成已送出。
    """
    try:
        return await page.locator("input[maxlength='1']").count() >= 4
    except Exception:
        return False


async def _wait_for_otp_screen(page, timeout: float = 20.0) -> bool:
    """等待 OTP 輸入畫面出現。

    "input[maxlength='1']" 原本只要求「找到一個」就當作 OTP 畫面出現——
    但表單頁上可能存在其他無關的單字元輸入框，且「text=驗證碼」「text=簡訊」
    這類籠統的文字也可能只是欄位提示或行銷同意文字，在表單根本還沒送出時
    就先出現在頁面上。真正的 OTP 輸入畫面一定是「一組 4 個」獨立輸入框，
    用這個數量門檻大幅降低誤判機率。
    """
    otp_indicators = [
        "text=已將驗證碼傳送",
        "text=驗證碼",
        "text=OTP",
        "text=簡訊",
    ]
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            otp_box_count = await page.locator("input[maxlength='1']").count()
        except Exception:
            otp_box_count = 0
        if otp_box_count >= 4:
            print(f"[inline_booking] OTP 畫面出現（偵測：{otp_box_count} 個 maxlength=1 輸入框）")
            return True

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
    supabase, task_id: str, page, timeout: float = 300.0
) -> tuple:
    """
    同時支援兩種輸入驗證碼的方式，看哪個先發生：

      1. 前端跳出的輸入視窗 → POST /api/tasks/{task_id}/otp → 寫進 Supabase
         的 otp_code 欄位（需要這個欄位存在）
      2. 使用者直接在腳本開的瀏覽器視窗裡手動輸入（不需要任何欄位，腳本本來
         就看得到那個畫面）

    回傳 (outcome, code)，outcome 為：
      - "code"    -> 從 Supabase 拿到驗證碼，呼叫端要自己填入
      - "manual"  -> 偵測到 OTP 輸入框已經消失（使用者已經手動處理完，
                     不管成功或被拒絕），呼叫端不用再填，直接去看結果頁
      - "closed"  -> 瀏覽器頁面被關閉
      - "timeout" -> 兩種訊號都等不到

    原本只認 Supabase 欄位，使用者若跳過前端直接在瀏覽器手動輸入，腳本完全
    看不到，只能傻等滿 timeout 秒才發現；現在改成用「OTP 輸入框是否還在」
    當作第二種偵測，不強制要求一定要有 otp_code 欄位才能用這支腳本。
    """
    deadline = time.time() + timeout
    poll_interval = 2.0
    print(f"[inline_booking] 開始等待驗證碼（前端輸入或瀏覽器手動輸入皆可，每 {poll_interval}s 檢查一次，最長 {timeout}s）...")

    missing_streak = 0  # 連續偵測到輸入框消失的次數

    while time.time() < deadline:
        if page.is_closed():
            print("[inline_booking] ⚠️ 偵測到瀏覽器頁面已被關閉，提前結束等待")
            return ("closed", None)

        try:
            otp_box_count = await page.locator("input[maxlength='1']").count()
        except Exception:
            otp_box_count = 0
        if otp_box_count < 4:
            missing_streak += 1
            # 要求連續兩次都偵測不到才判定為手動處理完成，避免頁面短暫重新
            # 渲染造成的單次誤判（例如剛好在網頁重繪那一瞬間查詢，輸入框
            # 短暫從 DOM 消失又立刻出現），把使用者根本還沒開始輸入的狀態
            # 誤判成「已完成」。
            if missing_streak >= 2:
                print("[inline_booking] 偵測到 OTP 輸入框已消失，判斷為已在瀏覽器手動處理完成")
                return ("manual", None)
            await asyncio.sleep(poll_interval)
            continue
        missing_streak = 0

        try:
            resp = supabase.table("tasks").select("otp_code").eq("id", task_id).execute()
            if resp.data:
                otp_code = resp.data[0].get("otp_code")
                if otp_code and str(otp_code).strip():
                    print(f"[inline_booking] ✅ 收到前端輸入的 OTP：{otp_code}")
                    return ("code", str(otp_code).strip())
        except Exception as e:
            # tasks.otp_code 欄位不存在時每次都會落在這裡——不影響上面
            # 「瀏覽器手動輸入」這條路徑，只代表前端輸入視窗那條路徑用不了。
            print(f"[inline_booking] Polling otp_code 欄位時發生錯誤（不影響手動在瀏覽器輸入）：{e}")
        await asyncio.sleep(poll_interval)

    print("[inline_booking] ⏰ 等待驗證碼超時")
    return ("timeout", None)


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


async def _race_sleep(min_s: float = 0.25, max_s: float = 0.5) -> None:
    """搶位關鍵路徑專用的短延遲（人數 → 桌型 → 日期 → 時段）。

    這四步是真正在跟其他人競爭的區間——選到時段的那一刻位子就被鎖住了，
    之後填聯絡資訊、送出通常有數分鐘的保留時間，不必搶快。因此只把這段
    壓到最短，其餘步驟仍用 _random_sleep 維持擬人化節奏。

    不把全部延遲都砍掉的原因有實測依據：這個網站的 PerimeterX 會持續蒐集
    行為遙測，實測「頁面載入完成後立刻重新整理」會被直接硬擋
    （Access to this page has been denied），代表過快且機械的操作本身就是
    觸發條件。保留後半段的自然節奏是刻意的取捨。

    預設值 0.25~0.5 秒是刻意留在「真人手速」範圍內（真人在表單元素之間
    點擊大約 0.3~0.8 秒）。曾試過 0.12~0.3 秒，測試中出現 PerimeterX 的
    px-captcha-modal 驗證彈窗擋住點擊——雖然無法完全排除是短時間內重複
    測試累積觸發的，但既然比真人還快的收益有限（每步只差 0.15 秒左右），
    就沒有必要冒這個風險。
    """
    await asyncio.sleep(random.uniform(min_s, max_s))


# ── Supabase 狀態更新 ─────────────────────────────────────────────────────────

def _update_status(supabase, task_id: str, status: str, result: dict) -> None:
    """更新 Supabase tasks 表的 status 和 result 欄位，並同步寫一筆 execution_logs。

    這兩個拆成兩次分開的 update：tasks 資料表目前沒有 result 欄位（需要額外執行
    ALTER TABLE tasks ADD COLUMN result jsonb; 才會有），如果兩個欄位包在同一次
    update 裡送出，只要 result 失敗，PostgREST 會整包拒絕，連 status 都不會寫入
    ——這正是之前「任務進度／OTP 等待狀態從沒被寫進資料庫」的原因。拆開後，就算
    沒加那個欄位，至少 status（前端和 OTP 流程真正依賴的核心欄位）永遠會確實寫入，
    只有 result 這些附加診斷資訊（截圖路徑、錯誤細節等）會在欄位不存在時被跳過。

    這支腳本原本全程只用 print()，只會出現在後端終端機——前端「系統日誌」面板
    讀的是 execution_logs 這張表，print() 永遠不會出現在那裡，導致任務失敗時
    使用者在前端完全看不到失敗原因。這裡改成每次更新狀態時，一併呼叫
    log_execution() 寫一筆對應的日誌，這樣不用逐一去改檔案裡本來就有的
    29 處 _update_status 呼叫點，全部自動補上前端可見的日誌。
    """
    try:
        supabase.table("tasks").update({"status": status}).eq("id", task_id).execute()
    except Exception as e:
        print(f"[inline_booking] 更新 status 失敗：{e}")

    try:
        supabase.table("tasks").update({"result": result}).eq("id", task_id).execute()
    except Exception as e:
        print(f"[inline_booking] 更新 result 失敗（若尚未新增 result 欄位屬正常現象）：{e}")

    print(f"[inline_booking] 狀態更新：{status} | {result}")

    if status == "failed":
        level = "error"
        message = f"❌ {result.get('error') or result.get('message') or '任務失敗'}"
    elif status == "success":
        level = "success"
        message = f"✅ {result.get('message', '任務完成')}"
    elif status == "waiting_otp":
        level = "action"
        message = result.get("message", "等待輸入驗證碼")
    else:
        level = "action"
        message = result.get("message") or f"執行中：{result.get('step', status)}"

    try:
        log_execution(task_id, level, message)
    except Exception as e:
        print(f"[inline_booking] 寫入 execution_logs 失敗：{e}")
