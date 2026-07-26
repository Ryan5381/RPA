import sys
from playwright.sync_api import sync_playwright

def main():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=False)
        context = browser.new_context(
            locale="zh-TW",
            viewport={"width": 1280, "height": 800}
        )
        page = context.new_page()
        print("Visiting Trip.com...")
        # 去程單程，TPE -> KIX
        page.goto("https://tw.trip.com/flights/showfarefirst?dcity=tpe&acity=kix&ddate=2026-11-23&flighttype=ow&class=y", wait_until="domcontentloaded", timeout=45000)
        
        # 讓網頁跑久一點，以防萬一
        page.wait_for_timeout(20000)
        
        # 抓取包含航班名稱的上層元素，看看它是被包在什麼卡片裡
        els = page.query_selector_all('.flights-name')
        if not els:
            els = page.query_selector_all('[data-testid="flights-name"]')
            
        if not els:
            print("找不到 .flights-name")
            html = page.content()
            with open("trip_html.txt", "w", encoding="utf-8") as f:
                f.write(html)
            print("已將完整 HTML 寫入 trip_html.txt")
        else:
            print(f"找到 {len(els)} 個 flights-name，回推卡片...")
            for i, el in enumerate(els[:2]):
                # 往上找父元素，直到包含 TWD 或 NT$
                parent = el.evaluate_handle('''node => {
                    let p = node;
                    while (p && p.innerText && !p.innerText.includes("TWD") && !p.innerText.includes("NT$") && p.tagName !== "BODY") {
                        p = p.parentElement;
                    }
                    return p;
                }''')
                if parent:
                    try:
                        print(f"Parent {i} 的 className: ", parent.evaluate('node => node.className'))
                        with open(f"trip_card_{i}.html", "w", encoding="utf-8") as f:
                            f.write(parent.evaluate('node => node.outerHTML'))
                    except Exception as e:
                        print(f"解析卡片 {i} 失敗: {e}")
                else:
                    print(f"找不到 {i} 的卡片層，只印出航班的父元素...")
                    parent = el.evaluate_handle('node => node.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement')
                    print(f"Parent {i} className: ", parent.evaluate('node => node.className'))
                    with open(f"trip_card_{i}.html", "w", encoding="utf-8") as f:
                        f.write(parent.evaluate('node => node.outerHTML'))
        browser.close()

if __name__ == "__main__":
    main()
