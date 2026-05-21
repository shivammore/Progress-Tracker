import requests

try:
    response = requests.post("http://localhost:8002/auth/register", json={
        "username": "testuser",
        "password": "testpassword"
    })
    print("Status:", response.status_code)
    print("Response:", response.text)
except Exception as e:
    print("Error:", e)
