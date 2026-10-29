// =========================================================
// FITNESS PRO - THEME ENDPOINT INTEGRATION
// =========================================================
//
// Backend response yapısı (ApiResponseModel):
// {
//   success: boolean,
//   message: string,
//   data:    { thema: "Dark" | "Light" } | null
// }
//
// Backend kabul ettiği değerler: "Dark", "Light"
//
// NOT: Kullanıcı kimliği (UserId) frontend'den GÖNDERİLMEZ.
//      Kimlik JWT claim'inden backend tarafında alınır.
// =========================================================

(function () {
    "use strict";

    const Auth = window.Auth;

    if (!Auth || typeof Auth.authFetch !== "function") {
        console.error(
            "[ThemeEndpoint] window.Auth bulunamadi. auth.js yuklendiginden emin olun."
        );
        return;
    }

    const API_VALUES = ["Dark", "Light"];

    // ---------------------------------------------------------
    // YARDIMCI: UI değerini API değerine çevir
    // UI  : "dark" | "light"
    // API : "Dark" | "Light"
    // ---------------------------------------------------------
    function toApiValue(value) {
        if (typeof value !== "string") {
            return null;
        }

        const normalized = value.trim().toLowerCase();

        if (normalized === "dark") {
            return "Dark";
        }

        if (normalized === "light") {
            return "Light";
        }

        return null;
    }

    // ---------------------------------------------------------
    // YARDIMCI: API değerini UI değerine çevir
    // ---------------------------------------------------------
    function toUiValue(value) {
        if (typeof value !== "string") {
            return null;
        }

        const normalized = value.trim().toLowerCase();

        if (normalized === "dark" || normalized === "light") {
            return normalized;
        }

        return null;
    }

    // ---------------------------------------------------------
    // YARDIMCI: response'u normalize et
    // ---------------------------------------------------------
    async function parseJson(response) {
        try {
            return await response.json();
        } catch (err) {
            console.error("[ThemeEndpoint] JSON parse hatasi:", err);
            return null;
        }
    }

    function normalize(result, response) {
        const payload = result || {};

        const success = payload.success === true;
        const unauthorized = response && response.status === 401;

        const message =
            (typeof payload.message === "string" && payload.message.trim()) ||
            (success
                ? "Islem basarili."
                : "Islem sirasinda bir hata olustu.");

        const data = payload.data !== undefined ? payload.data : null;

        // data: { thema: "Dark" } veya doğrudan string olabilir
        let thema = null;
        if (typeof data === "string") {
            thema = data;
        } else if (data && typeof data === "object") {
            thema = data.thema || data.Theame || null;
        }

        return {
            ok: response ? response.ok : success,
            success,
            message,
            data: data,
            thema: toUiValue(thema),
            unauthorized
        };
    }

    // ---------------------------------------------------------
    // YARDIMCI: HTTP metodu ortak isleyici
    // ---------------------------------------------------------
    async function request(method, path, body) {
        // Token yoksa istek hiç gönderilmez: backend 401 döneceği için
        // sayfadaki diğer işlevler bozulmaz.
        const token = typeof Auth.getToken === "function" ? Auth.getToken() : null;

        if (!token) {
            return {
                ok: false,
                success: false,
                message: "Oturum bulunamadi. Lutfen tekrar giris yapin.",
                data: null,
                thema: null,
                unauthorized: true
            };
        }

        let response;
        try {
            const options = {
                method: method,
                headers: {
                    Accept: "application/json"
                }
            };

            if (body !== undefined && body !== null) {
                options.headers["Content-Type"] = "application/json";
                options.body = JSON.stringify(body);
            }

            response = await Auth.authFetch(path, options);
        } catch (error) {
            console.error("[ThemeEndpoint] Network hatasi:", error);
            return {
                ok: false,
                success: false,
                message:
                    "Sunucuya baglanilamadi. Lutfen backend servisinin calistigindan emin olunuz.",
                data: null,
                thema: null,
                unauthorized: false,
                networkError: true
            };
        }

        const result = await parseJson(response);
        return normalize(result, response);
    }

    // ---------------------------------------------------------
    // ENDPOINTS
    // ---------------------------------------------------------

    /**
     * Oturum açmış kullanıcının kayıtlı temasını getir.
     * GET /api/profile/theme
     * Kayıt yoksa backend "Dark" varsayılanını döner.
     */
    async function getMyTheme() {
        return await request("GET", "/api/profile/theme");
    }

    /**
     * Oturum açmış kullanıcının temasını güncelle.
     * POST /api/profile/theme
     * body: { thema: "Dark" | "Light" }
     */
    async function saveMyTheme(theme) {
        const apiValue = toApiValue(theme);

        if (!apiValue) {
            return {
                ok: false,
                success: false,
                message: "Gecersiz tema degeri.",
                data: null,
                thema: null,
                unauthorized: false
            };
        }

        return await request("POST", "/api/profile/theme", {
            thema: apiValue
        });
    }

    // ---------------------------------------------------------
    // GLOBAL EXPORT
    // ---------------------------------------------------------
    window.ThemeAPI = {
        getMyTheme: getMyTheme,
        saveMyTheme: saveMyTheme,
        toApiValue: toApiValue,
        toUiValue: toUiValue,
        API_VALUES: API_VALUES
    };
})();
