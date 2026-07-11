import os
import sys
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, Optional
from supabase import create_client, Client
from dotenv import load_dotenv
from scripts import dispatch_script

# 1. 載入 .env 檔案中的環境變數
load_dotenv()

# 2. 初始化 Supabase 連線
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

app = FastAPI()

# 3. 設定 CORS，允許前端 React 連線
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 4. 定義前端傳來的資料結構
class TaskPayload(BaseModel):
    task_type: str
    status: str = "pending"
    config: Dict[str, Any]


# 5. 建立第一支 API 路由：接收任務並寫入資料庫
@app.post("/api/tasks")
async def create_task(payload: TaskPayload):
    try:
        data_to_insert = {
            "task_type": payload.task_type,
            "status": payload.status,
            "config": payload.config,
        }
        response = supabase.table("tasks").insert(data_to_insert).execute()
        return {"message": "任務成功建立！", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 6. 建立執行腳本的 API 路由，透過 BackgroundTasks 在背景執行
@app.post("/api/tasks/{task_id}/execute")
async def execute_task(task_id: str, background_tasks: BackgroundTasks):
    try:
        # 從 Supabase 查詢此 task 的 task_type，以決定要呼叫哪個腳本
        task_data = supabase.table("tasks").select("task_type").eq("id", task_id).execute()
        if not task_data.data:
            raise HTTPException(status_code=404, detail=f"找不到 task_id={task_id} 的任務")
        task_type = task_data.data[0]["task_type"]

        # 將 dispatch_script 加入背景佇列，API 立即回覆不被卡住
        background_tasks.add_task(dispatch_script, task_type, task_id)
        return {
            "message": f"任務 {task_id} (類型: {task_type}) 已派發至背景執行器",
            "task_id": task_id,
            "task_type": task_type,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    # 加上 loop="asyncio" 強制使用系統預設支援背景程序的引擎
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True, loop="asyncio")