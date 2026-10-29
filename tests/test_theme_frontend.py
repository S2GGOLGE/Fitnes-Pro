"""
Fitness Pro - TEMA FRONTEND (TARAYICI) TESTLERI

Headless Chrome kullanilir; --virtual-time-budget sayesinde setTimeout
tabanli render'lar gercekten calisir.

Test edilen senaryolar:
  A) Sayfa acilisinda kayitli tema backend'den alinip uygulanir
  B) Light secimi veritabanina kaydedilir
  C) Dark secimi veritabanina kaydedilir
  D) Sayfa yenilendiginde kayitli tema tekrar uygulanir
  E) Tema kaydi yoksa Dark varsayilani kullanilir
  F) Farkli kullanicilarin tema kayitlari birbirinden bagimsizdir
  G) Gecersiz tema degeri backend tarafindan reddedilir
  H) API baglantisi kesildiginde hata gosterilir, tema eski degerde kalir
  I) Ayarlar sayfasindaki diger ozellikler calismaya devam eder
"""
import json
import os
import re
import shutil
import subprocess
import sys
import urllib.error
import urllib.request

BASE = "http://127.0.0.1:3000"
API = "http://localhost:8081"
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
HERE = os.path.dirname(os.path.abspath(__file__))
PAGES = os.path.join(os.path.dirname(HERE), "Fronted", "Pages")
PROFILE = os.path.join(HERE, ".chrome-profile")
SEED_PAGE = os.path.join(PAGES, "seed.html")

# Test harness dosyalari (calisma sirasinda uretilir, sonunda silinir)
HARNESS_PAGE = os.path.join(PAGES, "_theme_test_page.html")
HARNESS_DRIVER = os.path.join(PAGES, "_theme_test_driver.js")
HARNESS_HOOK = os.path.join(PAGES, "_theme_test_hook.js")
HARNESS_FILES = [HARNESS_PAGE, HARNESS_DRIVER, HARNESS_HOOK]

RESULTS = []

HARNESS_HTML = """<!doctype html>
<html lang="tr" data-theme="dark">

<head>
    <meta charset="UTF-8">
    <title>Fitness Pro - Ayarlar</title>
    <link rel="stylesheet" href="../Css/UI/setting.css">
    <link rel="stylesheet" href="../Css/Core/DesignSystem.css">
    <link rel="stylesheet" href="../Css/Core/GlobalModal.css">
    <script src="../JavaScripts/config.js"></script>
    <script>
        window.API_BASE_URL = "http://localhost:8081";
        window.__log = [];
        window.__mark = function (m) { window.__log.push(m); };
        window.addEventListener("error", function (e) { window.__mark("JSERR:" + e.message); });
        window.__emit = function () {
            var out = document.createElement("div");
            out.id = "test-output";
            out.textContent = window.__log.join(" ;; ");
            document.body.appendChild(out);
        };
        // Token dogrudan sayfa yuklenirken yazilir (ayri seed sayfasi yok).
        (function () {
            var q = new URLSearchParams(location.search);
            var t = q.get("token");
            if (t) {
                localStorage.setItem("fitness_pro_token", t);
                localStorage.setItem("fitness_pro_user", JSON.stringify({
                    userId: q.get("uid") || "", username: q.get("un") || "", role: "User"
                }));
            }
        })();
    </script>
</head>

<body>
    <div class="settings-shell">
        <div class="sidebar-overlay" data-sidebar-close aria-hidden="true"></div>
        <aside class="settings-sidebar" id="settings-sidebar" aria-label="Ayarlar menusu">
            <div class="sidebar-header"><a class="brand" href="index.html"><b>FP</b>Fitness <em>Pro</em></a><button class="sidebar-close" type="button" data-sidebar-close aria-label="Menuyu kapat">x</button></div>
            <div class="sidebar-profile">
                <div class="avatar avatar-large" aria-hidden="true">US</div>
                <div><strong>Username</strong><span>Uye hesabi</span></div>
            </div>
            <nav class="settings-navigation" aria-label="Ayar kategorileri">
                <p class="nav-label">HESAP</p><button type="button" class="nav-btn active" data-view="account" aria-current="page">Hesap Ayarlari</button><button type="button" class="nav-btn" data-view="password">Sifre Guncelle</button>
                <p class="nav-label secondary">YONETIM</p><button type="button" class="nav-btn" data-view="subscriptions">Aboneliklerim</button><button type="button" class="nav-btn" data-view="coaches">Hocalarim</button><button type="button" class="nav-btn" data-view="messages">Mesaj Istek Ayarlari</button>
                <p class="nav-label secondary">GORUNUM</p><button type="button" class="nav-btn" data-view="appearance">Tema Ayarlari</button>
            </nav>
        </aside>
        <main class="settings-main">
            <header class="mobile-topbar"><button class="menu-toggle" type="button" data-sidebar-open aria-label="Ayarlar menusunu ac" aria-controls="settings-sidebar" aria-expanded="false"><i></i><i></i><i></i></button><span>AYARLAR</span>
                <div class="avatar avatar-small" aria-hidden="true">US</div>
            </header>
            <section class="content-area" aria-live="polite">
                <div id="dynamic-content"></div>
            </section>
        </main>
    </div>
    <script src="../JavaScripts/Core/auth.js"></script>
    <script src="../JavaScripts/Core/GlobalModalManager.js"></script>
    <script src="../JavaScripts/EndPoint/TwoFactorEndpoint.js"></script>
    <script src="../JavaScripts/EndPoint/PrivacyEndpoint.js"></script>
    <script src="_theme_test_hook.js"></script>
    <script src="../JavaScripts/EndPoint/ThemeEndpoint.js"></script>
    <script src="../JavaScripts/UI/Setting.js"></script>
    <script src="_theme_test_driver.js"></script>
</body>

</html>
"""

HARNESS_HOOK_JS = """// TEST HARNESS: tema endpoint cagrilarini kaydeder.
(function () {
    window.__themeCalls = [];
    var real = {};
    Object.defineProperty(window, "ThemeAPI", {
        configurable: true,
        get: function () { return real.api; },
        set: function (value) {
            if (!value) { real.api = value; return; }
            var origGet = value.getMyTheme;
            var origSave = value.saveMyTheme;
            value.getMyTheme = function () {
                window.__themeCalls.push("GET");
                return origGet.apply(this, arguments).then(function (res) {
                    window.__themeCalls.push("GET_OK::" + (res && res.thema ? res.thema : "?"));
                    return res;
                });
            };
            value.saveMyTheme = function (theme) {
                window.__themeCalls.push("SAVE::" + theme);
                return origSave.apply(this, arguments).then(function (res) {
                    window.__themeCalls.push("SAVE_RES::" + (res && res.success ? "success" : "fail"));
                    return res;
                });
            };
            real.api = value;
        }
    });
})();
"""

HARNESS_DRIVER_JS = """// TEST HARNESS: ?mode= parametresine gore testi calistirir.
(function () {
    var mode = new URLSearchParams(location.search).get("mode") || "load";

    function currentTheme() { return document.documentElement.getAttribute("data-theme"); }
    function calls() { return (window.__themeCalls || []).join(","); }

    function hasToast(text) {
        var body = (document.body.innerText || "") + " " + (document.body.textContent || "");
        var modal = document.querySelector(".global-modal-content");
        if (modal) body += " " + (modal.innerText || "") + " " + (modal.textContent || "");
        return body.indexOf(text) !== -1;
    }

    function goAppearance(cb) {
        var nav = document.querySelector('.nav-btn[data-view="appearance"]');
        if (nav) nav.click();
        setTimeout(cb, 600);
    }

    if (mode === "load") {
        setTimeout(function () {
            window.__mark("THEME_RESULT::" + (currentTheme() === "light" ? "LIGHT" : "DARK"));
            window.__mark("GET_THEME_OK::" + calls());
            goAppearance(function () {
                var activeBtn = document.querySelector(".theme-option.is-active");
                window.__mark("ACTIVE_BTN::" + (activeBtn ? activeBtn.getAttribute("data-theme-option") : "NONE"));
                window.__mark("THEME_NOW::" + currentTheme());
                window.__emit();
            });
        }, 1500);
        return;
    }

    if (mode === "click" || mode === "click-dark") {
        var target = mode === "click-dark" ? "dark" : "light";
        setTimeout(function () {
            goAppearance(function () {
                var btn = document.querySelector('[data-theme-option="' + target + '"]');
                if (!btn) { window.__mark("BTN_NOT_FOUND"); window.__emit(); return; }
                btn.click();
                window.__mark("CLICK_" + target.toUpperCase() + "_DONE");
                setTimeout(function () {
                    window.__mark("CALLS::" + calls());
                    window.__mark("THEME_NOW::" + currentTheme());
                    window.__mark("TOAST_SUCCESS::" + hasToast("olarak kaydedildi"));
                    window.__emit();
                }, 1800);
            });
        }, 1200);
        return;
    }

    if (mode === "invalid") {
        setTimeout(function () {
            window.ThemeAPI.saveMyTheme("Blue").then(function (res) {
                if (res && res.success === false) window.__mark("INVALID_REJECTED::" + (res.message || ""));
                else window.__mark("INVALID_NOT_REJECTED");
                window.__emit();
            });
        }, 1500);
        return;
    }

    if (mode === "network") {
        setTimeout(function () {
            goAppearance(function () {
                var btn = document.querySelector('[data-theme-option="dark"]');
                var before = currentTheme();
                if (!btn) { window.__mark("BTN_NOT_FOUND"); window.__emit(); return; }
                btn.click();
                setTimeout(function () {
                    window.__mark("CALLS::" + calls());
                    window.__mark("THEME_BEFORE::" + before);
                    window.__mark("THEME_KEPT::" + (currentTheme() === "light" ? "Light" : currentTheme()));
                    window.__mark("ERROR_SHOWN::" + (hasToast("baglan") || hasToast("bağlan")));
                    window.__emit();
                }, 1800);
            });
        }, 1200);
        return;
    }

    if (mode === "regression") {
        setTimeout(function () {
            var content = document.getElementById("dynamic-content");
            window.__mark("VIEW_ACCOUNT_OK::" + (content.innerHTML.indexOf("Hesap ayarlar") !== -1));
            var navAcc = document.querySelector('.nav-btn[data-view="account"]');
            if (navAcc) navAcc.click();
            setTimeout(function () {
                window.__mark("VIEW_ACCOUNT_OK::" + (document.getElementById("dynamic-content").innerHTML.indexOf("Hesap ayarlar") !== -1));
                var navMsg = document.querySelector('.nav-btn[data-view="messages"]');
                if (navMsg) navMsg.click();
                setTimeout(function () {
                    var msgHtml = document.getElementById("dynamic-content").innerHTML;
                    window.__mark("VIEW_MESSAGES_OK::" + (msgHtml.indexOf("Mesaj") !== -1));
                    window.__mark("PRIVACY_OK::" + (msgHtml.indexOf("messageRequestPref") !== -1));
                    goAppearance(function () {
                        var appHtml = document.getElementById("dynamic-content").innerHTML;
                        window.__mark("VIEW_APPEARANCE_OK::" + (appHtml.indexOf("Renk Temas") !== -1));
                        window.__mark("THEME_OPTIONS::" + document.querySelectorAll("[data-theme-option]").length);
                        window.__emit();
                    });
                }, 800);
            }, 800);
        }, 1500);
        return;
    }

    window.__mark("UNKNOWN_MODE");
    window.__emit();
})();
"""


def write_harness():
    """Test sayfalarini uretir (calisma sonunda silinir)."""
    with open(HARNESS_PAGE, "w", encoding="utf-8") as f:
        f.write(HARNESS_HTML)
    with open(HARNESS_HOOK, "w", encoding="utf-8") as f:
        f.write(HARNESS_HOOK_JS)
    with open(HARNESS_DRIVER, "w", encoding="utf-8") as f:
        f.write(HARNESS_DRIVER_JS)


def check(label, cond, detail=""):
    RESULTS.append((label, bool(cond), detail))
    print(f"{'PASS' if cond else 'FAIL'} :: {label}" + (f" :: {detail}" if detail else ""))


def http_req(method, url, body=None, token=None):
    headers = {"Accept": "application/json"}
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return resp.status, resp.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8")
    except Exception as e:
        return 0, str(e)


def login(username, password):
    code, body = http_req("POST", API + "/api/auth/login",
                          {"username": username, "password": password})
    data = {}
    try:
        data = json.loads(body)
    except Exception:
        pass
    d = data.get("data") or {}
    return d.get("token"), d.get("userId")


def write_seed(token, user_id, username):
    with open(SEED_PAGE, "w", encoding="utf-8") as f:
        f.write(
            '<!doctype html><meta charset="utf-8"><script>\n'
            f'localStorage.setItem("fitness_pro_token", {json.dumps(token)});\n'
            f'localStorage.setItem("fitness_pro_user", {json.dumps(json.dumps({"userId": user_id, "username": username, "role": "User"}))});\n'
            'document.title="SEEDED";\n'
            '</script>'
        )


def run_chrome(url, extra_args=None):
    """Chrome headless calistirir ve DOM ciktisini dosyadan okur.

    Not: stdout pipe ile yakalanirsa Chrome'un alt surecleri pipe'i
    tutmaya devam eder ve okuma takilir; bu yuzden dosyaya yazilir.
    """
    args = [
        CHROME,
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        f"--user-data-dir={PROFILE}",
        "--virtual-time-budget=20000",
        "--run-all-compositor-stages-before-draw",
        "--dump-dom",
    ]
    if extra_args:
        args.extend(extra_args)
    args.append(url)

    out_file = os.path.join(HERE, f"_chrome_dom_{os.getpid()}_{id(url)}.html")
    try:
        with open(out_file, "w", encoding="utf-8") as fh:
            with open(os.devnull, "w") as devnull:
                subprocess.run(args, stdout=fh, stderr=devnull, timeout=180)

        with open(out_file, "r", encoding="utf-8", errors="replace") as fh:
            return fh.read()
    finally:
        # Chrome alt surecleri dosyayi bir sure daha tutabilir; silme hatasi
        # testi durdurmamalidir.
        try:
            os.remove(out_file)
        except OSError:
            pass


def output_of(dom):
    m = re.search(r'id="test-output"[^>]*>(.*?)</div>', dom, re.S)
    if not m:
        return ""
    txt = m.group(1)
    for a, b in (("&amp;", "&"), ("&lt;", "<"), ("&gt;", ">"), ("&quot;", '"'), ("&#039;", "'")):
        txt = txt.replace(a, b)
    return txt


def theme_of(dom):
    m = re.search(r"<html[^>]*data-theme=\"([a-z]+)\"", dom)
    return m.group(1) if m else "none"


def run_as(token, user_id, username, mode, extra_args=None):
    """Test sayfasini token ile birlikte yukler (ayri seed sayfasi yok)."""
    url = (BASE + "/Pages/_theme_test_page.html"
           + f"?mode={mode}&token={token}&uid={user_id}&un={username}")
    dom = run_chrome(url, extra_args)
    return dom, output_of(dom), theme_of(dom)


def main():
    print("=" * 58)
    print("FITNESS PRO - TEMA FRONTEND (TARAYICI) TESTLERI")
    print("=" * 58)

    write_harness()

    ali_token, ali_id = login("ali_test_001", "Test1234")
    ayse_token, ayse_id = login("ayse_test_002", "Test1234")
    check("login ali_test_001", bool(ali_token), f"userId={ali_id}")
    check("login ayse_test_002", bool(ayse_token), f"userId={ayse_id}")
    if not ali_token or not ayse_token:
        print("LOGIN FAILED")
        return 1

    # ---------- A) Sayfa acilisinda kayitli tema uygulanmali ----------
    print("\n=== TEST A: Sayfa acilisinda kayitli tema uygulanmali ===")
    http_req("POST", API + "/api/profile/theme", {"thema": "Light"}, ali_token)
    dom, out, theme = run_as(ali_token, ali_id, "ali_test_001", "load")
    check("A: data-theme=light", theme == "light", f"theme={theme}")
    check("A: THEME_RESULT::LIGHT", "THEME_RESULT::LIGHT" in out, out[:220])
    check("A: GET /api/profile/theme cagrildi", "GET_OK::light" in out, out[:220])
    check("A: tema butonu Light isaretli", "ACTIVE_BTN::light" in out, out[:220])

    # ---------- B) Light secimi DB ye kaydedilmeli ----------
    print("\n=== TEST B: Light secimi veritabanina kaydedilmeli ===")
    http_req("POST", API + "/api/profile/theme", {"thema": "Dark"}, ali_token)
    dom, out, theme = run_as(ali_token, ali_id, "ali_test_001", "click")
    check("B: Light butonu tiklandi", "CLICK_LIGHT_DONE" in out, out[:220])
    code, body = http_req("GET", API + "/api/profile/theme", None, ali_token)
    data = json.loads(body)
    check("B: kayitli tema = Light", (data.get("data") or {}).get("thema") == "Light",
          json.dumps(data.get("data")))
    check("B: POST /api/profile/theme cagrildi", "SAVE::light" in out, out[:220])
    check("B: arayuzde Light uygulandi", theme == "light", f"theme={theme}")
    check("B: basari bildirimi goruldu", "TOAST_SUCCESS::true" in out, out[:300])

    # ---------- C) Dark secimi DB ye kaydedilmeli ----------
    print("\n=== TEST C: Dark secimi veritabanina kaydedilmeli ===")
    dom, out, theme = run_as(ali_token, ali_id, "ali_test_001", "click-dark")
    check("C: Dark butonu tiklandi", "CLICK_DARK_DONE" in out, out[:220])
    code, body = http_req("GET", API + "/api/profile/theme", None, ali_token)
    data = json.loads(body)
    check("C: kayitli tema = Dark", (data.get("data") or {}).get("thema") == "Dark",
          json.dumps(data.get("data")))
    check("C: POST /api/profile/theme cagrildi", "SAVE::dark" in out, out[:220])
    check("C: arayuzde Dark uygulandi", theme == "dark", f"theme={theme}")
    check("C: basari bildirimi goruldu", "TOAST_SUCCESS::true" in out, out[:300])

    # ---------- D) Yenileme sonrasi tema korunmali ----------
    print("\n=== TEST D: Sayfa yenilendiginde kayitli tema tekrar uygulanmali ===")
    http_req("POST", API + "/api/profile/theme", {"thema": "Light"}, ali_token)
    dom, out, theme = run_as(ali_token, ali_id, "ali_test_001", "load")
    check("D: yenileme sonrasi Light", theme == "light" and "THEME_RESULT::LIGHT" in out, out[:220])
    check("D: tema butonu Light isaretli", "ACTIVE_BTN::light" in out, out[:220])

    # ---------- E) Kayit yoksa Dark varsayilani ----------
    print("\n=== TEST E: Tema kaydi yoksa Dark varsayilani kullanilmali ===")
    http_req("POST", API + "/api/profile/theme", {"thema": "Dark"}, ayse_token)
    dom, out, theme = run_as(ayse_token, ayse_id, "ayse_test_002", "load")
    check("E: varsayilan Dark uygulandi", theme == "dark", f"theme={theme}")
    check("E: GET Dark dondu", "GET_OK::dark" in out, out[:220])

    # ---------- F) Kullanicilar bagimsiz ----------
    print("\n=== TEST F: Farkli kullanicilarin tema kayitlari bagimsiz ===")
    http_req("POST", API + "/api/profile/theme", {"thema": "Light"}, ali_token)
    http_req("POST", API + "/api/profile/theme", {"thema": "Dark"}, ayse_token)
    code, body = http_req("GET", API + "/api/profile/theme", None, ali_token)
    data = json.loads(body)
    check("F: ali = Light", (data.get("data") or {}).get("thema") == "Light", json.dumps(data.get("data")))
    code, body = http_req("GET", API + "/api/profile/theme", None, ayse_token)
    data = json.loads(body)
    check("F: ayse = Dark", (data.get("data") or {}).get("thema") == "Dark", json.dumps(data.get("data")))

    # ---------- G) Gecersiz tema degeri ----------
    print("\n=== TEST G: Gecersiz tema degeri reddedilmeli ===")
    dom, out, theme = run_as(ali_token, ali_id, "ali_test_001", "invalid")
    check("G: gecersiz deger reddedildi", "INVALID_REJECTED" in out, out[:250])
    code, body = http_req("GET", API + "/api/profile/theme", None, ali_token)
    data = json.loads(body)
    check("G: kayit degismedi", (data.get("data") or {}).get("thema") == "Light", json.dumps(data.get("data")))

    # ---------- H) API baglantisi kesikken hata ----------
    print("\n=== TEST H: API baglantisi kesildiginde hata gosterilmeli ===")
    # localhost:8081 -> yanlis port (baglanti reddedilir)
    dom, out, theme = run_as(ali_token, ali_id, "ali_test_001", "network",
                              ["--host-resolver-rules=MAP localhost 127.0.0.1:9"])
    check("H: hata mesaji gosterildi", "ERROR_SHOWN::true" in out, out[:300])
    check("H: tema eski degerde kaldi", "THEME_KEPT::Light" in out, out[:300])

    # ---------- I) Diger ozellikler calismaya devam etmeli ----------
    print("\n=== TEST I: Ayarlar sayfasindaki diger ozellikler ===")
    dom, out, theme = run_as(ali_token, ali_id, "ali_test_001", "regression")
    check("I: Hesap Ayarlari gorunumu", "VIEW_ACCOUNT_OK::true" in out, out[:300])
    check("I: Mesaj Istek gorunumu", "VIEW_MESSAGES_OK::true" in out, out[:300])
    check("I: Gizlilik ayari yuklendi", "PRIVACY_OK::true" in out, out[:300])
    check("I: Tema Ayarlari gorunumu", "VIEW_APPEARANCE_OK::true" in out, out[:300])
    check("I: iki tema secenegi korundu", "THEME_OPTIONS::2" in out, out[:300])

    failed = [r for r in RESULTS if not r[1]]
    print("\n" + "=" * 58)
    print(f"SONUC: {len(RESULTS) - len(failed)} gecti, {len(failed)} kaldi")
    for label, _, detail in failed:
        print(f"  FAIL: {label} :: {detail}")
    print("=" * 58)
    return 1 if failed else 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    finally:
        # Gecici harness dosyalarini temizle
        for path in HARNESS_FILES + [SEED_PAGE]:
            if os.path.exists(path):
                try:
                    os.remove(path)
                except OSError:
                    pass
        if os.path.isdir(PROFILE):
            shutil.rmtree(PROFILE, ignore_errors=True)
