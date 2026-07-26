"""
flight_scraper.py
爬取 Google Flights 搜尋結果，找到低於預算的機票後透過 LINE 推播通知使用者。
不自動下單。

修正：改用 sync_playwright + run_in_executor 解決 Windows uvicorn 的
SelectorEventLoop 不支援 asyncio.create_subprocess_exec 的問題。
"""

import re
import asyncio
import concurrent.futures
from datetime import datetime, timedelta
from pathlib import Path

from tasks_dispatcher import supabase, log_execution
from utils.line_notifier import send_line_notification


# ──────────────────────────────────────────────────────────────────
# Helper: Supabase 狀態更新（只更新 status，不碰 result 欄位）
# ──────────────────────────────────────────────────────────────────

def _set_status(task_id: str, status: str) -> None:
    try:
        supabase.table("tasks").update({"status": status}).eq("id", task_id).execute()
    except Exception as e:
        print(f"[flight_scraper] 無法更新 status：{e}")


def _daterange(date_from: str, date_to: str):
    """產生日期區間內的每一天 (YYYY-MM-DD)"""
    try:
        start = datetime.strptime(date_from, "%Y-%m-%d")
        end = datetime.strptime(date_to, "%Y-%m-%d")
    except Exception:
        yield date_from
        return
    current = start
    while current <= end:
        yield current.strftime("%Y-%m-%d")
        current += timedelta(days=1)


# ──────────────────────────────────────────────────────────────────
# 同步爬蟲核心（在 ThreadPoolExecutor 中執行）
# ──────────────────────────────────────────────────────────────────

def _scrape_flights_sync(config: dict, task_id: str) -> dict:
    """
    使用 sync_playwright 在獨立執行緒中執行爬蟲，
    完全繞開 asyncio event loop 的限制。
    """
    from playwright.sync_api import sync_playwright

    origin       = config.get("origin", "TPE")
    destination  = config.get("destination", "NRT")
    date_from    = config.get("date_from", "")
    date_to      = config.get("date_to", date_from)
    budget       = int(config.get("budget", 10000))
    cabin        = config.get("cabin", "economy")
    direct_only  = config.get("direct_only", False)
    trip_type    = config.get("trip_type", "one_way")    # one_way | round_trip
    return_type  = config.get("return_type", "specific_date")
    return_date  = config.get("return_date", "")
    stay_duration = int(config.get("stay_duration", 0))

    found_flights: list = []
    cheap_flights: list = []

    cabin_param = "c" if cabin == "business" else "e"
    stops_flag  = ";s:0" if direct_only else ""   # s:0 = 直飛

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        context = browser.new_context(
            locale="zh-TW",
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
        )
        page = context.new_page()

        search_dates = list(_daterange(date_from, date_to))
        log_execution(task_id, "info", f"共 {len(search_dates)} 個日期待搜尋")

        for single_date_str in _daterange(date_from, date_to):
            search_date = single_date_str
            try:
                # 動態計算回程日期
                current_return_date = return_date
                if trip_type == "round_trip" and return_type == "stay_duration" and stay_duration > 0:
                    dt = datetime.strptime(single_date_str, "%Y-%m-%d")
                    current_return_date = (dt + timedelta(days=stay_duration)).strftime("%Y-%m-%d")
                
                log_execution(task_id, "search", f"搜尋 {search_date} …" + (f" (回程: {current_return_date})" if trip_type == "round_trip" else ""))

                date_compact = search_date.replace("-", "")

                if trip_type == "round_trip" and current_return_date:
                    # 來回票：出發日 + 回程日
                    ret_compact = current_return_date.replace("-", "")
                    search_url = (
                        f"https://www.google.com/travel/flights?hl=zh-TW&curr=TWD"
                        f"#flt={origin}.{destination}.{date_compact}"
                        f"*{destination}.{origin}.{ret_compact}"
                        f";c:{cabin_param}{stops_flag}"
                    )
                else:
                    # 單程票
                    search_url = (
                        f"https://www.google.com/travel/flights?hl=zh-TW&curr=TWD"
                        f"#flt={origin}.{destination}.{date_compact}"
                        f";c:{cabin_param};t:f{stops_flag}"
                    )

                page.goto(search_url, wait_until="networkidle", timeout=35000)
                page.wait_for_timeout(3000)

                price_found = None
                airline_found = "未知航空"
                
                # ── 嘗試抓取含有 aria-label 的航班卡片 (通常是最外層或重要資訊層) ──
                # Google Flights 在 zh-TW 語系下，aria-label 會有 "TWD" 或 "$"
                flight_cards = page.query_selector_all('[aria-label*="TWD"], [aria-label*="NT$"], [aria-label*="$"]')
                
                for card in flight_cards[:15]:
                    label = card.get_attribute("aria-label") or ""
                    # 濾除一些無關的 label
                    if "價格" not in label and "TWD" not in label:
                        continue
                        
                    raw = label.replace(",", "").replace("TWD", "").replace("NT$", "").strip()
                    nums = re.findall(r"\d{4,6}", raw)
                    for n in nums:
                        val = int(n)
                        # 合理的機票價格範圍
                        if 1000 < val < 300000:
                            price_found = val
                            
                            # 嘗試解析航空公司名稱 (通常在 aria-label 的句子中，以句號分隔)
                            # 範例："下午2:20從台北出發，下午6:40抵達東京。星宇航空。飛行時間：3 小時 20 分鐘。價格從 17,219 TWD 起。"
                            parts = label.split("。")
                            if len(parts) >= 3:
                                # 找尋常見的航空關鍵字，或者直接取第二/三段
                                possible_airlines = ["長榮", "星宇", "中華", "華航", "國泰", "虎航", "樂桃", "酷航", "捷星", "亞洲航空", "日航", "全日空", "大韓", "韓亞", "香港", "澳門", "Air", "Airlines", "航空"]
                                for p in parts:
                                    for a in possible_airlines:
                                        if a in p and "出發" not in p and "時間" not in p and "價格" not in p:
                                            airline_found = p.strip()
                                            break
                                    if airline_found != "未知航空":
                                        break
                                if airline_found == "未知航空":
                                    # Fallback: 假設第二句是航空公司
                                    airline_found = parts[1].strip() if "出發" not in parts[1] else "未知航空"
                            break
                    if price_found:
                        break

                # ── 方法 2：從頁面原始碼用 regex 撈 TWD 金額 (Fallback) ──
                if price_found is None:
                    html = page.content()
                    matches = re.findall(r"TWD\s*([\d,]+)|NT\$\s*([\d,]+)", html)
                    for m in matches[:20]:
                        raw_n = (m[0] or m[1]).replace(",", "")
                        try:
                            val = int(raw_n)
                            if 1000 < val < 300000:
                                price_found = val
                                break
                        except ValueError:
                            continue

                if price_found is not None:
                    entry = {
                        "date": search_date,
                        "price": price_found,
                        "airline": airline_found,
                        "search_url": search_url,
                        "origin": origin,
                        "destination": destination,
                        "cabin": cabin,
                        "trip_type": trip_type,
                        "return_date": current_return_date if trip_type == "round_trip" else "",
                    }
                    found_flights.append(entry)
                    if price_found <= budget:
                        cheap_flights.append(entry)

                page.wait_for_timeout(1500)

            except Exception as e:
                log_execution(task_id, "warning", f"{search_date} 搜尋失敗：{e}")

        browser.close()

    found_flights.sort(key=lambda x: x["price"])

    return {
        "origin": origin,
        "destination": destination,
        "date_from": date_from,
        "date_to": date_to,
        "trip_type": trip_type,
        "return_date": return_date,
        "budget": budget,
        "cabin": cabin,
        "direct_only": direct_only,
        "total_searched": len(search_dates),
        "flights_found": len(found_flights),
        "cheap_flights_count": len(cheap_flights),
        "cheapest_price": found_flights[0]["price"] if found_flights else None,
        "cheapest_date": found_flights[0]["date"] if found_flights else None,
        "cheap_flights": cheap_flights,
        "all_results": found_flights[:10],
    }


# ──────────────────────────────────────────────────────────────────
# 同步爬蟲核心 - Trip.com (在 ThreadPoolExecutor 中執行)
# ──────────────────────────────────────────────────────────────────

def _scrape_trip_flights_sync(config: dict, task_id: str) -> dict:
    """
    使用 sync_playwright 爬取 Trip.com 機票。
    防爬蟲較嚴格，使用 headless=False 讓使用者能手動解驗證碼。
    """
    from playwright.sync_api import sync_playwright

    origin       = config.get("origin", "TPE").lower()
    destination  = config.get("destination", "NRT").lower()
    date_from    = config.get("date_from", "")
    date_to      = config.get("date_to", date_from)
    budget       = int(config.get("budget", 10000))
    cabin        = config.get("cabin", "economy")
    trip_type    = config.get("trip_type", "one_way")
    return_type  = config.get("return_type", "specific_date")
    return_date  = config.get("return_date", "")
    stay_duration = int(config.get("stay_duration", 0))

    found_flights: list = []
    cheap_flights: list = []

    cabin_param = "c" if cabin == "business" else "y"
    type_param = "rt" if trip_type == "round_trip" and (return_date or (return_type == "stay_duration" and stay_duration > 0)) else "ow"

    # Capsolver 擴充套件路徑
    capsolver_path = str(Path(__file__).parent.parent / "capsolver_extension")

    with sync_playwright() as pw:
        # Trip.com 會擋 Headless，這裡開實體瀏覽器
        browser = pw.chromium.launch(
            headless=False,
            args=[
                f"--disable-extensions-except={capsolver_path}",
                f"--load-extension={capsolver_path}"
            ]
        )
        context = browser.new_context(
            locale="zh-TW",
            viewport={"width": 1280, "height": 800},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
        )
        page = context.new_page()

        search_dates = list(_daterange(date_from, date_to))
        log_execution(task_id, "info", f"共 {len(search_dates)} 個日期待搜尋 (Trip.com)")

        for single_date_str in _daterange(date_from, date_to):
            search_date = single_date_str
            try:
                # 動態計算回程日期
                current_return_date = return_date
                if trip_type == "round_trip" and return_type == "stay_duration" and stay_duration > 0:
                    dt = datetime.strptime(single_date_str, "%Y-%m-%d")
                    current_return_date = (dt + timedelta(days=stay_duration)).strftime("%Y-%m-%d")

                log_execution(task_id, "search", f"搜尋 {search_date} …" + (f" (回程: {current_return_date})" if trip_type == "round_trip" else ""))

                if type_param == "rt":
                    search_url = (
                        f"https://tw.trip.com/flights/showfarefirst?"
                        f"dcity={origin}&acity={destination}&ddate={search_date}&rdate={current_return_date}"
                        f"&flighttype={type_param}&class={cabin_param}"
                    )
                else:
                    search_url = (
                        f"https://tw.trip.com/flights/showfarefirst?"
                        f"dcity={origin}&acity={destination}&ddate={search_date}"
                        f"&flighttype={type_param}&class={cabin_param}"
                    )

                page.goto(search_url, wait_until="domcontentloaded", timeout=45000)
                
                # 偵測是否遇到驗證碼或防爬機制
                page.wait_for_timeout(3000)
                page_title = page.title()
                if "驗證" in page_title or "Security" in page_title or "Verify" in page_title:
                    log_execution(task_id, "warning", f"⚠️ 遇到安全驗證 (頁面標題: {page_title})！請在彈出的瀏覽器視窗中手動完成驗證。爬蟲將等候 30 秒...")
                    page.wait_for_timeout(30000)
                else:
                    # 智慧等待：等到卡片出現，最多等 20 秒
                    try:
                        page.wait_for_selector(".f-info-content", timeout=20000)
                        log_execution(task_id, "info", "頁面卡片已渲染完成")
                    except Exception:
                        # 若 20 秒還沒出現，再多等 5 秒讓頁面穩定
                        log_execution(task_id, "warning", "等待卡片逾時，嘗試再等 5 秒...")
                        page.wait_for_timeout(5000)

                # 只用 .f-info-content，避免混合 selector 抓到父層容器
                flight_cards = page.query_selector_all(".f-info-content")
                
                price_found = None
                airline_found = "未知航空"
                baggage_info = "無行李資訊"
                depart_time = ""
                arrive_time = ""

                if not flight_cards:
                    log_execution(task_id, "info", f"未找到標準航班卡片，當前頁面標題為: {page_title}")
                    # 如果抓不到特定的卡片，用正則從全網頁抓
                    html = page.content()
                    # Trip.com 通常顯示 NT$ 10,000 或 TWD 10,000
                    matches = re.findall(r"(?:NT\$|TWD)\s*([\d,]+)", html)
                    if matches:
                        log_execution(task_id, "info", f"嘗試從網頁內文解析到 {len(matches)} 筆價格資料")
                    for m in matches[:10]:
                        val = int(m.replace(",", ""))
                        if 1000 < val < 300000:
                            price_found = val
                            break
                else:
                    log_execution(task_id, "info", f"成功抓取到 {len(flight_cards)} 張航班卡片，正在解析...")
                    for card in flight_cards[:10]:
                        text_content = card.text_content() or ""
                        
                        # ── 解析價格：從 text_content 或 aria-label 抓 TWD ──
                        price_match = re.search(r"TWD([\d,]+)", text_content)
                        if not price_match:
                            # 從 aria-label 屬性找價格
                            flight_info_el = card.query_selector('[role="group"][aria-label]')
                            if flight_info_el:
                                aria = flight_info_el.get_attribute("aria-label") or ""
                                price_match = re.search(r"TWD([\d,]+)", aria)

                        if price_match:
                            val = int(price_match.group(1).replace(",", ""))
                            if 1000 < val < 300000:
                                price_found = val

                                # ── 解析航空公司：.flights-name 是最可靠的 ──
                                airline_el = card.query_selector('.flights-name, [data-testid="flights-name"]')
                                if airline_el:
                                    name = airline_el.text_content().strip()
                                    if name:
                                        airline_found = name

                                # ── 解析行李：從 aria-label 解析，或從 class 判斷 ──
                                flight_info_el = card.query_selector('[role="group"][aria-label]')
                                aria_label = flight_info_el.get_attribute("aria-label") if flight_info_el else ""
                                
                                # 判斷行李資訊 (優先從 aria-label)
                                if aria_label:
                                    if "不含托運" in aria_label or "無免費托運" in aria_label:
                                        baggage_info = "⚠️ 不含免費托運行李"
                                    elif "含" in aria_label and ("公斤" in aria_label or "kg" in aria_label.lower()):
                                        # 嘗試提取公斤數
                                        kg_match = re.search(r"含.*?(\d+)\s*公斤", aria_label)
                                        if kg_match:
                                            baggage_info = f"✅ 含 {kg_match.group(1)} 公斤托運行李"
                                        else:
                                            baggage_info = "✅ 含托運行李"
                                    # aria-label 沒有提到行李資訊，繼續靠 class 判斷

                                # 從 class 判斷 (is-baggage-opt 表示行李需加購)
                                if baggage_info == "無行李資訊":
                                    flight_card_el = card.query_selector('[class*="is-baggage-opt"]')
                                    if flight_card_el:
                                        baggage_info = "⚠️ 不含免費托運行李（可加購）"
                                
                                # ── 解析去程 / 到達時間 ──
                                time_els = card.query_selector_all('[data-testid^="flight-time"] span')
                                times = [el.text_content().strip() for el in time_els if el.text_content().strip()]
                                if len(times) >= 2:
                                    depart_time = times[0]
                                    arrive_time = times[-1]
                                elif len(times) == 1:
                                    depart_time = times[0]
                                
                                break
                        if price_found:
                            break

                if price_found is not None:
                    entry = {
                        "date": search_date,
                        "price": price_found,
                        "airline": airline_found,
                        "baggage": baggage_info,
                        "depart_time": depart_time,
                        "arrive_time": arrive_time,
                        "search_url": search_url,
                        "origin": origin,
                        "destination": destination,
                        "cabin": cabin,
                        "trip_type": trip_type,
                        "return_date": current_return_date if trip_type == "round_trip" else "",
                    }
                    found_flights.append(entry)
                    if price_found <= budget:
                        cheap_flights.append(entry)

                page.wait_for_timeout(2000)

            except Exception as e:
                log_execution(task_id, "warning", f"{search_date} 搜尋失敗：{e}")

        browser.close()

    found_flights.sort(key=lambda x: x["price"])

    return {
        "platform": "Trip.com",
        "origin": origin,
        "destination": destination,
        "date_from": date_from,
        "date_to": date_to,
        "trip_type": trip_type,
        "return_date": return_date,
        "budget": budget,
        "cabin": cabin,
        "total_searched": len(search_dates),
        "flights_found": len(found_flights),
        "cheap_flights_count": len(cheap_flights),
        "cheapest_price": found_flights[0]["price"] if found_flights else None,
        "cheapest_date": found_flights[0]["date"] if found_flights else None,
        "cheap_flights": cheap_flights,
        "all_results": found_flights[:10],
    }


# ──────────────────────────────────────────────────────────────────
# Async entry point
# ──────────────────────────────────────────────────────────────────

async def run_flight_scraper(task_id: str):
    """
    機票低價爬蟲 async 入口。
    實際爬蟲在 ThreadPoolExecutor 中同步執行以繞開 Windows 事件迴圈限制。
    """
    # 讀取任務設定
    try:
        res = supabase.table("tasks").select("config").eq("id", task_id).execute()
        if not res.data:
            _set_status(task_id, "failed")
            log_execution(task_id, "error", "找不到任務")
            return
        config = res.data[0].get("config", {})
    except Exception as e:
        _set_status(task_id, "failed")
        log_execution(task_id, "error", f"讀取設定失敗：{e}")
        return

    origin      = config.get("origin", "TPE")
    destination = config.get("destination", "NRT")
    date_from   = config.get("date_from", "")
    date_to     = config.get("date_to", "")
    budget      = int(config.get("budget", 10000))
    platform    = config.get("platform", "google")

    if not date_from or not date_to:
        _set_status(task_id, "failed")
        log_execution(task_id, "error", "請填寫日期區間")
        return

    platform_name = "Trip.com" if platform == "trip" else "Google Flights"
    log_execution(
        task_id, "start",
        f"[機票爬蟲] 開始搜尋 {origin} → {destination}，"
        f"平台: {platform_name}，"
        f"日期 {date_from} ~ {date_to}，預算 NT${budget:,}"
    )
    _set_status(task_id, "running")

    # 在 ThreadPoolExecutor 中執行同步爬蟲
    loop = asyncio.get_event_loop()
    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            if platform == "trip":
                result = await loop.run_in_executor(pool, _scrape_trip_flights_sync, config, task_id)
            else:
                result = await loop.run_in_executor(pool, _scrape_flights_sync, config, task_id)
    except Exception as e:
        log_execution(task_id, "error", f"爬蟲執行失敗：{e}")
        _set_status(task_id, "failed")
        return

    cheap_flights = result.get("cheap_flights", [])
    found_flights = result.get("all_results", [])

    # ── LINE 通知 ──
    if cheap_flights:
        cheapest = cheap_flights[0]
        trip_label = "來回" if result.get("trip_type") == "round_trip" else "單程"
        cheapest_return = cheapest.get('return_date', '') or result.get('return_date', '')
        ret_info = f"回程日期：{cheapest_return}\n" if result.get("trip_type") == "round_trip" and cheapest_return else ""
        airline_name = cheapest.get('airline', '未知航空')
        search_url = cheapest.get('search_url', '')
        baggage_info = cheapest.get('baggage', '')
        platform_label = result.get('platform', 'Google Flights')
        
        baggage_line = f"🧳 行李：{baggage_info}\n" if baggage_info else ""
        depart_time = cheapest.get('depart_time', '')
        arrive_time = cheapest.get('arrive_time', '')
        time_line = f"⏰ 時間：{depart_time} → {arrive_time}\n" if depart_time and arrive_time else (f"⏰ 去程：{depart_time}\n" if depart_time else "")
        
        notify_msg = (
            f"✈️ [RPA 機票低價通知 - {platform_label}]\n"
            f"📍 {origin} → {destination}（{trip_label}）\n"
            f"📅 出發：{cheapest['date']}\n"
            f"{ret_info}"
            f"🏢 航空：{airline_name}\n"
            f"{time_line}"
            f"{baggage_line}"
            f"💰 價格：NT${cheapest['price']:,}（預算 NT${budget:,}）\n\n"
            f"共找到 {len(cheap_flights)} 個低於預算的航班！\n"
            f"🔗 點此立即查看/訂購：\n"
            f"{search_url}"
        )
        send_line_notification(notify_msg)
        log_execution(task_id, "notify", f"LINE 通知已發送：NT${cheapest['price']:,}（{cheapest['date']}）")
        _set_status(task_id, "success")
    elif found_flights:
        cheapest = found_flights[0]
        log_execution(
            task_id, "end",
            f"搜尋完成，最低 NT${cheapest['price']:,}，高於預算 NT${budget:,}，未通知。"
        )
        _set_status(task_id, "success")
    else:
        log_execution(task_id, "end", "搜尋完成，未找到可解析的機票價格。")
        _set_status(task_id, "success")
