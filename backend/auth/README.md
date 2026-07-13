# 拓元售票與各售票平台會員登入憑證說明

此資料夾用於存放 Playwright 瀏覽器會話登入憑證檔案（例如 `tixcraft_state.json`）。

## 為什麼需要保存 State？
拓元 (tixCraft) 等售票網站通常需要綁定 Google 或 Facebook 會員登入。透過預先儲存 Cookie 憑證 (`storage_state`)，自動化機器人啟動時能直接載入您的已登入狀態，跳過繁瑣的第三方登入與簡訊二步驗證。

## 憑證存放路徑與名稱
在前端控制儀表板中，【會員憑證路徑】預設設定為：
```
auth/tixcraft_state.json
```
這是相對 `backend/` 目錄的檔案路徑，實際完整絕對路徑為：
`c:\Users\W\Desktop\RPA\backend\auth\tixcraft_state.json`

## 如何產生會員憑證檔案？
若您希望產出一份全新的已登入 Cookie 憑證，可執行以下 Playwright 指令或使用 Python 腳本開啟瀏覽器並登入：

### 快速指令產出方式
在 terminal 進入 `backend` 目錄後執行：
```powershell
npx playwright codegen https://tixcraft.com --save-storage=auth/tixcraft_state.json
```
或者透過 Python CLI：
```powershell
python -m playwright codegen https://tixcraft.com --save-storage=auth/tixcraft_state.json
```
登入完成後直接關閉瀏覽器，即可在 `auth/tixcraft_state.json` 生成專屬的會員登入 Cookie！
