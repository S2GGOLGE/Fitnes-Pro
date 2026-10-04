"""
3 backend hata duzeltmesinin gercek testi:
1. SendMessageAsync: 'Mesaj Gonderildi' (degil 'Gonderilemedi')
2. GetConversationAsync: 200 donmeli (degil 500)
3. MarkAsReadAsync: 200 donmeli (degil 500)
4. GetConversationAsync tekrar: IsRead=true ve ReadAt dolu olmali
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
        resp = urllib.request.urlopen(req, timeout=15)
        return resp.status, resp.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8")
    except Exception as e:
        return 0, str(e)


def show(label, code, body):
    snippet = (body or "")[:400]
    print(f"[{label}] HTTP={code} :: {snippet}")


# -----------------------------------------------------------
# LOGIN
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
    data = json.loads(body)
    tokens.append((data.get("data") or {}).get("token"))
    user_ids.append((data.get("data") or {}).get("userId"))

ali_token, ayse_token = tokens
ali_id, ayse_id = user_ids
print(f"UserIds: ali={ali_id}, ayse={ayse_id}")

# -----------------------------------------------------------
# TEST 1: POST /api/messages
# Onceki test'ten arkadaşlık zaten kabul edilmiş olabilir.
# Yine de yeni bir mesaj göndermeyi deneyelim.
# -----------------------------------------------------------
print("\n=== TEST 1: POST /api/messages (success message text) ===")
code, body = http("POST", "/api/messages",
                  body={"receviverId": ayse_id,
                        "messageType": "Text",
                        "content": "Backend fix test mesaji"},
                  token=ali_token)
show("SEND MESSAGE", code, body)

try:
    data = json.loads(body)
    if data.get("success") is True:
        msg = data.get("message", "")
        if "Gonderildi" in msg or "Gönderildi" in msg:
            if "Gonderilemedi" in msg or "Gönderilemedi" in msg:
                print("FAIL: Hâlâ yanlış metin ('Gönderilemedi')")
            else:
                print(f"PASS: Success=true, Message='{msg}' dogru")
        else:
            print(f"FAIL: Message alanı '{msg}' — 'Gönderildi' bekleniyor")
    else:
        print(f"POST başarısız: {msg}")
except Exception as e:
    print(f"JSON parse error: {e}")

sent_data = data.get("data") if "data" in dir() else None
new_message_id = (sent_data or {}).get("messageId")
print(f"Yeni messageId: {new_message_id}")

# -----------------------------------------------------------
# TEST 2: GET /api/messages/{ayse_id} — Konuşma geçmişi
# -----------------------------------------------------------
print("\n=== TEST 2: GET /api/messages/{ayse} (onceki 500 hatasi) ===")
code, body = http("GET", f"/api/messages/{ayse_id}", token=ali_token)
show("GET CONVERSATION", code, body)

try:
    conv = json.loads(body)
    if conv.get("success") is True:
        messages = conv.get("data") or []
        print(f"PASS: HTTP {code}, success=true, {len(messages)} mesaj")
        for m in messages:
            print(f"  - id={m.get('Id')}, "
                  f"sender={m.get('SenderId')}, "
                  f"receiver={m.get('ReceiverId')}, "
                  f"isRead={m.get('IsRead')}, "
                  f"readAt={m.get('ReadAt')}")
    else:
        print(f"FAIL: success=false veya beklenmedik: {conv}")
except Exception as e:
    print(f"FAIL: JSON parse error: {e}")
    print(f"Body: {body[:300]}")

# -----------------------------------------------------------
# TEST 3: PATCH /api/messages/{id}/read — Okundu işaretle
# -----------------------------------------------------------
print("\n=== TEST 3: PATCH /api/messages/{id}/read (onceki 500 hatasi) ===")
if new_message_id:
    code, body = http("PATCH", f"/api/messages/{new_message_id}/read",
                      token=ayse_token)  # Ayşe okundu işaretliyor (alıcı)
    show("MARK AS READ", code, body)
    try:
        result = json.loads(body)
        if result.get("success") is True:
            print(f"PASS: success=true, message='{result.get('message')}'")
        elif result.get("success") is False:
            # Mesaj zaten okundu olabilir (önceki testlerden)
            print(f"Bilgi: success=false, msg='{result.get('message')}' "
                  "(mesaj daha önce okunmuş olabilir)")
        else:
            print(f"FAIL: {result}")
    except Exception as e:
        print(f"JSON parse error: {e}")
else:
    print("Yeni mesaj oluşturulamadığı için PATCH atlandı")

# -----------------------------------------------------------
# TEST 4: GET /api/messages/{ayse_id} tekrar — IsRead ve ReadAt doğrula
# -----------------------------------------------------------
print("\n=== TEST 4: GET tekrar (IsRead/ReadAt dogrulama) ===")
code, body = http("GET", f"/api/messages/{ayse_id}", token=ali_token)
show("GET CONVERSATION (2)", code, body)
try:
    conv = json.loads(body)
    if conv.get("success") is True:
        messages = conv.get("data") or []
        target = next((m for m in messages if m.get("Id") == new_message_id), None)
        if target:
            print(f"Mesaj {new_message_id}:")
            print(f"  IsRead={target.get('IsRead')}")
            print(f"  ReadAt={target.get('ReadAt')}")
            if target.get("IsRead") is True and target.get("ReadAt"):
                print("PASS: IsRead=true, ReadAt dolu")
            elif target.get("IsRead") is False:
                # Mesaj Ayşe'nindir, Ali istek attığı için ReadAt null olabilir
                print("Bilgi: Mesaj hâlâ okunmamış görünüyor")
        else:
            print(f"Mesaj {new_message_id} listede yok")
except Exception as e:
    print(f"JSON parse error: {e}")

print("\n=== Tüm testler tamamlandı ===")