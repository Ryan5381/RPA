"""
scripts/__init__.py
腳本路由表：依據 task_type 分派至對應的腳本模組。

新增一種自動化腳本的步驟：
1. 在 scripts/ 資料夾下建立新的 Python 檔案 (例如 hospital_booking.py)
2. 在該檔案中實作 async def run_<name>_script(task_id: str) 函式
3. 在下方的 SCRIPT_ROUTER 字典中加入對應的 key
"""

from .thsr_booking import run_thsr_booking
from .badminton_booking import run_badminton_booking
from .hospital_booking import run_hospital_booking
from .tixcraft_booking import run_tixcraft_booking
from .inline_booking import run_inline_booking
from .flight_scraper import run_flight_scraper

# ─── 腳本路由表 ───────────────────────────────────────────────────────────────
# key: 前端送出時的 task_type 值
# value: 對應的 async 執行函式
SCRIPT_ROUTER = {
    "thsr_booking": run_thsr_booking,
    "badminton_booking": run_badminton_booking,
    "hospital_booking": run_hospital_booking,
    "tixcraft_booking": run_tixcraft_booking,
    "concert_ticket": run_tixcraft_booking,
    "inline_booking": run_inline_booking,
    "flight_search": run_flight_scraper,
}


async def dispatch_script(task_type: str, task_id: str):
    """
    根據 task_type 找到對應腳本並執行。
    若找不到對應腳本或執行異常，將狀態更新為 failed，避免殘留或報錯。
    """
    from tasks_dispatcher import supabase
    handler = SCRIPT_ROUTER.get(task_type)
    if handler is None:
        print(f"[Dispatch Warning] 找不到對應的腳本: task_type='{task_type}' (ID={task_id})。自動將狀態更改為 failed。")
        try:
            supabase.table("tasks").update({"status": "failed"}).eq("id", task_id).execute()
        except Exception as e:
            print(f"[Dispatch Error] 無法更新任務 {task_id} 狀態為 failed: {e}")
        return

    try:
        await handler(task_id)
    except Exception as e:
        print(f"[Dispatch Error] 任務 {task_id} (Type: {task_type}) 執行失敗: {e}")
        try:
            supabase.table("tasks").update({"status": "failed"}).eq("id", task_id).execute()
        except Exception:
            pass
    finally:
        # ===== 新增：所有任務結束後發送 LINE 通知 =====
        try:
            res = supabase.table("tasks").select("status, config").eq("id", task_id).execute()
            if res.data:
                task_info = res.data[0]
                status = task_info.get("status")

                # 有些腳本（例如 tixcraft_booking）自己組了帶節目名稱/區域/票價等
                # 細節的 LINE 通知並直接發送，會在 result 裡標記 line_notified，
                # 這裡看到就跳過制式訊息，避免同一個任務收到兩則通知。
                # 注意：這個查詢包在自己的 try/except 裡、且跟上面主要的 status/config
                # 查詢分開——tasks 資料表目前還沒有 result 這個欄位（需要另外執行
                # ALTER TABLE tasks ADD COLUMN result jsonb; 才會有），欄位不存在時
                # 這裡的查詢一定會失敗，但不該連累上面已經正常運作的制式通知邏輯。
                already_notified = False
                task_result: dict = {}
                try:
                    result_res = supabase.table("tasks").select("result").eq("id", task_id).execute()
                    if result_res.data:
                        task_result = result_res.data[0].get("result") or {}
                        already_notified = bool(task_result.get("line_notified"))
                except Exception:
                    pass

                # 這裡引入 line_notifier
                from utils.line_notifier import send_line_notification
                import json
                from pathlib import Path
                
                # 讀取觸發設定
                triggers = ["success", "fail"]
                config_path = Path(__file__).parent.parent / "line_config.json"
                if config_path.exists():
                    try:
                        with open(config_path, "r", encoding="utf-8") as f:
                            data = json.load(f)
                            triggers = data.get("triggers", triggers)
                    except Exception:
                        pass
                
                title_map = {
                    "thsr_booking": "高鐵訂票",
                    "badminton_booking": "羽球場地",
                    "hospital_booking": "醫院掛號",
                    "tixcraft_booking": "拓元搶票",
                    "concert_ticket": "拓元搶票",
                    "inline_booking": "inline 訂位",
                    "flight_search": "機票搜尋",
                }
                task_name = title_map.get(task_type, task_type)
                
                if already_notified:
                    pass
                elif status == "success" and "success" in triggers:
                    success_msg = task_result.get("message", "")
                    detail_line = f"\n{success_msg}" if success_msg else ""
                    send_line_notification(f"✅ [RPA 機器人] {task_name} 任務執行成功！{detail_line}\n任務ID: {task_id}")
                elif status == "failed" and "fail" in triggers:
                    # 原本這裡完全沒放失敗原因，使用者只會收到「任務執行失敗」，
                    # 得自己回頭看前端系統日誌或問我才知道實際卡在哪一步。
                    fail_reason = task_result.get("error") or task_result.get("message", "")
                    detail_line = f"\n原因：{fail_reason}" if fail_reason else ""
                    send_line_notification(f"❌ [RPA 機器人] {task_name} 任務執行失敗。{detail_line}\n任務ID: {task_id}")
                elif status not in ["success", "failed"]:
                    # 如果因為某些原因還在 running，且 triggers 包含手動或其他
                    # 目前主要處理 success / fail
                    pass
        except Exception as notify_err:
            print(f"[Dispatch Error] 嘗試發送 LINE 通知時發生錯誤: {notify_err}")
