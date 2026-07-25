import os
import requests
import json
from pathlib import Path
from dotenv import load_dotenv

# 確保載入 .env 變數
load_dotenv()

# 從環境變數讀取
LINE_CHANNEL_ACCESS_TOKEN = os.getenv("LINE_CHANNEL_ACCESS_TOKEN")
# 預設的 User ID
ENV_USER_ID = os.getenv("LINE_USER_ID")

LINE_CONFIG_PATH = Path(__file__).parent.parent / "line_config.json"

def send_line_notification(message: str, user_id: str = None):
    """
    使用 LINE Messaging API 發送 Push Message
    """
    target_user_id = user_id or ENV_USER_ID
    
    if not LINE_CHANNEL_ACCESS_TOKEN or not target_user_id or target_user_id == "請在此填入您的_LINE_USER_ID":
        print("[LINE Notify] 未設定 LINE Token 或 User ID，無法發送 LINE 通知。")
        return False

    url = "https://api.line.me/v2/bot/message/push"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {LINE_CHANNEL_ACCESS_TOKEN}"
    }
    
    payload = {
        "to": target_user_id,
        "messages": [
            {
                "type": "text",
                "text": message
            }
        ]
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        response.raise_for_status()
        print("[LINE Notify] ✅ 通知發送成功！")
        return True
    except requests.exceptions.RequestException as e:
        print(f"[LINE Notify] ❌ 發送失敗: {e}")
        if e.response is not None:
            print(f"[LINE Notify] 錯誤詳情: {e.response.text}")
        return False
