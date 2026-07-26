import os
import sys
import asyncio
import random
import time
import traceback
import secrets
from datetime import datetime
from pathlib import Path
from fastapi import FastAPI, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from supabase import create_client, Client
from dotenv import load_dotenv, set_key
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from scripts import dispatch_script, page_registry

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
        res = supabase.table("tasks").select("*").in_("status", ["queued", "scheduled"]).execute()
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

        # 每次挑選最優先的一筆任務進行派發 (避免並發衝突與資源爭搶)
        target = ready_tasks[0]["task"]
        task_id = str(target["id"])
        task_type = str(target["task_type"])
        prio_label = str(target.get("priority") or target.get("config", {}).get("priority", "MED"))

        print(f"[APScheduler] ⏰ 觸發到期/優先排程任務：ID={task_id}, Type={task_type}, Priority={prio_label}")

        # 將狀態正式改為 running
        supabase.table("tasks").update({"status": "running"}).eq("id", task_id).execute()

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
            res = query1.order("created_at", desc=True).execute()
        except Exception:
            # 若 created_at 失敗，改試 create_at
            try:
                query2 = supabase.table("tasks").select("*")
                if status:
                    query2 = query2.eq("status", status)
                res = query2.order("create_at", desc=True).execute()
            except Exception:
                # 若兩者皆無，直接不帶排序撈取
                query3 = supabase.table("tasks").select("*")
                if status:
                    query3 = query3.eq("status", status)
                res = query3.execute()

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
            response = supabase.table("tasks").insert(data_to_insert).execute()
        except Exception as insert_err:
            print(f"[Error] 寫入 tasks 失敗: {insert_err}")
            raise insert_err

        return {"message": "任務成功建立！", "data": response.data}
    except Exception as e:
        print("[Error] /api/tasks 建立失敗:", e)
        raise HTTPException(status_code=500, detail=str(e))


# 8. 修改任務狀態、優先度或執行時間
@app.patch("/api/tasks/{task_id}")
async def update_task(task_id: str, payload: TaskUpdatePayload):
    try:
        update_fields = {}
        if payload.status is not None:
            update_fields["status"] = payload.status
        if payload.priority is not None:
            update_fields["priority"] = payload.priority.upper()
        if payload.scheduled_at is not None:
            update_fields["scheduled_at"] = payload.scheduled_at
        if payload.config is not None:
            update_fields["config"] = payload.config

        if not update_fields:
            return {"message": "無更新欄位"}

        # 嘗試直接更新，若欄位不存在則同步更新至 config 內部
        try:
            res = supabase.table("tasks").update(update_fields).eq("id", task_id).execute()
        except Exception as patch_err:
            if "column" in str(patch_err).lower() or "schema" in str(patch_err).lower() or "PGRST" in str(patch_err):
                # 抓取目前 config 並合併更新
                cur = supabase.table("tasks").select("config, status").eq("id", task_id).execute()
                if cur.data:
                    cur_cfg = cur.data[0].get("config") or {}
                    safe_fields = {}
                    if "status" in update_fields:
                        safe_fields["status"] = update_fields["status"]
                    if "priority" in update_fields:
                        cur_cfg["priority"] = update_fields["priority"]
                    if "scheduled_at" in update_fields:
                        cur_cfg["scheduled_at"] = update_fields["scheduled_at"]
                    if "config" in update_fields:
                        cur_cfg = {**cur_cfg, **update_fields["config"]}
                    safe_fields["config"] = cur_cfg
                    res = supabase.table("tasks").update(safe_fields).eq("id", task_id).execute()
            else:
                raise patch_err

        return {"message": "任務更新成功", "data": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 9. 批次清空任務 (支援清理已結束歷史紀錄或全部任務)
@app.delete("/api/tasks/batch/clear")
async def clear_batch_tasks(mode: Optional[str] = "history"):
    try:
        if mode == "all":
            # 刪除所有不是 id 0 的紀錄（即全部任務）
            res = supabase.table("tasks").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
            return {"message": "已清空所有任務紀錄", "data": res.data}
        else:
            # 只清理已結束或殘留：failed, error, completed, success, pending, running
            res = supabase.table("tasks").delete().in_("status", ["failed", "error", "completed", "success", "pending", "running"]).execute()
            return {"message": "已清空所有歷史與已結束任務", "data": res.data}
    except Exception as e:
        print("[Error] 批次清空任務失敗:", e)
        raise HTTPException(status_code=500, detail=str(e))


# 10. 刪除單一任務
@app.delete("/api/tasks/{task_id}")
async def delete_task(task_id: str):
    try:
        res = supabase.table("tasks").delete().eq("id", task_id).execute()
        return {"message": "任務已刪除", "data": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 10. 建立執行腳本的 API 路由，透過 BackgroundTasks 在背景執行
@app.post("/api/tasks/{task_id}/execute")
async def execute_task(task_id: str, background_tasks: BackgroundTasks):
    try:
        task_data = supabase.table("tasks").select("task_type").eq("id", task_id).execute()
        if not task_data.data:
            raise HTTPException(status_code=404, detail=f"找不到 task_id={task_id} 的任務")
        task_type = task_data.data[0]["task_type"]

        # 立即更新狀態為 running
        supabase.table("tasks").update({"status": "running"}).eq("id", task_id).execute()

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

        task_data = supabase.table("tasks").select("status").eq("id", task_id).execute()
        if not task_data.data:
            raise HTTPException(status_code=404, detail=f"找不到 task_id={task_id}")
        current_status = task_data.data[0]["status"]
        if current_status != "waiting_otp":
            raise HTTPException(
                status_code=400,
                detail=f"任務狀態為 '{current_status}'，目前不在等待 OTP 的狀態"
            )

        supabase.table("tasks").update({"otp_code": code}).eq("id", task_id).execute()
        return {"message": "OTP 已提交，訂位機器人將立即填入驗證碼", "task_id": task_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 12. 任務狀態查詢 API
@app.get("/api/tasks/{task_id}/status")
async def get_task_status(task_id: str):
    try:
        task_data = supabase.table("tasks").select("id, status, result").eq("id", task_id).execute()
        if not task_data.data:
            raise HTTPException(status_code=404, detail=f"找不到 task_id={task_id}")
        task = task_data.data[0]
        return {
            "task_id": task["id"],
            "status": task["status"],
            "result": task.get("result"),
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

# 14. 瀏覽器即時截圖 WebSocket 串流
@app.websocket("/ws/preview/{task_id}")
async def websocket_preview(websocket: WebSocket, task_id: str):
    """
    每 1 秒擷取指定任務的 Playwright page 截圖並透過 WebSocket 傳送至前端。
    腳本結束（unregister_page）後傳送 idle 訊號並關閉連線。
    """
    await websocket.accept()
    idle_count = 0
    try:
        while True:
            # 在執行緒池中呼叫 sync playwright screenshot（避免阻塞事件迴圈）
            shot: bytes | None = await asyncio.to_thread(page_registry.get_screenshot, task_id)
            if shot is not None:
                import base64
                b64 = base64.b64encode(shot).decode()
                await websocket.send_json({"type": "screenshot", "data": b64})
                idle_count = 0
            else:
                idle_count += 1
                await websocket.send_json({"type": "idle"})
                # 連續 5 秒無 page（任務已結束），主動關閉
                if idle_count >= 5:
                    break
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"[WS Preview] 串流發生異常: {e}")
    finally:
        try:
            await websocket.close()
        except Exception:
            pass


# ─── 15. API 金鑰管理 ──────────────────────────────────────────────────────────
ENV_PATH = Path(__file__).parent / ".env"
WEBHOOK_CONFIG_PATH = Path(__file__).parent / "webhook_config.json"

@app.get("/api/settings/api-key")
async def get_api_key():
    """讀取 .env 中的 API_KEY 並遮罩後回傳。"""
    raw_key = os.environ.get("API_KEY", "")
    if not raw_key:
        return {"api_key_masked": None, "has_key": False}
    masked = raw_key[:8] + "•" * max(0, len(raw_key) - 12) + raw_key[-4:]
    return {"api_key_masked": masked, "has_key": True}

@app.post("/api/settings/api-key/regenerate")
async def regenerate_api_key():
    """產生新的 API Key 並寫入 .env，同步更新環境變數。"""
    new_key = "sk_live_" + secrets.token_hex(16)
    try:
        set_key(str(ENV_PATH), "API_KEY", new_key)
        os.environ["API_KEY"] = new_key
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"寫入 .env 失敗: {e}")
    masked = new_key[:8] + "•" * 20 + new_key[-4:]
    return {"message": "API Key 已重新產生並儲存至 .env", "api_key_masked": masked}


# ─── 16. Webhook URL 設定 ──────────────────────────────────────────────────────
class WebhookPayload(BaseModel):
    webhook_url: str

@app.get("/api/settings/webhook")
async def get_webhook():
    try:
        if WEBHOOK_CONFIG_PATH.exists():
            with open(WEBHOOK_CONFIG_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        return {"webhook_url": ""}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/settings/webhook")
async def save_webhook(payload: WebhookPayload):
    try:
        data = {"webhook_url": payload.webhook_url}
        with open(WEBHOOK_CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return {"message": "Webhook URL 已儲存", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True, loop="asyncio")