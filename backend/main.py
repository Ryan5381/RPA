import os
import sys
import asyncio
import random
import time
import traceback
from datetime import datetime
from pathlib import Path
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from supabase import create_client, Client
from dotenv import load_dotenv
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from scripts import dispatch_script

# 1. 載入 .env 檔案中的環境變數
load_dotenv()

# 2. 初始化 Supabase 連線
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

async def db(query):
    """在背景執行緒執行 supabase-py 的同步 I/O，避免阻塞 asyncio 事件迴圈
    （supabase-py 目前沒有原生 async client，直接 await .execute() 並不會真的
    釋放事件迴圈，慢查詢會卡住排程 tick 與其他併發中的請求，例如 OTP 輪詢）。"""
    return await asyncio.to_thread(query.execute)

app = FastAPI()

# 3. 設定 CORS，允許前端 React 連線
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. 初始化 APScheduler 非同步排程器
scheduler = AsyncIOScheduler()
PRIORITY_ORDER = {"HIGH": 3, "MED": 2, "LOW": 1}

async def check_scheduled_tasks():
    """
    每 5 秒定時巡邏：檢查是否有 scheduled_at 到期的 queued/scheduled 任務，並依優先度調度執行
    """
    try:
        # 只掃描進入優先序列池 (queued 或 scheduled) 的排程任務，避免觸發歷史 pending 或即時任務
        res = await db(supabase.table("tasks").select("*").in_("status", ["queued", "scheduled"]))
        if not res.data:
            return

        ready_tasks = []
        now_dt = datetime.now()

        for task in res.data:
            scheduled_str = task.get("scheduled_at") or (task.get("config", {}).get("scheduled_at"))
            priority = task.get("priority") or (task.get("config", {}).get("priority", "MED"))

            # 判斷是否已到期或無指定時間 (queued 狀態下無指定時間視為進入排隊派發)
            is_ready = False
            if not scheduled_str:
                is_ready = True
            else:
                try:
                    clean_str = str(scheduled_str).replace("T", " ").split(".")[0]
                    task_dt = datetime.strptime(clean_str, "%Y-%m-%d %H:%M:%S")
                    if task_dt <= now_dt:
                        is_ready = True
                except Exception as parse_err:
                    # 若時間字串格式特殊無法解析，或設為空字串，視為立即執行
                    is_ready = True

            if is_ready:
                ready_tasks.append({
                    "task": task,
                    "priority_weight": PRIORITY_ORDER.get(str(priority).upper(), 2),
                    "created_at": task.get("created_at") or task.get("create_at", "")
                })

        if not ready_tasks:
            return

        # 優先度排序：優先度較高 (weight 較大) 優先；若相同，依照建立時間早先執行
        ready_tasks.sort(key=lambda x: (-x["priority_weight"], x["created_at"]))

        # 到期任務全部一起派發（各自獨立的背景 asyncio task，互不阻塞），
        # 而非過去只挑第一筆、其餘要等下一輪 5 秒 tick 才會啟動——
        # 對同時到點的搶票排程來說，慢個幾秒可能就直接搶輸。
        for entry in ready_tasks:
            target = entry["task"]
            task_id = str(target["id"])
            task_type = str(target["task_type"])
            prio_label = str(target.get("priority") or target.get("config", {}).get("priority", "MED"))

            print(f"[APScheduler] ⏰ 觸發到期/優先排程任務：ID={task_id}, Type={task_type}, Priority={prio_label}")

            # 將狀態正式改為 running
            await db(supabase.table("tasks").update({"status": "running"}).eq("id", task_id))

            # 在非同步背景調用 dispatch_script
            asyncio.create_task(dispatch_script(task_type, task_id))

    except Exception as e:
        print(f"[APScheduler] 掃描排程任務發生異常: {e}")
        traceback.print_exc()

@app.on_event("startup")
async def start_scheduler():
    scheduler.add_job(check_scheduled_tasks, "interval", seconds=5, id="rpa_scheduler_job", replace_existing=True)
    scheduler.start()
    print("[APScheduler] 🚀 RPA 自動化優先序列與排程巡邏引擎已成功啟動 (掃描間隔: 5秒)")

@app.on_event("shutdown")
async def shutdown_scheduler():
    scheduler.shutdown()
    print("[APScheduler] 🛑 排程引擎已關閉")


# 5. 定義前端傳來的資料結構
class TaskPayload(BaseModel):
    task_type: str
    status: Optional[str] = "pending"
    priority: Optional[str] = "MED"
    scheduled_at: Optional[str] = None
    config: Dict[str, Any]

class TaskUpdatePayload(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    scheduled_at: Optional[str] = None
    config: Optional[Dict[str, Any]] = None


# 6. 查詢所有任務清單 (供 Queue 優先序列與 Dashboard 頁面使用)
@app.get("/api/tasks")
async def list_tasks(status: Optional[str] = None):
    try:
        # 優先使用 created_at 排序
        try:
            query1 = supabase.table("tasks").select("*")
            if status:
                query1 = query1.eq("status", status)
            res = await db(query1.order("created_at", desc=True))
        except Exception:
            # 若 created_at 失敗，改試 create_at
            try:
                query2 = supabase.table("tasks").select("*")
                if status:
                    query2 = query2.eq("status", status)
                res = await db(query2.order("create_at", desc=True))
            except Exception:
                # 若兩者皆無，直接不帶排序撈取
                query3 = supabase.table("tasks").select("*")
                if status:
                    query3 = query3.eq("status", status)
                res = await db(query3)

        return {"message": "取得清單成功", "data": res.data or []}
    except Exception as e:
        print("[Error] /api/tasks 列表查詢失敗:", e)
        raise HTTPException(status_code=500, detail=str(e))


# 7. 接收新任務並寫入資料庫 (支援排程與優先度設定)
@app.post("/api/tasks")
async def create_task(payload: TaskPayload):
    try:
        initial_status = payload.status or "pending"
        # 若指定了預約執行時間，將初始狀態預設為 queued (排程中)
        if payload.scheduled_at:
            initial_status = "queued"

        prio = (payload.priority or "MED").upper()

        data_to_insert = {
            "task_type": payload.task_type,
            "status": initial_status,
            "config": {
                **payload.config,
                "priority": prio,
                "scheduled_at": payload.scheduled_at
            }
        }

        try:
            response = await db(supabase.table("tasks").insert(data_to_insert))
        except Exception as insert_err:
            print(f"[Error] 寫入 tasks 失敗: {insert_err}")
            raise insert_err

        return {"message": "任務成功建立！", "data": response.data}
    except Exception as e:
        print("[Error] /api/tasks 建立失敗:", e)
        raise HTTPException(status_code=500, detail=str(e))


# 8. 修改任務狀態、優先度或執行時間
#
# priority / scheduled_at 這兩個欄位跟 create_task 寫入時一樣，一律存在
# config JSONB 裡（tasks 資料表沒有對應的獨立欄位），所以這裡不再嘗試「先當作
# 獨立欄位直接 update，失敗再 fallback 合併進 config」──這種寫法會在任務剛好
# 被同時刪除、cur.data 撈到空結果時，进入例外處理卻沒設到 res，丟出
# UnboundLocalError、回傳不清楚的 500；改成統一固定路徑：讀現有 config、合併、
# 寫回，同時明確在讀不到任務時回 404。
@app.patch("/api/tasks/{task_id}")
async def update_task(task_id: str, payload: TaskUpdatePayload):
    try:
        update_fields = {}
        if payload.status is not None:
            update_fields["status"] = payload.status

        needs_config_merge = (
            payload.priority is not None
            or payload.scheduled_at is not None
            or payload.config is not None
        )
        if needs_config_merge:
            cur = await db(supabase.table("tasks").select("config").eq("id", task_id))
            if not cur.data:
                raise HTTPException(status_code=404, detail=f"找不到任務 {task_id}")
            cur_cfg = cur.data[0].get("config") or {}
            # 先合併前端送來的 config（可能只帶部分欄位），再讓明確指定的
            # priority / scheduled_at 覆蓋——避免 config 裡殘留的舊值蓋掉這次真正要改的值
            if payload.config is not None:
                cur_cfg = {**cur_cfg, **payload.config}
            if payload.priority is not None:
                cur_cfg["priority"] = payload.priority.upper()
            if payload.scheduled_at is not None:
                cur_cfg["scheduled_at"] = payload.scheduled_at
            update_fields["config"] = cur_cfg

        if not update_fields:
            return {"message": "無更新欄位"}

        res = await db(supabase.table("tasks").update(update_fields).eq("id", task_id))
        return {"message": "任務更新成功", "data": res.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 9. 批次清空任務 (支援清理已結束歷史紀錄或全部任務)
@app.delete("/api/tasks/batch/clear")
async def clear_batch_tasks(mode: Optional[str] = "history"):
    try:
        if mode == "all":
            # 刪除所有不是 id 0 的紀錄（即全部任務）
            res = await db(supabase.table("tasks").delete().neq("id", "00000000-0000-0000-0000-000000000000"))
            return {"message": "已清空所有任務紀錄", "data": res.data}
        else:
            # 只清理已結束或殘留：failed, error, completed, success, pending, running
            res = await db(supabase.table("tasks").delete().in_("status", ["failed", "error", "completed", "success", "pending", "running"]))
            return {"message": "已清空所有歷史與已結束任務", "data": res.data}
    except Exception as e:
        print("[Error] 批次清空任務失敗:", e)
        raise HTTPException(status_code=500, detail=str(e))


# 10. 刪除單一任務
@app.delete("/api/tasks/{task_id}")
async def delete_task(task_id: str):
    try:
        res = await db(supabase.table("tasks").delete().eq("id", task_id))
        return {"message": "任務已刪除", "data": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 10. 建立執行腳本的 API 路由，透過 BackgroundTasks 在背景執行
@app.post("/api/tasks/{task_id}/execute")
async def execute_task(task_id: str, background_tasks: BackgroundTasks):
    try:
        task_data = await db(supabase.table("tasks").select("task_type").eq("id", task_id))
        if not task_data.data:
            raise HTTPException(status_code=404, detail=f"找不到 task_id={task_id} 的任務")
        task_type = task_data.data[0]["task_type"]

        # 立即更新狀態為 running
        await db(supabase.table("tasks").update({"status": "running"}).eq("id", task_id))

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


# 11. OTP 提交 API
class OtpPayload(BaseModel):
    otp_code: str

@app.post("/api/tasks/{task_id}/otp")
async def submit_otp(task_id: str, payload: OtpPayload):
    try:
        code = payload.otp_code.strip()
        if not code.isdigit() or len(code) != 4:
            raise HTTPException(status_code=400, detail="OTP 必須為 4 位數字")

        task_data = await db(supabase.table("tasks").select("status").eq("id", task_id))
        if not task_data.data:
            raise HTTPException(status_code=404, detail=f"找不到 task_id={task_id}")
        current_status = task_data.data[0]["status"]
        if current_status != "waiting_otp":
            raise HTTPException(
                status_code=400,
                detail=f"任務狀態為 '{current_status}'，目前不在等待 OTP 的狀態"
            )

        await db(supabase.table("tasks").update({"otp_code": code}).eq("id", task_id))
        return {"message": "OTP 已提交，訂位機器人將立即填入驗證碼", "task_id": task_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 12. 任務狀態查詢 API
@app.get("/api/tasks/{task_id}/status")
async def get_task_status(task_id: str):
    try:
        task_data = await db(supabase.table("tasks").select("id, status").eq("id", task_id))
        if not task_data.data:
            raise HTTPException(status_code=404, detail=f"找不到 task_id={task_id}")
        task = task_data.data[0]

        # result 是額外的診斷欄位（tasks 資料表目前沒有這欄，需另外執行
        # ALTER TABLE tasks ADD COLUMN result jsonb; 才會有），獨立查詢、
        # 失敗就當作 None，不能讓它拖累上面 status 一定要查得到的核心邏輯——
        # 這支 API 是 OTP 流程判斷「有沒有真的等到驗證碼畫面」的依據，
        # 之前兩者包在同一個 select 裡，欄位不存在就讓整支 API 對任何任務都回 500。
        result = None
        try:
            result_data = await db(supabase.table("tasks").select("result").eq("id", task_id))
            if result_data.data:
                result = result_data.data[0].get("result")
        except Exception:
            pass

        return {
            "task_id": task["id"],
            "status": task["status"],
            "result": result,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 13. LINE 通知設定 API
import json

LINE_CONFIG_PATH = Path(__file__).parent / "line_config.json"

class LineSettingsPayload(BaseModel):
    triggers: list[str]

@app.get("/api/settings/line")
async def get_line_settings():
    try:
        has_token = bool(os.environ.get("LINE_CHANNEL_ACCESS_TOKEN", "").strip())
        has_user_id = bool(os.environ.get("LINE_USER_ID", "").strip())
        triggers = ["success", "fail"]
        if LINE_CONFIG_PATH.exists():
            with open(LINE_CONFIG_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                triggers = data.get("triggers", triggers)
        return {
            "triggers": triggers,
            "has_token": has_token,
            "has_user_id": has_user_id,
            # 若兩者都已設定，LINE 通知視為 Active
            "active": has_token and has_user_id,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/settings/line")
async def save_line_settings(payload: LineSettingsPayload):
    try:
        data = {
            "triggers": payload.triggers
        }
        with open(LINE_CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return {"message": "LINE 設定已儲存", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True, loop="asyncio")