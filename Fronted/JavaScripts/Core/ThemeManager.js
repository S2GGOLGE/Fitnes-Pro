/**
 * FITNESS PRO - GLOBAL THEME MANAGER
 * Dark/Light tema geçişini tüm sayfalarda yönetir.
 * 
 * Özellikler:
 * 1. FOUC (Flash of Unstyled Content) önleme: <head> içinde anında çalışır.
 * 2. localStorage ("fitness_pro_theme") önbellek desteği.
 * 3. Sekmeler arası (cross-tab) anında senkronizasyon (storage event).
 * 4. Backend senkronizasyonu: Oturum açılmışsa GET /api/profile/theme ile eşitler.
 */
(function () {
    "use strict";

    const STORAGE_KEY = "fitness_pro_theme";
    const FALLBACK_KEY = "theme";

    // -------------------------------------------------------------------------
    // 1. Kayıtlı temayı oku (Öncelik: fitness_pro_theme -> theme -> 'dark')
    // -------------------------------------------------------------------------
    function getStoredTheme() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(FALLBACK_KEY);
            if (stored === "dark" || stored === "light") {
                return stored;
            }
        } catch (e) {
            // localStorage erişim engeli (örn: özel gezinti modu)
        }
        return "dark";
    }

    // -------------------------------------------------------------------------
    // 2. Temayı DOM'a uygula (<html data-theme="..."> ve body.light-theme)
    // -------------------------------------------------------------------------
    function applyThemeToDOM(theme) {
        const selected = (theme === "light") ? "light" : "dark";

        // <html> etiketine data-theme özniteliğini ekle
        if (document.documentElement) {
            document.documentElement.setAttribute("data-theme", selected);
        }

        // <body> etiketine light-theme sınıfını ekle / kaldır
        const syncBodyClass = function () {
            if (!document.body) return;
            if (selected === "light") {
                document.body.classList.add("light-theme");
            } else {
                document.body.classList.remove("light-theme");
            }
        };

        if (document.body) {
            syncBodyClass();
        } else {
            // Body henüz parse edilmemişse hazır olunca çalıştır
            if (document.readyState === "loading") {
                document.addEventListener("DOMContentLoaded", syncBodyClass, { once: true });
            } else {
                syncBodyClass();
            }
        }
    }

    // -------------------------------------------------------------------------
    // 3. Script yüklenir yüklenmez temayı uygula (Ekran render edilmeden önce)
    // -------------------------------------------------------------------------
    const activeTheme = getStoredTheme();
    applyThemeToDOM(activeTheme);

    // -------------------------------------------------------------------------
    // 4. Diğer sekmelerden gelen tema değişikliklerini dinle
    // -------------------------------------------------------------------------
    window.addEventListener("storage", function (event) {
        if (event.key === STORAGE_KEY || event.key === FALLBACK_KEY) {
            if (event.newValue === "dark" || event.newValue === "light") {
                applyThemeToDOM(event.newValue);
            }
        }
    });

    // -------------------------------------------------------------------------
    // 5. Backend ile arka planda senkronizasyon (Oturum açıksa)
    // -------------------------------------------------------------------------
    async function syncThemeWithBackend() {
        try {
            const Auth = window.Auth;
            if (!Auth || typeof Auth.getToken !== "function" || !Auth.getToken()) {
                return;
            }

            let remoteTheme = null;

            // Varsa ThemeAPI üzerinden al
            if (window.ThemeAPI && typeof window.ThemeAPI.getMyTheme === "function") {
                const res = await window.ThemeAPI.getMyTheme();
                if (res && res.success && res.thema) {
                    remoteTheme = res.thema;
                }
            } else if (typeof Auth.authFetch === "function") {
                // Yoksa doğrudan /api/profile/theme endpoint'ini sorgula
                const response = await Auth.authFetch("/api/profile/theme", {
                    method: "GET",
                    headers: { "Accept": "application/json" }
                });

                if (response && response.ok) {
                    const data = await response.json();
                    const payload = data && data.data;
                    let raw = null;
                    if (typeof payload === "string") {
                        raw = payload;
                    } else if (payload && typeof payload === "object") {
                        raw = payload.thema || payload.Theame || null;
                    }

                    if (typeof raw === "string") {
                        const normalized = raw.trim().toLowerCase();
                        if (normalized === "dark" || normalized === "light") {
                            remoteTheme = normalized;
                        }
                    }
                }
            }

            if (remoteTheme && (remoteTheme === "dark" || remoteTheme === "light")) {
                applyThemeToDOM(remoteTheme);
                try {
                    localStorage.setItem(STORAGE_KEY, remoteTheme);
                } catch (e) {}
            }
        } catch (error) {
            // Ağ hatası veya backend bağlantı kesintisinde kullanıcı deneyimini bozma
        }
    }

    // DOM hazır olunca backend senkronizasyonunu tetikle
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", syncThemeWithBackend, { once: true });
    } else {
        syncThemeWithBackend();
    }

    // -------------------------------------------------------------------------
    // 6. Global yardımcı API'yi dışa aktar
    // -------------------------------------------------------------------------
    window.ThemeManager = {
        getTheme: getStoredTheme,
        applyTheme: function (theme) {
            applyThemeToDOM(theme);
            try {
                localStorage.setItem(STORAGE_KEY, theme);
            } catch (e) {}
        },
        syncWithBackend: syncThemeWithBackend
    };
})();
