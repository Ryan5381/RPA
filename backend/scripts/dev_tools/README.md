# dev_tools — 開發期除錯腳本

這個資料夾放的是**開發過程中一次性使用的除錯／探索腳本**，都不是主流程的一部分：

- `scripts/__init__.py` 的 `SCRIPT_ROUTER` 不會 import 這裡的任何檔案
- 後端啟動、任務執行都不依賴它們
- 全部設計為「手動單獨執行」，用來觀察目標網站的實際頁面結構或驗證某段解析邏輯

保留而不刪除的原因：目標網站改版時，這些腳本可以直接拿來重新探查頁面結構，比從零寫一支快得多。

## 執行方式

從 `backend/` 目錄下執行（不是從這個資料夾）：

```bash
cd backend
venv\Scripts\python.exe scripts\dev_tools\<檔名>.py
```

## 檔案說明

### 拓元 (tixCraft) 相關

| 檔案 | 用途 |
|---|---|
| `test_tixcraft_nodriver.py` | 用 nodriver 開啟拓元頁面，驗證能否繞過 Akamai Bot Manager 偵測（**目前有效的方案**） |
| `test_tixcraft_login_state.py` | 檢查 `auth/tixcraft_state.json` 憑證是否仍在登入狀態。注意：此腳本用的是 patchright，會被 Akamai 攔截，回報「被風控攔截」不代表憑證失效 |
| `test_tixcraft_activity_page.py` | 用 patchright 測試進入活動頁面（早期方案，已被 nodriver 取代） |

### Trip.com 機票爬蟲相關

開發 `flight_scraper.py` 時用來分析 Trip.com 航班卡片 HTML 結構的工具：

| 檔案 | 用途 |
|---|---|
| `dump_trip_cards.py` | 把航班卡片的 HTML 輸出成檔案供分析（產生 `trip_card_dump.html` / `trip_card_text.txt`） |
| `dump_trip.py` | 較早期的整頁 dump 版本 |
| `debug_trip.py` | 互動式觀察 Trip.com 頁面 |
| `test_trip_parse.py` | 驗證單程票的卡片解析邏輯 |
| `verify_trip_parse.py` | 驗證航空公司與行李資訊的解析是否正確 |
| `verify_roundtrip.py` | 驗證來回票搜尋頁面的卡片解析 |

### 其他

| 檔案 | 用途 |
|---|---|
| `test_login_replay.py` | 實驗能否完全用 httpx（不開瀏覽器）完成登入流程：取得 ViewState → CapSolver 解 Turnstile → POST 登入表單 |

## 產生的本機檔案（已排除於版控）

- `trip_card_dump.html`、`trip_card_text.txt` — `dump_trip_cards.py` 的輸出
- `.test_login_result.json` — `test_login_replay.py` 的輸出
