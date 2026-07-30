import sys
from playwright.sync_api import sync_playwright
import re

def main():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=False)
        context = browser.new_context(
            locale="zh-TW",
            viewport={"width": 1280, "height": 800}
        )
        page = context.new_page()
        page.goto("https://tw.trip.com/flights/showfarefirst?dcity=tpe&acity=kix&ddate=2026-11-23&flighttype=ow&class=y", wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(20000)
        
        flight_cards = page.query_selector_all('div.flight-item, div[class*="flight-list"] > div, .Bui-flight-card, .f-info-content, .flight-card')
        print(f"Found {len(flight_cards)} cards.")
        
        for i, card in enumerate(flight_cards[:3]):
            text = card.inner_text()
            print(f"\n--- Card {i} text ---")
            print(text)
            print("---------------------")
            
            # Airline parsing
            airline_found = "未知航空"
            lines = text.split("\n")
            possible_airlines = [
                "長榮", "星宇", "中華", "華航", "國泰", "虎航", "樂桃", "酷航", "捷星", 
                "亞洲航空", "日航", "全日空", "大韓", "韓亞", "香港", "澳門", "Air", 
                "Airlines", "航空", "捷星", "泰國", "Peach", "Scoot", "Jetstar", 
                "Tigerair", "Starlux", "EVA", "China Airlines", "Cathay", "ANA", "JAL",
                "越捷", "VietJet", "德威", "T'way", "濟州", "Jeju", "真航空", "Jin Air",
                "快運", "HK Express", "亞航", "AirAsia", "泰獅", "Thai Lion", "酷鳥"
            ]
            for line in lines:
                for a in possible_airlines:
                    if a.lower() in line.lower() and "行李" not in line and "TWD" not in line and "NT$" not in line:
                        airline_found = line.strip()
                        break
                if airline_found != "未知航空":
                    break
            
            if airline_found == "未知航空":
                airline_el = card.query_selector('.flights-name, [data-testid="flights-name"], .airline-name, .flight-name, .name, [class*="airlineName"], [class*="Airline"]')
                if airline_el and airline_el.inner_text().strip():
                    airline_found = airline_el.inner_text().strip()
            
            print("Parsed Airline:", airline_found)
            
            # price parsing
            price_match = re.search(r"(?:NT\$|TWD)\s*([\d,]+)", text)
            if price_match:
                print("Parsed Price:", price_match.group(1))
            else:
                print("Price NOT FOUND in inner_text")

        browser.close()

if __name__ == "__main__":
    main()
