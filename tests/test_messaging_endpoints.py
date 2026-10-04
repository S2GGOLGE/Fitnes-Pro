"""
Fitness Pro - Mesajlaşma Backend Entegrasyon Testi
Backend'in gerçek endpoint'lerini doğrular.
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
        f"{BASE}{path}",
        data=data,
        headers=headers,
        method=method,
    )
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        return resp.status, resp.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8")
    except Exception as e:
        return 0, str(e)


def show(label, code, body):
    snippet = body[:200] if body else ""
    print(f"[{label}] HTTP={code} :: {snippet}")


# -----------------------------------------------------------
# 1. SAĞLIK KONTROLÜ
# -----------------------------------------------------------
code, body = http("GET", "/health")
show("HEALTH", code, body)
assert code == 200, "Backend ayakta değil"

# -----------------------------------------------------------
# 2. İKİ KULLANICI KAYDI
# -----------------------------------------------------------
users = [
    {"name": "Ali", "surname": "Bir", "username": "ali_test_001",
     "email": "ali001@test.com", "password": "Test1234",
     "passwordRepeat": "Test1234", "level": "Acemi"},
    {"name": "Ayşe", "surname": "Iki", "username": "ayse_test_002",
     "email": "ayse002@test.com", "password": "Test1234",
     "passwordRepeat": "Test1234", "level": "Acemi"},
]

user_ids = []
for u in users:
    code, body = http("POST", "/api/register", body=u)
    show(f"REGISTER {u['username']}", code, body)
    if code in (200, 400):
        # 200 = yeni, 400 = zaten var (sorun değil)
        try:
            data = json.loads(body)
        except Exception:
            data = {}

# -----------------------------------------------------------
# 3. LOGIN
# -----------------------------------------------------------
tokens = []
for u in users:
    code, body = http("POST", "/api/auth/login",
                      body={"username": u["username"], "password": u["password"]})
    show(f"LOGIN {u['username']}", code, body)
    try:
        data = json.loads(body)
    except Exception:
        data = {}
    if data.get("success"):
        # token veri yolu: data.data.token veya doğrudan data.token
        tok = (data.get("data") or {}).get("token") or data.get("token") or ""
        tokens.append(tok)
    else:
        tokens.append(None)

print("Tokens:", [t[:20] + "..." if t else None for t in tokens])

if not all(tokens):
    print("Login başarısız; testler için gerekli token yok.")
    sys.exit(1)

ali_token, ayse_token = tokens

# -----------------------------------------------------------
# 4. MEVCUT KULLANICI BİLGİSİ (userId öğrenmek için)
# -----------------------------------------------------------
code, body = http("GET", "/api/auth/me", token=ali_token)
show("ME (ali)", code, body)

# -----------------------------------------------------------
# 5. MESAJ İSTEĞİ GÖNDER (POST /api/message-requests)
# -----------------------------------------------------------
# alıcı userId'yi bulmak için /api/message-requests/accted-message
# endpoint'ini kullanamayız çünkü henüz kabul yok. /api/auth/me ile
# kendi ID'mizi alabiliriz ama diğer kullanıcının ID'sini bulmamız
# gerekiyor. Bunun için login response içindeki userId alanını
# kullanırız (varsa).
ali_login = json.loads(http("POST", "/api/auth/login",
                            body={"username": users[0]["username"],
                                  "password": users[0]["password"]})[1])
ayse_login = json.loads(http("POST", "/api/auth/login",
                             body={"username": users[1]["username"],
                                   "password": users[1]["password"]})[1])

print("ali_login keys:", list(ali_login.keys()) if ali_login else None)
print("ali_login data keys:",
      list((ali_login.get("data") or {}).keys()) if ali_login else None)

# -----------------------------------------------------------
# 6. GELEN MESAJ İSTEKLERİ (boş olmalı)
# -----------------------------------------------------------
code, body = http("GET", "/api/message-requests/incoming", token=ali_token)
show("INCOMING REQUESTS (ali)", code, body)

# -----------------------------------------------------------
# 7. KABUL EDİLEN KİŞİLER (boş olmalı)
# -----------------------------------------------------------
code, body = http("GET", "/api/message-requests/accted-message", token=ali_token)
show("ACCEPTED CONTACTS (ali)", code, body)

# -----------------------------------------------------------
# 8. KONUŞMA GEÇMİŞİ (yok olmalı)
# -----------------------------------------------------------
# Diğer kullanıcı ID'sini bulmak için bilinen bir userId kullanırız
# (mevcut Ali'in ID'si = token'dan çıkarsak olur).
ali_user_id = (ali_login.get("data") or {}).get("userId")
print(f"Ali userId: {ali_user_id}")

if ali_user_id:
    code, body = http("GET", f"/api/messages/{ali_user_id}", token=ayse_token)
    show(f"GET CONVERSATION ayse<->ali", code, body)

# -----------------------------------------------------------
# 9. POST /api/messages (mesaj gönderme) — endpoint var mı?
# -----------------------------------------------------------
code, body = http("POST", "/api/messages",
                  body={"receviverId": 1, "messageType": "Text", "content": "test"},
                  token=ali_token)
show("POST /api/messages (mesaj gönderme)", code, body)

# -----------------------------------------------------------
# 10. PATCH /api/messages/{id}/read — endpoint var mı?
# -----------------------------------------------------------
code, body = http("PATCH", "/api/messages/1/read", token=ali_token)
show("PATCH /api/messages/1/read", code, body)

# -----------------------------------------------------------
# 11. DELETE /api/messages/{id} — endpoint var mı?
# -----------------------------------------------------------
code, body = http("DELETE", "/api/messages/1", token=ali_token)
show("DELETE /api/messages/1", code, body)

print("\n=== Tüm testler tamamlandı ===")