"""
正確輸出 Trip.com 航班卡片的 HTML 到檔案做分析
"""
import sys
import io
from playwright.sync_api import sync_playwright
from pathlib import Path

# 強制設定 stdout 為 utf-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

DUMP_FILE = Path(__file__).parent / "trip_card_dump.html"
TEXT_FILE = Path(__file__).parent / "trip_card_text.txt"

def main():
    capsolver_path = str(Path(__file__).parent.parent / "capsolver_extension")
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
        print("Waiting 12 seconds...")
        page.wait_for_timeout(12000)

        output_lines = []
        cards = page.query_selector_all(".f-info-content")
        print(f"Found {len(cards)} .f-info-content cards")
        output_lines.append(f"Found {len(cards)} .f-info-content cards\n")

        for i, card in enumerate(cards[:3]):
            txt = card.text_content() or ""
            inner = card.inner_text() or ""
            html = card.inner_html() or ""

            output_lines.append(f"\n{'='*60}")
            output_lines.append(f"CARD {i}")
            output_lines.append(f"{'='*60}")
            output_lines.append(f"[text_content]: {txt}")
            output_lines.append(f"[inner_text]: {inner}")

            # Try all airline selectors
            for sel in [
                ".flights-name",
                "[data-testid='flights-name']",
                ".airline-name",
                "[class*='airlineName']",
                "[class*='Airline']",
                ".name",
                "[class*='airline']",
                "span[data-ignorechecktext]",
            ]:
                el = card.query_selector(sel)
                if el:
                    val = el.text_content()
                    output_lines.append(f"  [airline sel '{sel}']: '{val}'")

            # Look for baggage-related elements
            for sel in [
                "[class*='baggage']",
                "[class*='luggage']",
                "[class*='行李']",
                "[class*='Baggage']",
            ]:
                els = card.query_selector_all(sel)
                for el in els:
                    output_lines.append(f"  [baggage sel '{sel}']: '{el.text_content()}'")

            # Price elements
            for sel in [
                "[class*='price']",
                "[class*='Price']",
                "[class*='amount']",
            ]:
                el = card.query_selector(sel)
                if el:
                    output_lines.append(f"  [price sel '{sel}']: '{el.text_content()}'")

            output_lines.append(f"\n[inner_html first 1000]:\n{html[:1000]}")

        # Write to file
        with open(TEXT_FILE, "w", encoding="utf-8") as f:
            f.write("\n".join(output_lines))

        # Save full HTML
        with open(DUMP_FILE, "w", encoding="utf-8") as f:
            f.write(page.content())

        print(f"Saved analysis to: {TEXT_FILE}")
        print(f"Saved full HTML to: {DUMP_FILE}")
        browser.close()

if __name__ == "__main__":
    main()
