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
from . import page_registry  # noqa: F401 — 供各腳本與 main.py 的 WebSocket endpoint 共用

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
                
                if status == "success" and "success" in triggers:
                    send_line_notification(f"✅ [RPA 機器人] {task_name} 任務執行成功！\n任務ID: {task_id}")
                elif status == "failed" and "fail" in triggers:
                    send_line_notification(f"❌ [RPA 機器人] {task_name} 任務執行失敗。\n任務ID: {task_id}")
                elif status not in ["success", "failed"]:
                    # 如果因為某些原因還在 running，且 triggers 包含手動或其他
                    # 目前主要處理 success / fail
                    pass
        except Exception as notify_err:
            print(f"[Dispatch Error] 嘗試發送 LINE 通知時發生錯誤: {notify_err}")
