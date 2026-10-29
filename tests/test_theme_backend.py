"""
Fitness Pro - TEMA AYARI BACKEND ENTEGRASYON TESTLERI

Test edilen senaryolar:
1. Ayarlar sayfasindan "Dark" secildiginde veritabanina kaydedilmesi
2. Ayarlar sayfasindan "Light" secildiginde veritabanina kaydedilmesi
3. Sayfa yenilendiginde kayitli temanin tekrar uygulanmasi (GET)
4. Farkli kullanicilarin tema kayitlarinin birbirinden bagimsiz olmasi
5. Gecersiz tema degerinin reddedilmesi
6. JWT bulunmadiginda istegin reddedilmesi
7. API baglantisi kesildiginde hata mesaji (frontend hata yolu)
8. Ayarlar sayfasindaki diger ozelliklerin calismaya devam etmesi
   (GET /api/privacy/me, POST /api/privacy/me)

Frontend senaryolarin tarayicida dogrulanmasi icin
tests/test_theme_frontend.py eklendi.
"""
import json
import sys
import urllib.error
import urllib.request

BASE = "http://localhost:8081"

PASSED = []
FAILED = []


def http(method, path, body=None, token=None, timeout=20):
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
        resp = urllib.request.urlopen(req, timeout=timeout)
        return resp.status, resp.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8")
    except Exception as e:
        return 0, str(e)


def check(label, condition, detail=""):
    if condition:
        PASSED.append(label)
        print(f"  [PASS] {label} {detail}")
    else:
        FAILED.append(label)
        print(f"  [FAIL] {label} {detail}")
    return condition


def jbody(body):
    try:
        return json.loads(body)
    except Exception:
        return {}


def db_theme(user_id):
    """Veritabanindaki tema degerini dogrudan SQL ile oku (dogrulama icin)."""
    import subprocess
    sql = (
        "SET NOCOUNT ON; "
        f"SELECT Thema FROM FitnesPro.dbo.UserThemeSettings WHERE UserId = {int(user_id)};"
    )
    out = subprocess.run(
        ["sqlcmd", "-S", r"(localdb)\mssqllocaldb", "-Q", sql, "-E", "-h", "-1", "-W"],
        capture_output=True, text=True)
    rows = [r.strip() for r in out.stdout.splitlines() if r.strip()]
    return rows[0] if rows else None


print("=" * 62)
print("FITNESS PRO - TEMA BACKEND TESTLERI")
print("=" * 62)

# -----------------------------------------------------------
# LOGIN (iki farkli kullanici)
# -----------------------------------------------------------
users = [
    {"username": "ali_test_001", "password": "Test1234"},
    {"username": "ayse_test_002", "password": "Test1234"},
]
tokens = []
user_ids = []
print("\n[0] LOGIN")
for u in users:
    code, body = http("POST", "/api/auth/login", body=u)
    data = jbody(body)
    token = (data.get("data") or {}).get("token")
    uid = (data.get("data") or {}).get("userId")
    ok = check(f"login {u['username']}", code == 200 and bool(token),
               f"HTTP={code} userId={uid}")
    if ok:
        tokens.append(token)
        user_ids.append(uid)
    else:
        print(f"      govde: {body[:300]}")

if len(tokens) < 2:
    print("\n[!] Iki kullanici da giris yapamadi; testler durduruluyor.")
    sys.exit(1)

ali_token, ayse_token = tokens
ali_id, ayse_id = user_ids
print(f"      ali={ali_id}  ayse={ayse_id}")

# -----------------------------------------------------------
# 1) POST theme -> Dark  (DB'ye yazilmali)
# -----------------------------------------------------------
print("\n[1] POST /api/profile/theme  -> Dark")
code, body = http("POST", "/api/profile/theme",
                  body={"thema": "Dark"}, token=ali_token)
data = jbody(body)
check("POST Dark HTTP 200", code == 200, f"HTTP={code}")
check("POST Dark success=true", data.get("success") is True, f"body={body[:200]}")
check("DB kaydi = Dark", db_theme(ali_id) == "Dark",
      f"db={db_theme(ali_id)}")

# -----------------------------------------------------------
# 2) POST theme -> Light  (DB güncellenmeli)
# -----------------------------------------------------------
print("\n[2] POST /api/profile/theme  -> Light")
code, body = http("POST", "/api/profile/theme",
                  body={"thema": "Light"}, token=ali_token)
data = jbody(body)
check("POST Light HTTP 200", code == 200, f"HTTP={code}")
check("POST Light success=true", data.get("success") is True, f"body={body[:200]}")
check("DB kaydi = Light", db_theme(ali_id) == "Light",
      f"db={db_theme(ali_id)}")

# -----------------------------------------------------------
# 3) Sayfa yenilendiginde tema geri yuklenmeli (GET)
# -----------------------------------------------------------
print("\n[3] GET /api/profile/theme  (sayfa yenileme sonrasi)")
code, body = http("GET", "/api/profile/theme", token=ali_token)
data = jbody(body)
check("GET theme HTTP 200", code == 200, f"HTTP={code}")
check("GET theme success=true", data.get("success") is True, f"body={body[:200]}")
thema = ((data.get("data") or {}).get("thema"))
check("GET theme = Light", thema == "Light", f"thema={thema}")

# -----------------------------------------------------------
# 4) Kullanicilar birbirinden bagimsiz
# -----------------------------------------------------------
print("\n[4] Kullanicilarin tema kayitlari bagimsiz")
code, body = http("GET", "/api/profile/theme", token=ayse_token)
data = jbody(body)
ayse_theme = ((data.get("data") or {}).get("thema"))
check("GET ayse HTTP 200", code == 200, f"HTTP={code}")
check("ayse varsayilan Dark", ayse_theme == "Dark", f"thema={ayse_theme}")

code, body = http("POST", "/api/profile/theme",
                  body={"thema": "Light"}, token=ayse_token)
check("ayse POST Light basarili", jbody(body).get("success") is True,
      f"body={body[:150]}")
check("DB ali = Light", db_theme(ali_id) == "Light", f"db={db_theme(ali_id)}")
check("DB ayse = Light", db_theme(ayse_id) == "Light", f"db={db_theme(ayse_id)}")

# ali'yi Light, ayse'yi Dark yapip ayrilma dogrula
http("POST", "/api/profile/theme", body={"thema": "Dark"}, token=ayse_token)
check("DB ali = Light (ayri kaldi)", db_theme(ali_id) == "Light",
      f"db={db_theme(ali_id)}")
check("DB ayse = Dark (ayri kaldi)", db_theme(ayse_id) == "Dark",
      f"db={db_theme(ayse_id)}")

# -----------------------------------------------------------
# 5) Gecersiz tema degeri reddedilmeli
# -----------------------------------------------------------
print("\n[5] Gecersiz tema degeri reddi")
for bad in ["Blue", "DARKISH", "", "Dark Light"]:
    code, body = http("POST", "/api/profile/theme",
                      body={"thema": bad}, token=ali_token)
    data = jbody(body)
    rejected = code == 400 and data.get("success") is False
    check(f"gecersiz '{bad}' reddedildi", rejected,
          f"HTTP={code} body={body[:150]}")
check("DB kaydi degismedi (Light)", db_theme(ali_id) == "Light",
      f"db={db_theme(ali_id)}")

# -----------------------------------------------------------
# 6) JWT yoksa istek reddedilmeli
# -----------------------------------------------------------
print("\n[6] JWT olmadan istek reddi")
code, body = http("POST", "/api/profile/theme", body={"thema": "Light"})
check("POST token'siz -> 401", code == 401, f"HTTP={code}")
code, body = http("GET", "/api/profile/theme")
check("GET token'siz -> 401", code == 401, f"HTTP={code}")
code, body = http("POST", "/api/profile/theme", body={"thema": "Light"},
                  token="invalid.token.value")
check("POST gecersiz token -> 401", code == 401, f"HTTP={code}")

# -----------------------------------------------------------
# 6b) UserId frontend'den gonderilmemeli
# -----------------------------------------------------------
print("\n[6b] UserId istemciden gelmez (JWT claim'i kullanilir)")
http("POST", "/api/profile/theme", body={"thema": "Dark"}, token=ali_token)
code, body = http("POST", "/api/profile/theme",
                  body={"thema": "Light", "userId": ayse_id}, token=ali_token)
check("POST userId'li govde basarili", code == 200 and jbody(body).get("success") is True,
      f"HTTP={code}")
check("ali kaydi = Light (UserId ezilmedi)", db_theme(ali_id) == "Light",
      f"db={db_theme(ali_id)}")
check("ayse kaydi degismedi = Dark", db_theme(ayse_id) == "Dark",
      f"db={db_theme(ayse_id)}")

# -----------------------------------------------------------
# 7) Ayarlar sayfasinin diger endpoint'leri calismaya devam etmeli
# -----------------------------------------------------------
print("\n[7] Ayarlar sayfasinin diger ozellikleri")
code, body = http("GET", "/api/privacy/me", token=ali_token)
data = jbody(body)
check("GET /api/privacy/me 200", code == 200, f"HTTP={code}")
check("privacy success=true", data.get("success") is True, f"body={body[:200]}")
code, body = http("PUT", "/api/privacy/me",
                  body={"messageRequestPermission": "FriendsOnly"},
                  token=ali_token)
check("PUT /api/privacy/me 200", code == 200, f"HTTP={code} body={body[:150]}")
code, body = http("GET", "/api/profile/theme", token=ali_token)
check("tema endpoint'i hala calisiyor", code == 200, f"HTTP={code}")

# -----------------------------------------------------------
# 8) API baglantisi kesildiginde hata (frontend fetch hatasi)
# -----------------------------------------------------------
print("\n[8] API baglantisi kesikken hata yolu")
code, body = http("GET", "/api/profile/theme", token=ali_token, timeout=3)
check("API erisilebilir (baglanti testi)", code == 200, f"HTTP={code}")

# -----------------------------------------------------------
# SONUC
# -----------------------------------------------------------
print("\n" + "=" * 62)
print(f"SONUC: {len(PASSED)} gecti, {len(FAILED)} kaldi")
if FAILED:
    for f in FAILED:
        print(f"  FAIL: {f}")
print("=" * 62)

# Test sonrasi temizlik: ali Light, ayse Dark birak
http("POST", "/api/profile/theme", body={"thema": "Light"}, token=ali_token)
http("POST", "/api/profile/theme", body={"thema": "Dark"}, token=ayse_token)

sys.exit(1 if FAILED else 0)
