import asyncio
from playwright.sync_api import sync_playwright
from tasks_dispatcher import log_execution


def _run_playwright_sync(task_id: str):
    """
    同步版本的 Playwright 腳本，在獨立執行緒中執行。
    Windows 下 async_playwright 需要 ProactorEventLoop 才能啟動子程序，
    但 uvicorn --reload 的 worker 子程序預設使用 SelectorEventLoop，
    因此改用 sync_playwright + asyncio.to_thread 是最穩固的跨平台方案。
    """
    # 節點 1：開始
    log_execution(task_id, "start", "Playwright 腳本開始執行")

    try:
        with sync_playwright() as p:
            # 開啟 headless 瀏覽器
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            # 前往 example.com
            page.goto("https://example.com")

            # 取得網頁的 Title
            title = page.title()

            # 節點 2：取得 Title
            log_execution(task_id, "get_title", f"成功取得網頁 Title: {title}")

            # 關閉瀏覽器
            browser.close()

        # 節點 3：結束
        log_execution(task_id, "end", "Playwright 腳本執行結束")

    except Exception as e:
        log_execution(task_id, "error", f"執行發生錯誤: {str(e)}")


async def run_dummy_script(task_id: str):
    """
    FastAPI BackgroundTask 入口點（async）。
    使用 asyncio.to_thread 將同步 Playwright 腳本丟入執行緒池，
    不阻塞 event loop，並避免 Windows SelectorEventLoop 限制。
    """
    await asyncio.to_thread(_run_playwright_sync, task_id)
