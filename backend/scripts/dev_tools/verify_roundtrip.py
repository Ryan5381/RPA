"""
驗證來回票 (round trip) 搜尋頁面的卡片解析
"""
import re
import sys
import io
from playwright.sync_api import sync_playwright
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

def main():
    capsolver_path = str(Path(__file__).parent.parent.parent / "capsolver_extension")
    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=False,
            args=[
                f"--disable-extensions-except={capsolver_path}",
                f"--load-extension={capsolver_path}"
            ]
        )
        context = browser.new_context(
            locale="zh-TW",
            viewport={"width": 1280, "height": 900},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
        )
        page = context.new_page()
        
        # 來回票 URL
        url = "https://tw.trip.com/flights/showfarefirst?dcity=tpe&acity=kix&ddate=2026-11-20&rdate=2026-11-25&flighttype=rt&class=y"
        print(f"Opening ROUND TRIP: {url}")
        page.goto(url, wait_until="domcontentloaded", timeout=45000)
        print("Waiting 12 seconds...")
        page.wait_for_timeout(12000)

        cards = page.query_selector_all(".f-info-content")
        print(f"\nFound {len(cards)} .f-info-content cards\n")

        for i, card in enumerate(cards[:3]):
            text_content = card.text_content() or ""
            print(f"--- Card {i} text_content ---")
            print(text_content[:200])
            print()

            # Price
            price_match = re.search(r"TWD([\d,]+)", text_content)
            if not price_match:
                flight_info_el = card.query_selector('[role="group"][aria-label]')
                if flight_info_el:
                    aria = flight_info_el.get_attribute("aria-label") or ""
                    price_match = re.search(r"TWD([\d,]+)", aria)
            price = price_match.group(1) if price_match else "NOT FOUND"

            # Airline
            airline = "未知航空"
            airline_el = card.query_selector('.flights-name, [data-testid="flights-name"]')
            if airline_el:
                name = airline_el.text_content().strip()
                if name:
                    airline = name

            # Aria label
            flight_info_el = card.query_selector('[role="group"][aria-label]')
            aria_label = flight_info_el.get_attribute("aria-label") if flight_info_el else ""

            print(f"  Price  : TWD{price}")
            print(f"  Airline: {airline}")
            print(f"  Aria   : {aria_label[:150] if aria_label else '(none)'}")
            print()

        browser.close()

if __name__ == "__main__":
    main()
