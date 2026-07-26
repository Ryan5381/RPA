import os
import urllib.request
import zipfile
import json
from pathlib import Path
from dotenv import load_dotenv

def setup_capsolver():
    # 載入 .env
    env_path = Path(__file__).parent.parent / ".env"
    load_dotenv(dotenv_path=env_path)

    api_key = os.environ.get("CAPSOLVER_API_KEY")
    if not api_key:
        print("未在 .env 中找到 CAPSOLVER_API_KEY")
        return

    extension_dir = Path(__file__).parent.parent / "capsolver_extension"
    zip_path = extension_dir / "capsolver.zip"

    # 如果資料夾不存在則建立
    if not extension_dir.exists():
        extension_dir.mkdir(parents=True)

    import urllib.request
    import json
    
    # 1. 取得最新版下載連結
    print("正在取得最新版 Capsolver 連結...")
    try:
        req = urllib.request.Request("https://api.github.com/repos/capsolver/capsolver-browser-extension/releases/latest")
        req.add_header("User-Agent", "Mozilla/5.0")
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            assets = data.get("assets", [])
            url = None
            for asset in assets:
                if asset["name"].endswith(".zip"):
                    url = asset["browser_download_url"]
                    break
            if not url:
                print("找不到 zip 下載連結")
                return
    except Exception as e:
        print(f"取得最新版失敗: {e}")
        return

    print(f"正在下載 Capsolver 擴充套件... ({url})")
    try:
        urllib.request.urlretrieve(url, zip_path)
    except Exception as e:
        print(f"下載失敗: {e}")
        return

    # 2. 解壓縮
    print("正在解壓縮...")
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(extension_dir)

    # 3. 讀取並修改設定檔 (config.js)
    config_path = extension_dir / "assets" / "config.js"
    
    if not config_path.exists():
        print(f"錯誤：找不到 config.js 在 {config_path}")
        return

    print("正在寫入 API Key...")
    with open(config_path, "r", encoding="utf-8") as f:
        content = f.read()

    # 取代 apiKey
    content = content.replace("apiKey: ''", f"apiKey: '{api_key}'")

    with open(config_path, "w", encoding="utf-8") as f:
        f.write(content)

    # 刪除 ZIP
    os.remove(zip_path)
    print("Capsolver 擴充套件設定完成！")

if __name__ == "__main__":
    setup_capsolver()
