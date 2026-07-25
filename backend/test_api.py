import requests

try:
    response = requests.post(
        "http://127.0.0.1:8000/api/settings/line",
        json={"triggers": ["success"]}
    )
    print("Status:", response.status_code)
    print("Response:", response.text)
except Exception as e:
    print("Error:", e)
