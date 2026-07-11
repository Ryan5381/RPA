import os
from supabase import create_client, Client
from dotenv import load_dotenv

# 載入環境變數（只在這裡初始化一次，供 dummy_script 等腳本直接 import 使用）
load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)


def log_execution(task_id: str, level: str, message: str):
    """
    透過此 Dispatcher 將腳本執行日誌寫入 Supabase 的 execution_logs 資料表。
    Args:
        task_id: 對應 tasks 資料表的 id
        level: 執行節點標籤/等級（例如 "start", "get_title", "end", "error"）
        message: 要記錄的日誌訊息
    """
    try:
        data_to_insert = {
            "task_id": task_id,
            "level": level,
            "message": message,
        }
        supabase.table("execution_logs").insert(data_to_insert).execute()
        print(f"[Log OK] [{level}] {message}")
    except Exception as e:
        print(f"[Log FAIL] 無法寫入 Supabase execution_logs: {e}")
