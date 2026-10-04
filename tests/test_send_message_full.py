"""
MessagesEndpoint.js'in beklediği tam formatta POST /api/messages testi.
"""
import json
import sys
import urllib.request
import urllib.error

BASE = "http://localhost:5000"


def http(method, path, body=None, token=None):
    headers = {"Accept": "application/json"}
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(
        f"{BASE}{path}", data=data, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        return resp.status, resp.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8")
    except Exception as e:
        return 0, str(e)


def show(label, code, body):
    snippet = (body or "")[:300]
    print(f"[{label}] HTTP={code} :: {snippet}")


# Login
code, body = http("POST", "/api/auth/login",
                  body={"username": "ali_test_001", "password": "Test1234"})
ali_token = (json.loads(body).get("data") or {}).get("token")
code, body = http("POST", "/api/auth/login",
                  body={"username": "ayse_test_002", "password": "Test1234"})
ayse_token = (json.loads(body).get("data") or {}).get("token")
code, body = http("GET", "/api/auth/me", token=ali_token)
ali_id = (json.loads(body).get("data") or {}).get("userId")
code, body = http("GET", "/api/auth/me", token=ayse_token)
ayse_id = (json.loads(body).get("data") or {}).get("userId")

print(f"ali_id={ali_id} ayse_id={ayse_id}")

# -----------------------------------------------------------
# 1) MessagesEndpoint.js'in beklediği tam formatta POST
# -----------------------------------------------------------
print("\n=== 1) MessagesEndpoint.js formatinda POST ===")
code, body = http("POST", "/api/messages",
                  body={
                      "receviverId": ayse_id,   # typo, frontend bunu gönderiyor
                      "messageType": "Text",
                      "content": "Frontend formatinda test mesaj"
                  },
                  token=ali_token)
show("SEND (frontend format)", code, body)

# -----------------------------------------------------------
# 2) Buyuk harfle POST (model binding case-insensitive testi)
# -----------------------------------------------------------
print("\n=== 2) Buyuk harfle POST ===")
code, body = http("POST", "/api/messages",
                  body={
                      "ReceviverId": ayse_id,
                      "MessageType": "Text",
                      "Content": "Buyuk harf"
                  },
                  token=ali_token)
show("SEND (PascalCase)", code, body)

# -----------------------------------------------------------
# 3) ReceviverId olmadan POST (validasyon)
# -----------------------------------------------------------
print("\n=== 3) ReceviverId yoksa POST ===")
code, body = http("POST", "/api/messages",
                  body={
                      "messageType": "Text",
                      "content": "Alicisiz"
                  },
                  token=ali_token)
show("SEND (no receiver)", code, body)

# -----------------------------------------------------------
# 4) GET /api/messages/{id} test et (artik 500 olabilir, backend bug)
# -----------------------------------------------------------
print("\n=== 4) GET /api/messages/{id} ===")
code, body = http("GET", f"/api/messages/{ayse_id}", token=ali_token)
show("GET conversation", code, body)

print("\n=== Tum testler tamamlandi ===")