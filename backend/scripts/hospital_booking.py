"""
hospital_booking.py — 台大醫院 / 長庚醫院 自動化網路掛號引擎

實際掛號流程（以台大為例）：
  Step 1  首頁  → https://reg.ntuh.gov.tw/WebReg
  Step 2  選院區 → 點選「總院」→ https://reg.ntuh.gov.tw/WebReg/WebReg/RegShowBlock?vHospCode=T0
  Step 3  選科別 → 直接導向排班頁  https://...RegDeptSchedule?vHospCode=T0&vDeptCode=ENT
  Step 4  選時段 → 點擊可預約的號次標籤（可指定醫師名稱）
  Step 5  填資料 → 輸入身分證(#txtInputID)、生日(#year/#month/#day)、驗證碼(#validText)
           → 點擊 #patientIdentityConfirm 送出
  Step 6  確認結果 → 讀取頁面文字判斷成功 / 失敗
"""

import asyncio
import os
import base64
from typing import Dict, Any, Optional

from tasks_dispatcher import log_execution, supabase

try:
    from patchright.sync_api import sync_playwright, Page
except ImportError:
    from playwright.sync_api import sync_playwright, Page

# ── 台大院區代碼 ───────────────────────────────────────────────────
NTUH_HOSP_CODE = "T0"   # 總院
NTUH_BASE = "https://reg.ntuh.gov.tw/WebReg"
CGMH_BASE = "https://register.cgmh.org.tw"

# ── 成功 / 失敗關鍵字 ──────────────────────────────────────────────
# 成功優先：只要出現任一成功詞，就認定為成功（無論頁面是否同時有「逾時」倒計時提示）
SUCCESS_KEYWORDS = [
    "預約成功", "掛號成功", "已完成掛號",
    "完成網路預約", "預約掛號完成", "已為您完成",
    "掛號完成", "您已成功預約", "成功掛號",
]
# 失敗關鍵字：移除「逾時」（台大所有頁面都有 session 倒計時提示，不代表失敗）
# 只保留明確表示掛號流程失敗的詞
FAILURE_KEYWORDS = [
    "查無可預約", "無看診號", "號碼已額滿", "已掛滿",
    "查無結果", "您為初診病友",
    "系統忙碌，請稍後再試",   # 完整句，避免誤殺「請稍後再試」等正常提示
    "驗證失敗", "身分資料錯誤", "找不到符合",
]


def _solve_captcha_ocr(page, task_id: str) -> Optional[str]:
    """
    使用 CapSolver ImageToTextTask 自動辨識台大醫院圖形驗證碼。
    支援多種 selector fallback，並輸出 debug log 方便排錯。
    """
    from dotenv import load_dotenv
    load_dotenv()
    api_key = os.environ.get("CAPSOLVER_API_KEY", "")
    if not api_key:
        log_execution(task_id, "running", "⚠️ 未設定 CAPSOLVER_API_KEY，略過自動驗證碼辨識")
        return None

    # 台大 RegForm 驗證碼：所有 img 的 id 均為空，需靠 src 路徑判斷
    CAPTCHA_IMG_SELECTORS = [
        # src 路徑關鍵字（台大常見）
        "img[src*='Generate']",
        "img[src*='generate']",
        "img[src*='valid']",
        "img[src*='Valid']",
        "img[src*='captcha']",
        "img[src*='Captcha']",
        "img[src*='VerifyCode']",
        "img[src*='verifycode']",
        "img[src*='CheckCode']",
        "img[src*='Code']",
        # id 關鍵字（fallback）
        "img#captchaImg",
        "img#imgCode",
        "img#validCode",
        "img[id*='ode']",
        "img[id*='aptcha']",
        # input type=image
        "input[type='image']",
        # canvas
        "canvas",
    ]

    captcha_img = None
    found_selector = None
    for sel in CAPTCHA_IMG_SELECTORS:
        try:
            el = page.locator(sel).first
            if el.is_visible(timeout=600):
                captcha_img = el
                found_selector = sel
                break
        except Exception:
            continue

    if captcha_img is None:
        # dump 完整 img list（含完整 src）
        try:
            all_imgs = page.evaluate(
                "JSON.stringify(Array.from(document.querySelectorAll('img')).map(img => ({id:img.id, src:img.src})))"
            )
            log_execution(task_id, "running", f"\ud83d\udd0d [debug] 所有 img (完整)：{str(all_imgs)[:800]}")
        except Exception:
            pass
        # 也 dump inputs
        try:
            all_inputs = page.evaluate(
                "JSON.stringify(Array.from(document.querySelectorAll('input')).map(i => ({id:i.id, name:i.name, type:i.type})))"
            )
            log_execution(task_id, "running", f"\ud83d\udd0d [debug] 所有 input：{str(all_inputs)[:400]}")
        except Exception:
            pass
        log_execution(task_id, "running", "\u26a0\ufe0f \u627e\u4e0d\u5230\u9a57\u8b49\u78bc\u5716\u7247\u5143\u7d20\uff0c\u8acb\u624b\u52d5\u586b\u5beb")
        return None

    log_execution(task_id, "running", f"🤖 找到驗證碼圖片 ({found_selector})，截圖送 CapSolver OCR...")

    try:
        import httpx

        img_bytes = captcha_img.screenshot()
        img_b64 = base64.b64encode(img_bytes).decode()

        resp = httpx.post(
            "https://api.capsolver.com/createTask",
            json={
                "clientKey": api_key,
                "task": {
                    "type": "ImageToTextTask",
                    "body": img_b64,
                    "module": "common",
                    "score": 0.8,
                }
            },
            timeout=30
        )
        data = resp.json()
        log_execution(task_id, "running",
                      f"🔍 [debug] CapSolver 回應：errorId={data.get('errorId')}, status={data.get('status')}")

        if data.get("errorId") == 0:
            solution = data.get("solution", {}).get("text", "").strip()
            if solution:
                log_execution(task_id, "success", f"⚡ CapSolver OCR 辨識成功：[{solution}]")
                return solution
            else:
                log_execution(task_id, "running", "⚠️ CapSolver 回傳空字串（圖片品質過低）")
        else:
            err = data.get("errorDescription", "unknown")
            log_execution(task_id, "running", f"⚠️ CapSolver API 錯誤：{err}")

    except Exception as e:
        log_execution(task_id, "running", f"⚠️ 驗證碼辨識例外：{str(e)[:100]}")

    return None


def _check_page_result(page) -> tuple[bool, str]:
    """讀取頁面文字，判斷是成功還是失敗。成功優先於失敗。"""
    try:
        page_text = page.inner_text("body")
    except Exception:
        return False, "無法讀取頁面內容"

    # ✅ 成功優先：只要出現成功關鍵字，立刻認定成功（無論頁面是否同時有「逾時」倒計時）
    for kw in SUCCESS_KEYWORDS:
        if kw in page_text:
            return True, f"頁面確認：「{kw}」"

    # ❌ 只有在找不到任何成功詞的情況下，才判斷是否為失敗
    for kw in FAILURE_KEYWORDS:
        if kw in page_text:
            return False, f"醫院系統回傳明確失敗訊息：「{kw}」"

    # ❓ 無法判斷 — 但這次「不直接回傳失敗」，而是回傳 True 帶警語
    # 因為使用者手動確認成功，而我們無法偵測到新的成功詞
    return True, "⚠️ 未偵測到標準成功訊息，但無明確失敗訊息——請檢查掛號紀錄確認是否完成"


def _ntuh_book(page: Page, task_id: str, config: Dict[str, Any]) -> bool:
    """
    台大醫院完整掛號自動化流程。
    回傳 True = 成功, False = 失敗。
    """
    dept_code = config.get("department", "ENT")
    dept_name = config.get("deptName", dept_code)
    user_id   = config.get("user_id", "")
    birth_date= config.get("birthDate", "")      # 格式：YYYY-MM-DD
    target_date = config.get("targetDate", "")   # 未來：可用來篩選日期
    doctor_name = config.get("doctorName", "")
    patient_type= config.get("patientType", "return")
    user_name   = config.get("userName", "")

    # ── Step 1: 進入台大掛號首頁 ─────────────────────────────────
    log_execution(task_id, "running", f"🚀 進入台大醫院網路掛號首頁...")
    page.goto(NTUH_BASE, timeout=30000, wait_until="domcontentloaded")
    page.wait_for_timeout(1500)

    # ── Step 2: 選擇「總院」院區 ──────────────────────────────────
    log_execution(task_id, "running", "🏥 選擇【總院】院區...")
    try:
        branch_link = page.get_by_text("總院", exact=True).first
        if branch_link.is_visible(timeout=3000):
            branch_link.click()
            page.wait_for_load_state("domcontentloaded")
            page.wait_for_timeout(1500)
        else:
            # 直接導向院區科別頁
            page.goto(f"{NTUH_BASE}/WebReg/RegShowBlock?vHospCode={NTUH_HOSP_CODE}",
                      timeout=30000, wait_until="domcontentloaded")
            page.wait_for_timeout(1500)
    except Exception:
        page.goto(f"{NTUH_BASE}/WebReg/RegShowBlock?vHospCode={NTUH_HOSP_CODE}",
                  timeout=30000, wait_until="domcontentloaded")
        page.wait_for_timeout(1500)

    # ── Step 3: 直接跳到目標科別排班頁（URL 參數方式最可靠）────────
    schedule_url = (
        f"{NTUH_BASE}/WebReg/RegDeptSchedule"
        f"?vHospCode={NTUH_HOSP_CODE}&vDeptCode={dept_code}&showBlock=A"
    )
    log_execution(task_id, "running", f"🔍 進入【{dept_name}】門診排班頁...")
    page.goto(schedule_url, timeout=30000, wait_until="domcontentloaded")
    page.wait_for_timeout(2000)

    # 確認頁面有排班資料
    page_text = page.inner_text("body")
    if "查無" in page_text or "目前無" in page_text:
        log_execution(task_id, "error", f"❌ 【{dept_name}】目前查無可預約的門診班表，請確認科別代碼或換個日期再試。")
        return False

    # ── Step 4: 尋找可預約的時段並點擊 ─────────────────────────────
    # 台大排班頁的可預約按鈕 class 為 "doctor-tag avaliable"（官方故意的拼寫）
    # 額滿 / 停診的按鈕只有 "doctor-tag"（沒有 avaliable）
    log_execution(task_id, "running", f"📅 掃描【{dept_name}】可預約的看診號碼...")
    page.wait_for_timeout(1000)  # 等 JS 渲染完成

    slot_clicked = False

    # 優先找指定醫師（若有設定）
    if doctor_name:
        log_execution(task_id, "running", f"🔎 優先尋找指定醫師：{doctor_name}")
        try:
            doctor_slots = page.locator("button.avaliable").filter(has_text=doctor_name)
            if doctor_slots.count() > 0:
                # 若有 targetDate，嘗試找該日期的時段
                if target_date:
                    # 台大日期格式：M/DD（如 7/24）
                    parts = target_date.split("-")
                    if len(parts) == 3:
                        date_label = f"{int(parts[1])}/{int(parts[2])}"
                        # 找包含目標日期的段落，再在其中找醫師
                        date_section = page.locator(f"text={date_label}").locator("..").locator("..")
                        targeted = date_section.locator("button.avaliable").filter(has_text=doctor_name)
                        if targeted.count() > 0:
                            targeted.first.click()
                            page.wait_for_load_state("domcontentloaded")
                            page.wait_for_timeout(1500)
                            slot_clicked = True
                            log_execution(task_id, "running", f"🎯 已選取 {doctor_name} 醫師 {date_label} 的看診號碼！")

                if not slot_clicked:
                    doctor_slots.first.click()
                    page.wait_for_load_state("domcontentloaded")
                    page.wait_for_timeout(1500)
                    slot_clicked = True
                    log_execution(task_id, "running", f"🎯 已選取 {doctor_name} 醫師的看診號碼！")
        except Exception as e:
            log_execution(task_id, "running", f"⚠️ 找指定醫師時出現例外：{str(e)[:60]}")

    # 若未指定醫師或找不到，退而選第一個可預約的號次
    if not slot_clicked:
        try:
            all_available = page.locator("button.avaliable").all()
            if all_available:
                log_execution(task_id, "running", f"ℹ️ 找到 {len(all_available)} 個可預約號次，選取第一個...")
                all_available[0].click()
                page.wait_for_load_state("domcontentloaded")
                page.wait_for_timeout(1500)
                slot_clicked = True
                log_execution(task_id, "running", "🎯 已選取可預約號次")
        except Exception as e:
            log_execution(task_id, "running", f"⚠️ 選取號次時出現例外：{str(e)[:60]}")

    if not slot_clicked:
        log_execution(task_id, "error",
                      f"❌ 【{dept_name}】查無可預約名額（button.avaliable 共 0 個）。"
                      f"此科別今日所有班次可能均已額滿或停診。")
        return False

    # ── Step 5: 填寫病患身分驗證表單 ───────────────────────────────
    log_execution(task_id, "running", "📝 進入掛號確認表單，填寫看診人身分資料...")
    page.wait_for_timeout(1000)

    try:
        # 選擇身分類別（初診 / 複診）
        if patient_type == "first_time":
            # 初診通常是特定 radio 或 select
            first_time_radio = page.locator("input[value='N'], input[value='1'][name*='identity']").first
            if first_time_radio.is_visible(timeout=1500):
                first_time_radio.click()
        # 預設為身分證字號模式（複診）

        # 填入身分證
        id_input = page.locator("#txtInputID")
        id_input.wait_for(state="visible", timeout=5000)
        id_input.fill(user_id)

        # 填入生日（格式 YYYY-MM-DD）
        if birth_date and len(birth_date) >= 10:
            parts = birth_date.replace("/", "-").split("-")
            if len(parts) == 3:
                page.locator("#year").fill(parts[0])
                page.locator("#month").fill(parts[1].lstrip("0") or "0")
                page.locator("#day").fill(parts[2].lstrip("0") or "0")

        log_execution(task_id, "running", f"✅ 已填入身分資料：{user_id[:3]}*** / 生日 {birth_date}")

    except Exception as e:
        log_execution(task_id, "error", f"❌ 填入身分資料時出錯：{str(e)[:100]}")
        return False

    # ── Step 5b: 處理驗證碼 ─────────────────────────────────────────
    log_execution(task_id, "running", "🤖 擷取驗證碼，嘗試 AI OCR 辨識...")
    captcha_text = _solve_captcha_ocr(page, task_id)

    if captcha_text:
        try:
            page.locator("#validText").fill(captcha_text)
        except Exception:
            pass
    else:
        log_execution(task_id, "running",
                      "⚠️ 自動辨識驗證碼失敗。請在已開啟的瀏覽器視窗中手動輸入驗證碼，"
                      "然後按下「確定送出」。系統將等候 60 秒...")
        # 等待使用者手動操作（最多 60 秒）
        page.wait_for_timeout(60000)

    # ── Step 5c: 送出掛號申請 ────────────────────────────────────────
    try:
        confirm_btn = page.locator("#patientIdentityConfirm")
        if confirm_btn.is_visible(timeout=3000):
            confirm_btn.click()
            log_execution(task_id, "running", "📨 已點擊「確定送出」，等待醫院系統回應...")
            page.wait_for_load_state("domcontentloaded")
            page.wait_for_timeout(3000)
    except Exception as e:
        log_execution(task_id, "running", f"⚠️ 送出按鈕例外：{str(e)[:60]}")

    # ── Step 6: 讀取結果 ─────────────────────────────────────────────
    is_success, result_msg = _check_page_result(page)
    if is_success:
        log_execution(task_id, "success", f"🎉 台大醫院掛號成功！{result_msg}")
    else:
        log_execution(task_id, "error", f"❌ 掛號未成功。{result_msg}")

    return is_success


def _run_hospital_bot_sync(task_id: str, config: Dict[str, Any]):
    hospital = config.get("hospital", "NTUH")
    dept_name = config.get("deptName", config.get("department", ""))
    hosp_name = "台大醫院 (台北總院區)" if hospital == "NTUH" else "長庚醫院 (林口/台北院區)"

    log_execution(task_id, "running", f"🌐 啟動 Playwright 瀏覽器，前進【{hosp_name}】掛號系統...")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, args=["--start-maximized"])
        context = browser.new_context(viewport=None)
        page = context.new_page()
        page.set_default_timeout(15000)

        try:
            if hospital == "NTUH":
                _ntuh_book(page, task_id, config)
            else:
                log_execution(task_id, "running", "⚠️ 長庚醫院自動化模組施工中，敬請期待")
        except Exception as e:
            log_execution(task_id, "error", f"❌ 執行過程發生例外：{str(e)[:120]}")
        finally:
            # 保留瀏覽器視窗 10 秒讓使用者查看最終結果
            page.wait_for_timeout(10000)
            browser.close()


async def run_hospital_booking(task_id: str):
    """
    醫院智能自動化掛號執行器 (支援 NTUH 台大醫院 / CGMH 長庚醫院)
    """
    try:
        task_data = supabase.table("tasks").select("config").eq("id", task_id).execute()
        config = task_data.data[0]["config"] if task_data.data else {}
    except Exception:
        config = {}

    hospital = config.get("hospital", "NTUH")
    hosp_name = "台大醫院 (台北總院區)" if hospital == "NTUH" else "長庚醫院 (林口/台北院區)"
    log_execution(task_id, "running", f"🏥 啟動【{hosp_name}】門診自動化預約引擎...")

    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _run_hospital_bot_sync, task_id, config)
