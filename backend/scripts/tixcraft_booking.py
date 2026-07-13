import os
import time
import asyncio
from playwright.sync_api import sync_playwright
from tasks_dispatcher import log_execution, supabase


def _recognize_captcha_ocr(image_bytes: bytes) -> str:
    """
    嘗試使用 ddddocr 搭配多道影像前處理與嚴格 4 碼字母校驗進行高精確度 OCR 辨識。
    """
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


def _run_tixcraft_bot_sync(task_id: str):
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

    try:
        with sync_playwright() as p:
            # 2. 啟動實體 Chromium 瀏覽器（加入繞過 Akamai Bot Manager 與 Blink AutomationControlled 偵測參數）
            browser = p.chromium.launch(
                headless=False,
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--disable-infobars",
                    "--no-sandbox",
                    "--disable-dev-shm-usage",
                ],
                ignore_default_args=["--enable-automation"],
            )

            context_options = {
                "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                "viewport": {"width": 1280, "height": 800},
                "locale": "zh-TW",
                "timezone_id": "Asia/Taipei",
            }

            # 檢查是否有預先保留的 Cookie 狀態 (維持 Google/FB 會員登入)
            if os.path.exists(auth_state_path):
                context_options["storage_state"] = auth_state_path
                log_execution(task_id, "start", f"已載入會員登入授權憑證: {auth_state_path}")
            else:
                log_execution(task_id, "start", "提示：未偵測到預先儲存的會員 Cookie，若需登入請先於瀏覽器完成登入")

            context = browser.new_context(**context_options)

            # 關鍵防反爬蟲與 Akamai Bot Manager 突破腳本：全方位指紋偽裝
            context.add_init_script("""
                // 1. 徹底隱藏 webdriver 標籤
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined
                });
                delete navigator.__proto__.webdriver;

                // 2. 模擬真實 Chrome 執行環境物件
                window.chrome = {
                    runtime: {}
                };

                // 3. 偽裝 plugins 與 languages
                Object.defineProperty(navigator, 'plugins', {
                    get: () => [1, 2, 3, 4, 5]
                });
                Object.defineProperty(navigator, 'languages', {
                    get: () => ['zh-TW', 'zh', 'en-US', 'en']
                });

                // 4. 繞過 navigator.permissions.query 自動化檢查
                const originalQuery = window.navigator.permissions.query;
                window.navigator.permissions.query = (parameters) => (
                    parameters.name === 'notifications' ?
                        Promise.resolve({ state: Notification.permission }) :
                        originalQuery(parameters)
                );
            """)

            page = context.new_page()

            # 3. 直達活動場次頁面 (/activity/game/...)，省去簡介頁點擊轉址的時間
            if "/activity/detail/" in activity_url:
                activity_url = activity_url.replace("/activity/detail/", "/activity/game/")
                log_execution(task_id, "action", f"為極速搶票，自動轉換至場次表直達網址: {activity_url}")

            log_execution(task_id, "navigating", f"正在直接前往場次購票頁面: {activity_url}")
            page.goto(activity_url, timeout=30000)

            # 偵測是否被 Akamai Bot Manager 風控攔截
            if "Browsing Activity Has Been Paused" in page.content() or "unusual behavior" in page.content():
                log_execution(task_id, "error", "⚠️ 偵測到 Akamai / Ticketmaster 風控攔截畫面！請在彈出的瀏覽器視窗完成驗證，或切換手機 4G/5G 網路 IP 後再試")

            # 如果在活動簡介首頁 (/activity/detail/...)，自動前往場次表頁面 (/activity/game/...)
            buy_tab = page.locator("a[href*='/activity/game/'], a:has-text('立即購票'), a:has-text('立即訂購'), a:has-text('Buy Tickets'), li.buy a")
            if buy_tab.count() > 0 and buy_tab.first.is_visible():
                log_execution(task_id, "action", "點擊活動頁面【立即購票 / Buy Tickets】分頁進入場次表")
                buy_tab.first.click()
                page.wait_for_load_state("domcontentloaded")
            elif "/activity/detail/" in page.url:
                game_url = page.url.replace("/activity/detail/", "/activity/game/")
                log_execution(task_id, "action", f"自動切換至節目場次清單網址: {game_url}")
                page.goto(game_url, timeout=20000)
                page.wait_for_load_state("domcontentloaded")

            # 4. 場次選擇步驟 (尋找 Find tickets / 立即訂購 按鈕進入選區)
            log_execution(task_id, "action", f"尋找目標場次與進入選區按鈕 (Find tickets / 立即訂購): '{target_date or '預設第一場'}'")
            try:
                buy_btn_selector = (
                    "button[data-href*='/ticket/area/'], "
                    "a[href*='/ticket/area/'], "
                    "button:has-text('Find tickets'), "
                    "button:has-text('立即訂購'), "
                    "button:has-text('立即購票'), "
                    "a:has-text('Find tickets'), "
                    "a:has-text('立即訂購'), "
                    "a:has-text('立即購票'), "
                    "table.table button.btn-primary"
                )
                target_btn = None

                if target_date:
                    date_variants = [target_date, target_date.replace("/", "-"), target_date.replace("-", "/")]
                    for dt in date_variants:
                        date_container = page.locator(f"tr:has-text('{dt}'), li:has-text('{dt}'), div.game-list:has-text('{dt}')")
                        if date_container.count() > 0:
                            candidate = date_container.first.locator(buy_btn_selector).first
                            try:
                                candidate.wait_for(state="visible", timeout=3000)
                                target_btn = candidate
                                log_execution(task_id, "action", f"已成功匹配並定位到指定日期場次: {dt}")
                                break
                            except Exception:
                                pass

                if not target_btn:
                    candidate = page.locator(buy_btn_selector).first
                    try:
                        log_execution(task_id, "action", "正在等待頁面購票按鈕顯示 (最長等待 10 秒以容許網頁渲染或 Akamai 驗證過關)...")
                        candidate.wait_for(state="visible", timeout=10000)
                        target_btn = candidate
                    except Exception:
                        pass

                if target_btn:
                    data_href = target_btn.get_attribute("data-href") or target_btn.get_attribute("href")
                    target_btn.click()
                    log_execution(task_id, "action", "已點擊【Find tickets / 立即訂購】按鈕，等待跳轉選區...")
                    
                    # 確保成功跳轉至選區頁面：若 JS 點擊事件未跳轉，直接使用 data-href 導航
                    try:
                        page.wait_for_url("**/ticket/area/**", timeout=4000)
                    except Exception:
                        if data_href and "/ticket/area/" in data_href:
                            full_url = data_href if data_href.startswith("http") else f"https://tixcraft.com{data_href}"
                            log_execution(task_id, "action", f"為確保穩定跳轉，直接導航至區域選擇頁面: {full_url}")
                            page.goto(full_url, timeout=20000)
                else:
                    log_execution(task_id, "error", "當前頁面超過 10 秒仍找不到任何可用的【Find tickets / 立即訂購】按鈕 (可能是尚未開賣、售罄或處於驗證攔截中)")
            except Exception as e:
                log_execution(task_id, "error", f"選擇場次步驟遇到例外: {e}")

            # 等待載入完成
            page.wait_for_load_state("domcontentloaded")

            # 驗證是否成功進入區域選擇或張數選擇頁面
            reached_area_or_ticket = False

            # 5. 區域選擇步驟 (/ticket/area/...)
            if "/ticket/area/" in page.url or page.locator(".zone, .area-list").count() > 0:
                reached_area_or_ticket = True
                log_execution(task_id, "action", f"已成功跳轉進入選區頁面，正在進行區域模糊比對: '{target_area}'")
                try:
                    matched = False
                    if target_area:
                        # 優先尋找符合關鍵字且可點擊的區域連結 (排除 Sold out / 已售完 的文字)
                        area_links = page.locator(f"ul.area-list a:has-text('{target_area}'), .area-list li.select_form_a a:has-text('{target_area}')")
                        if area_links.count() > 0 and area_links.first.is_visible():
                            area_text = area_links.first.inner_text().strip()
                            area_links.first.click()
                            matched = True
                            log_execution(task_id, "action", f"成功鎖定並選取指定票價區域: {area_text}")

                    if not matched:
                        # 若指定區域售罄或未填寫，尋找全場第一個開放選購的區域連結 (<li class="select_form_a"><a> 或帶有剩餘席次的 <a>)
                        available_area = page.locator("ul.area-list li.select_form_a a, ul.area-list a[id]:not(:has-text('Sold out')):not(:has-text('已售完'))").first
                        if available_area.count() > 0 and available_area.is_visible():
                            area_text = available_area.inner_text().strip()
                            available_area.click()
                            log_execution(task_id, "action", f"已自動選擇候補開放選購區域: {area_text}")
                        else:
                            log_execution(task_id, "error", "當前所有票價區域皆顯示為售罄 (Sold out)")
                except Exception as e:
                    log_execution(task_id, "error", f"區域選取異常: {e}")

                page.wait_for_load_state("domcontentloaded")

            # 6. 張數選取與驗證碼步驟 (/ticket/ticket/...)
            if "/ticket/ticket/" in page.url or page.locator("select[id^='TicketForm_ticketPrice']").count() > 0:
                reached_area_or_ticket = True
                log_execution(task_id, "action", f"進入訂單票數選取頁面，自動選取張數: {ticket_count} 張")
                try:
                    select_elem = page.locator("select[id^='TicketForm_ticketPrice']").first
                    if select_elem.count() > 0:
                        select_elem.select_option(ticket_count)
                        log_execution(task_id, "action", f"已完成張數選取：{ticket_count} 張")
                except Exception as e:
                    log_execution(task_id, "error", f"選取票數發生問題: {e}")

                # 勾選同意會員服務條款
                try:
                    agree_checkbox = page.locator("input#TicketForm_agree")
                    if agree_checkbox.count() > 0 and not agree_checkbox.is_checked():
                        agree_checkbox.check()
                        log_execution(task_id, "action", "已自動勾選【我已閱讀並同意服務條款】")
                except Exception as e:
                    log_execution(task_id, "error", f"勾選同意條款失敗: {e}")

                # 7. 驗證碼 OCR 截圖與高精確度自動辨識 (含錯誤刷新重試機制)
                log_execution(task_id, "action", "正在定位驗證碼圖片 (#TicketForm_verifyCode-image) 並進行高準度 OCR 辨識...")
                try:
                    captcha_img = page.locator("#TicketForm_verifyCode-image")
                    ocr_code = ""
                    for attempt in range(1, 4):
                        if captcha_img.count() > 0 and captcha_img.is_visible():
                            captcha_bytes = captcha_img.screenshot()
                            candidate_code = _recognize_captcha_ocr(captcha_bytes)
                            if len(candidate_code) == 4 and candidate_code.isalpha():
                                ocr_code = candidate_code
                                log_execution(task_id, "action", f"第 {attempt} 次 OCR 成功辨識為標準 4 碼驗證碼: '{ocr_code}'！")
                                break
                            else:
                                log_execution(task_id, "action", f"第 {attempt} 次辨識結果未達 4 碼嚴格標準，自動點擊圖片刷新驗證碼...")
                                try:
                                    captcha_img.click()
                                    page.wait_for_timeout(400)
                                except Exception:
                                    break

                    if len(ocr_code) == 4:
                        log_execution(task_id, "action", f"填入高確信度驗證碼 '{ocr_code}' 並送出表單...")
                        page.fill("input#TicketForm_verifyCode", ocr_code)
                        submit_btn = page.locator("button[type='submit'], button.btn-green").first
                        if submit_btn.count() > 0 and submit_btn.is_visible():
                            submit_btn.click()
                            log_execution(task_id, "action", "已點擊【Submit / 確認張數並送出】按鈕！")
                    else:
                        log_execution(task_id, "action", "自動辨識未達 100% 信心標準，已為您將游標聚焦輸入框！請直接敲 4 碼按 Enter 直達結帳")
                        try:
                            page.focus("input#TicketForm_verifyCode")
                        except Exception:
                            pass
                except Exception as e:
                    log_execution(task_id, "error", f"驗證碼截圖與處理失敗: {e}")

            if reached_area_or_ticket:
                log_execution(task_id, "success", "🎉 拓元選票流程執行完畢！已為您自動完成選區與選張數，請輸入驗證碼完成結帳")
            else:
                log_execution(task_id, "error", "❌ 未能成功進入選區或選張數頁面！請確認活動是否開放購票，或是否遇到登入攔截")

            # 延長等待時間至 60 秒以保留充裕時間確認與付款
            page.wait_for_timeout(60000)
            browser.close()

    except Exception as e:
        log_execution(task_id, "error", f"執行發生錯誤: {str(e)}")


async def run_tixcraft_booking(task_id: str):
    """FastAPI BackgroundTask 入口點"""
    await asyncio.to_thread(_run_tixcraft_bot_sync, task_id)
