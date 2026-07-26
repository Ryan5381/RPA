import sys
import re
from playwright.sync_api import sync_playwright

def main():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=False)
        context = browser.new_context(
            locale="zh-TW",
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 800}
        )
        page = context.new_page()
        print("Visiting Trip.com...")
        page.goto("https://tw.trip.com/flights/showfarefirst?dcity=tpe&acity=nrt&ddate=2026-11-23&flighttype=ow&class=y", wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(8000)
        
        cards = page.query_selector_all('div.flight-item, div[class*="flight-list"] > div, .Bui-flight-card')
        if not cards:
            print("No cards found.")
        else:
            print(f"Found {len(cards)} cards.")
            text = cards[0].inner_text()
            print("--- Card Text ---")
            print(text)
            print("--- End ---")
            
            lines = text.split("\n")
            possible_airlines = ["長榮", "星宇", "中華", "華航", "國泰", "虎航", "樂桃", "酷航", "捷星", "亞洲", "日航", "全日空", "大韓", "韓亞", "香港", "澳門", "Air", "Airlines", "航空", "泰國", "Peach", "Scoot", "Jetstar", "Tigerair", "Starlux", "EVA", "China"]
            airline_found = "未知航空"
            for line in lines:
                for a in possible_airlines:
                    if a.lower() in line.lower() and "行李" not in line and "TWD" not in line and "NT$" not in line:
                        airline_found = line.strip()
                        break
                if airline_found != "未知航空":
                    break
            print("Airline parsed:", airline_found)
            
        browser.close()

if __name__ == "__main__":
    main()
