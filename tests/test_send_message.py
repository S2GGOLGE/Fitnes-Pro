"""
Mesaj gönderme entegrasyon testi:
1) Login (Ali ve Ayşe)
2) Arkadaşlık isteği gönder (Ali -> Ayşe)
3) Arkadaşlık isteğini kabul et (Ayşe)
4) POST /api/messages ile mesaj gönder (Ali -> Ayşe)
5) GET /api/messages ile konuşma geçmişini kontrol et
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


# -----------------------------------------------------------
# 1. LOGIN
# -----------------------------------------------------------
users = [
    {"username": "ali_test_001", "password": "Test1234"},
    {"username": "ayse_test_002", "password": "Test1234"},
]

tokens = []
user_ids = []

for u in users:
    code, body = http("POST", "/api/auth/login",
                      body={"username": u["username"], "password": u["password"]})
    show(f"LOGIN {u['username']}", code, body)
    try:
        data = json.loads(body)
    except Exception:
        data = {}
    tok = (data.get("data") or {}).get("token") or data.get("token") or ""
    uid = (data.get("data") or {}).get("userId") or data.get("userId")
    tokens.append(tok)
    user_ids.append(uid)

print(f"Tokens: {[t[:20] + '...' if t else None for t in tokens]}")
print(f"UserIds: {user_ids}")

if not all(tokens):
    print("Login başarısız.")
    sys.exit(1)

ali_token, ayse_token = tokens
ali_id, ayse_id = user_ids

# -----------------------------------------------------------
# 2. ARKADAŞLIK İSTEĞİ GÖNDER (Ali -> Ayşe)
# -----------------------------------------------------------
code, body = http("POST", "/api/friends/request",
                  body={"username": "ayse_test_002"}, token=ali_token)
show("FRIEND REQUEST (ali -> ayse)", code, body)

# -----------------------------------------------------------
# 3. AYŞE'NİN BEKLEYEN İSTEKLERİ
# -----------------------------------------------------------
code, body = http("GET", "/api/friends/requests/incoming", token=ayse_token)
show("FRIEND INCOMING (ayse)", code, body)
try:
    data = json.loads(body)
except Exception:
    data = {}
incoming = (data.get("data") or [])
fr_id = None
if isinstance(incoming, list) and len(incoming) > 0:
    fr_id = incoming[0].get("id") or incoming[0].get("Id")
print(f"Ali's friend request id: {fr_id}")

# Eğer zaten kabul edilmişse, accepted-contact üzerinden userId öğrenilir
# -----------------------------------------------------------
# 4. KABUL ET (Ayşe)
# -----------------------------------------------------------
if fr_id:
    code, body = http("POST", f"/api/friends/requests/{fr_id}/accept",
                      token=ayse_token)
    show("FRIEND ACCEPT (ayse)", code, body)

# -----------------------------------------------------------
# 5. KABUL EDİLEN KİŞİLER (Ali)
# -----------------------------------------------------------
code, body = http("GET", "/api/message-requests/accted-message",
                  token=ali_token)
show("ACCEPTED CONTACTS (ali)", code, body)

# -----------------------------------------------------------
# 6. POST /api/messages (Ali -> Ayşe)
# -----------------------------------------------------------
print("\n=== POST /api/messages (Ali -> Ayşe) ===")
code, body = http("POST", "/api/messages",
                  body={"receviverId": ayse_id,
                        "messageType": "Text",
                        "content": "Merhaba, bu ilk mesajim!"},
                  token=ali_token)
show("SEND MESSAGE", code, body)

# -----------------------------------------------------------
# 7. GET /api/messages/{ayse_id} (Ayşe'nin bakış açısı)
# -----------------------------------------------------------
print("\n=== GET /api/messages/{ayse} (Ayşe görüntüleme) ===")
code, body = http("GET", f"/api/messages/{ali_id}", token=ayse_token)
show("CONVERSATION (ayse)", code, body)

# -----------------------------------------------------------
# 8. GEÇERSİZ MESAJ TİPİ TESTİ (validasyon)
# -----------------------------------------------------------
print("\n=== POST /api/messages (invalid type) ===")
code, body = http("POST", "/api/messages",
                  body={"receviverId": ayse_id,
                        "messageType": "Video",
                        "content": "test"},
                  token=ali_token)
show("SEND MESSAGE - INVALID TYPE", code, body)

# -----------------------------------------------------------
# 9. BOŞ İÇERİK TESTİ
# -----------------------------------------------------------
print("\n=== POST /api/messages (empty content) ===")
code, body = http("POST", "/api/messages",
                  body={"receviverId": ayse_id,
                        "messageType": "Text",
                        "content": "   "},
                  token=ali_token)
show("SEND MESSAGE - EMPTY CONTENT", code, body)

# -----------------------------------------------------------
# 10. KENDİ KENDİNE MESAJ TESTİ
# -----------------------------------------------------------
print("\n=== POST /api/messages (self-message) ===")
code, body = http("POST", "/api/messages",
                  body={"receviverId": ali_id,
                        "messageType": "Text",
                        "content": "kendime"},
                  token=ali_token)
show("SEND MESSAGE - SELF", code, body)

print("\n=== Tüm testler tamamlandı ===")