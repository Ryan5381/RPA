"""
快速驗證爬蟲新的解析邏輯是否能正確抓到航空和行李
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
        url = "https://tw.trip.com/flights/showfarefirst?dcity=tpe&acity=kix&ddate=2026-11-23&flighttype=ow&class=y"
        print(f"Opening: {url}")
        page.goto(url, wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(10000)

        cards = page.query_selector_all(".f-info-content")
        print(f"\nFound {len(cards)} cards\n")

        results = []
        for i, card in enumerate(cards[:5]):
            text_content = card.text_content() or ""

            # ── 解析價格 ──
            price_found = None
            price_match = re.search(r"TWD([\d,]+)", text_content)
            if not price_match:
                flight_info_el = card.query_selector('[role="group"][aria-label]')
                if flight_info_el:
                    aria = flight_info_el.get_attribute("aria-label") or ""
                    price_match = re.search(r"TWD([\d,]+)", aria)
            if price_match:
                val = int(price_match.group(1).replace(",", ""))
                if 1000 < val < 300000:
                    price_found = val

            # ── 解析航空 ──
            airline_found = "未知航空"
            airline_el = card.query_selector('.flights-name, [data-testid="flights-name"]')
            if airline_el:
                name = airline_el.text_content().strip()
                if name:
                    airline_found = name

            # ── 解析行李 ──
            baggage_info = "無行李資訊"
            flight_info_el = card.query_selector('[role="group"][aria-label]')
            aria_label = flight_info_el.get_attribute("aria-label") if flight_info_el else ""
            if aria_label:
                if "不含托運" in aria_label or "無免費托運" in aria_label:
                    baggage_info = "⚠️ 不含免費托運行李"
                elif "含" in aria_label and ("公斤" in aria_label or "kg" in aria_label.lower()):
                    kg_match = re.search(r"含.*?(\d+)\s*公斤", aria_label)
                    if kg_match:
                        baggage_info = f"✅ 含 {kg_match.group(1)} 公斤托運行李"
                    else:
                        baggage_info = "✅ 含托運行李"
            if baggage_info == "無行李資訊":
                flight_card_el = card.query_selector('[class*="is-baggage-opt"]')
                if flight_card_el:
                    baggage_info = "⚠️ 不含免費托運行李（可加購）"

            results.append({
                "card": i,
                "price": price_found,
                "airline": airline_found,
                "baggage": baggage_info,
                "aria_label_snippet": aria_label[:120] if aria_label else "(none)",
            })

        print("=" * 60)
        for r in results:
            print(f"Card {r['card']}:")
            print(f"  Price  : NT${r['price']:,}" if r['price'] else "  Price  : NOT FOUND")
            print(f"  Airline: {r['airline']}")
            print(f"  Baggage: {r['baggage']}")
            print(f"  Aria   : {r['aria_label_snippet']}")
            print()

        browser.close()

if __name__ == "__main__":
    main()
