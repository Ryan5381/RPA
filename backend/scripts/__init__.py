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
