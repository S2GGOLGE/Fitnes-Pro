// =========================================================
// FITNESS PRO - PROFILE ENDPOINT INTEGRATION
// =========================================================
//
// Backend endpoints:
// - POST /api/profile/email
//   Body: { email: string }
//   Response: ApiResponseModel { success: boolean, message: string }
//
// - GET  /api/profile/biography
//   Response: ApiResponseModel { success: boolean, message: string, data: string }
//
// - POST /api/profile/biography
//   Body: { Context: string }
//   Response: ApiResponseModel { success: boolean, message: string }
//
// - GET  /api/profile/theme
// - POST /api/profile/theme
//
// NOT: Kullanıcı kimliği (UserId) frontend'den gönderilmez,
//      JWT claim'inden backend tarafında alınır.
// =========================================================

(function () {
    "use strict";

    const Auth = window.Auth;

    async function parseJson(response) {
        try {
            return await response.json();
        } catch (err) {
            console.error("[ProfileEndpoint] JSON parse hatasi:", err);
            return null;
        }
    }

    function normalize(result, response) {
        const payload = result || {};
        const success = (response ? response.ok : true) && (payload.success === true || payload.Success === true);
        const message =
            (typeof payload.message === "string" && payload.message.trim()) ||
            (typeof payload.Message === "string" && payload.Message.trim()) ||
            (success ? "İşlem başarılı." : "İşlem sırasında bir hata oluştu.");

        return {
            ok: response ? response.ok : success,
            success,
            message,
            data: payload.data ?? payload.Data ?? null
        };
    }

    async function request(method, path, body = null) {
        if (!window.Auth || typeof window.Auth.authFetch !== "function") {
            return {
                ok: false,
                success: false,
                message: "Oturum bilgisi bulunamadı. Lütfen tekrar giriş yapınız.",
                data: null
            };
        }

        const options = {
            method: method.toUpperCase(),
            headers: {
                "Accept": "application/json"
            }
        };

        if (body !== null && method.toUpperCase() !== "GET") {
            options.headers["Content-Type"] = "application/json";
            options.body = JSON.stringify(body);
        }

        try {
            const response = await window.Auth.authFetch(path, options);
            const parsed = await parseJson(response);
            return normalize(parsed, response);
        } catch (err) {
            console.error(`[ProfileEndpoint] ${method} ${path} ağ hatası:`, err);
            return {
                ok: false,
                success: false,
                message: "Sunucuya bağlanılamadı. Lütfen backend servisinin çalıştığından emin olunuz.",
                data: null
            };
        }
    }

    const ProfileEndpoint = {
        /**
         * E-posta adresini günceller.
         * POST /api/profile/email
         * @param {string} email
         * @returns {Promise<{ ok: boolean, success: boolean, message: string }>}
         */
        async updateEmail(email) {
            const trimmed = typeof email === "string" ? email.trim() : "";
            if (!trimmed) {
                return {
                    ok: false,
                    success: false,
                    message: "E-posta adresi boş bırakılamaz."
                };
            }

            return await request("POST", "/api/profile/email", {
                email: trimmed,
                Email: trimmed
            });
        },

        /**
         * Biyografiyi getirir.
         * GET /api/profile/biography
         * @returns {Promise<{ ok: boolean, success: boolean, message: string, data: any }>}
         */
        async getBiography() {
            return await request("GET", "/api/profile/biography");
        },

        /**
         * Biyografiyi günceller.
         * POST /api/profile/biography
         * @param {string} bio
         * @returns {Promise<{ ok: boolean, success: boolean, message: string }>}
         */
        async saveBiography(bio) {
            return await request("POST", "/api/profile/biography", {
                Context: typeof bio === "string" ? bio : ""
            });
        }
    };

    window.ProfileEndpoint = ProfileEndpoint;
})();
