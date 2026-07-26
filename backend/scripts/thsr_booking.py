import asyncio
from playwright.sync_api import sync_playwright
from tasks_dispatcher import log_execution, supabase
from scripts import page_registry


def _run_thsr_bot_sync(task_id: str):
    log_execution(task_id, "start", "🚄 高鐵訂票機器人啟動！準備讀取任務設定...")

    # 1. 從 Supabase 讀取任務設定 (Config)
    try:
        task_data = supabase.table("tasks").select("config").eq("id", task_id).execute()
        config = task_data.data[0]["config"] if task_data.data else {}
        log_execution(task_id, "start", "成功載入任務參數")
    except Exception as e:
        config = {}
        log_execution(task_id, "error", f"無法讀取任務設定，使用預設值: {e}")

    start_station = config.get("from", "台中")
    dest_station = config.get("to", "台北")
    booking_date = config.get("date", "2026/07/20")
    booking_time = config.get("time", "11:00")
    ticket_count = str(config.get("count", "1"))
    user_id = config.get("user_id", "A123456789")
    user_phone = config.get("user_phone", "0912345678")

    try:
        with sync_playwright() as p:
            # 2. 開啟實體瀏覽器
            browser = p.chromium.launch(headless=False, slow_mo=500)

            # 使用 new_context 設定真實的 User-Agent，並隱藏 Playwright 的自動化特徵 (navigator.webdriver)
            context = browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
            )
            # 關鍵防擋設定：移除瀏覽器中的自動化 WebDriver 標籤
            context.add_init_script("delete navigator.__proto__.webdriver;")

            page = context.new_page()
            page_registry.register_page(task_id, page)  # 登錄供即時截圖串流使用

            # 3. 前往高鐵訂票首頁
            log_execution(task_id, "navigating", "正在前往高鐵訂票網站...")
            page.goto("https://irs.thsrc.com.tw/IMINT/")

            # 4. 處理「我同意」Cookie 彈窗
            try:
                page.locator("button#cookieAccpetBtn").click(timeout=3000)
                log_execution(task_id, "action", "已自動點擊同意 Cookie 政策")
            except:
                pass

            # 5. 第一階段填表：選擇起迄站與數量
            log_execution(task_id, "action", f"正在自動選取站點：{start_station} ➡️ {dest_station}")
            page.select_option("select[name='selectStartStation']", label=start_station)
            page.select_option("select[name='selectDestinationStation']", label=dest_station)

            # 選擇去程日期
            log_execution(task_id, "action", f"正在自動選取日期: {booking_date}")
            page.evaluate(f"""
                const el = document.getElementById('toTimeInputField');
                if (el) {{
                    el.value = '{booking_date}';
                    el.dispatchEvent(new Event('input', {{ bubbles: true }}));
                    el.dispatchEvent(new Event('change', {{ bubbles: true }}));
                }}
            """)

            # 選擇去程時間
            page.select_option("select[name='toTimeTable']", label=booking_time)

            # 選擇張數
            page.select_option("select[name='ticketPanel:rows:0:ticketAmount']", label=ticket_count)

            # 6. 暫停等待救援：人類輸入驗證碼
            log_execution(task_id, "waiting", "⚠️ 機器人暫停：請在瀏覽器手動輸入驗證碼，並點擊『開始查詢』！(限時 120 秒...)")

            # 等待進入第二頁 (BookingS2Form 出現代表驗證成功)
            page.wait_for_selector("form#BookingS2Form", timeout=120000)
            log_execution(task_id, "success", "🎉 驗證碼通關！成功進入車次選擇頁面！")

            # 7. 第二階段填表：選擇車次（支援預約偏好順位自動候補接力）
            target_list = []
            if booking_time:
                target_list.append({"time": booking_time, "label": "首選"})
            for idx, opt in enumerate(config.get("fallback_options", [])):
                if opt.get("time"):
                    target_list.append({"time": opt.get("time"), "label": f"候補 {idx + 1}"})
            
            selected_train = False
            if target_list:
                log_execution(task_id, "action", f"正在根據您的設定嘗試尋找最佳車次...")
                for target in target_list:
                    t_time = target["time"].strip()
                    t_label = target["label"]
                    if not t_time:
                        continue
                    
                    log_execution(task_id, "action", f"▶️ 開始嘗試 {t_label} (時段: {t_time})")
                    try:
                        rows = page.locator("form#BookingS2Form tr").all()
                        for row in rows:
                            text = row.text_content() or ""
                            if t_time in text:
                                radio = row.locator("input[type='radio']")
                                if radio.count() > 0:
                                    radio.first.click()
                                    log_execution(task_id, "success", f"🎯 已鎖定 {t_label} 時段車次 ({t_time})！")
                                    selected_train = True
                                    break
                    except Exception:
                        pass
                        
                    if selected_train:
                        break

            if not selected_train:
                log_execution(task_id, "action", "為您鎖定系統第一個可行之車次...")
                page.locator("form#BookingS2Form input[type='radio']").first.click()

            page.wait_for_timeout(1000)

            # 點擊確認車次按鈕
            submit_btn = page.locator("form#BookingS2Form input[type='submit'], form#BookingS2Form button[type='submit'], #SubmitButton").first
            submit_btn.click()
            log_execution(task_id, "action", "已送出車次，正在前往填寫聯絡人頁面...")

            # 8. 第三階段填表：填寫聯絡人與取票人資訊
            page.wait_for_selector("input[name*='dummyId'], input[id*='idNumber']", timeout=30000)
            log_execution(task_id, "action", "已進入聯絡資訊頁面，開始填寫個人資料...")

            log_execution(task_id, "action", f"輸入身分證字號: {user_id}")
            id_input = page.locator("input[name*='dummyId'], input[id*='idNumber']").first
            id_input.fill(user_id)

            log_execution(task_id, "action", f"輸入手機號碼: {user_phone}")
            phone_input = page.locator("input[name*='dummyPhone'], input[id*='mobile']").first
            phone_input.fill(user_phone)

            # 9. 處理會員資訊 (選擇非會員)
            member_radio = page.locator("#memberSystemRadio3")
            if member_radio.count() > 0:
                member_radio.check()
                log_execution(task_id, "action", "已選擇：非高鐵會員 TGo／企業會員")

            # 10. 勾選同意隱私權與服務條款
            agree_checkbox = page.locator("input[name='agree']").first
            if agree_checkbox.count() > 0:
                agree_checkbox.check()
                log_execution(task_id, "action", "已自動勾選同意隱私權與服務條款")

            # 11. 送出訂單 (點擊「完成訂位」按鈕)
            submit_btn = page.locator("#isSubmit")
            if submit_btn.count() > 0:
                log_execution(task_id, "action", "正在送出訂單，點擊『完成訂位』...")
                submit_btn.click()

                try:
                    log_execution(task_id, "action", "等待訂票結果載入...")
                    page.wait_for_selector("span#ticketID, text=訂位完成", timeout=30000)

                    ticket_id_el = page.locator("span#ticketID").first
                    if ticket_id_el.count() > 0:
                        booking_code = ticket_id_el.inner_text().strip()
                        log_execution(task_id, "success", f"🎉 訂票成功！您的訂位電腦代號為: {booking_code}")
                    else:
                        log_execution(task_id, "success", "🎉 訂票成功！但未能自動取得電腦代號，請在瀏覽器畫面確認。")
                except Exception as e:
                    log_execution(task_id, "error", f"等待訂票結果時發生超時或錯誤: {e}")
            else:
                log_execution(task_id, "error", "找不到『完成訂位』按鈕 (#isSubmit)")

            log_execution(task_id, "end", "高鐵訂票腳本執行結束。")
            page.wait_for_timeout(15000)
            page_registry.unregister_page(task_id)  # 移除截圖串流登錄
            browser.close()

    except Exception as e:
        log_execution(task_id, "error", f"執行發生錯誤: {str(e)}")


async def run_thsr_booking(task_id: str):
    """FastAPI BackgroundTask 入口點"""
    await asyncio.to_thread(_run_thsr_bot_sync, task_id)

run_thsr_script = run_thsr_booking
