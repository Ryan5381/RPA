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

# ─── 腳本路由表 ───────────────────────────────────────────────────────────────
# key: 前端送出時的 task_type 值
# value: 對應的 async 執行函式
SCRIPT_ROUTER = {
    "thsr_booking": run_thsr_booking,
    "badminton_booking": run_badminton_booking,
    "hospital_booking": run_hospital_booking,
    # "concert_ticket":  run_concert_script,
}


async def dispatch_script(task_type: str, task_id: str):
    """
    根據 task_type 找到對應腳本並執行。
    若找不到對應腳本，會拋出 ValueError。
    """
    handler = SCRIPT_ROUTER.get(task_type)
    if handler is None:
        raise ValueError(f"找不到對應的腳本: task_type='{task_type}'。請確認 SCRIPT_ROUTER 中是否已登錄此類型。")
    await handler(task_id)
