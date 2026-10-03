// =========================================================
// FITNESS PRO - PRIVACY ENDPOINT INTEGRATION
// =========================================================
//
// Backend response yapısı (ApiResponseModel):
// {
//   success:          boolean,
//   message:          string,
//   data:             { userId, messageRequestPermission, updatedAt } | null,
//   rateLimited:      boolean,
//   remainingSeconds: number | null,
//   accountLocked:    boolean
// }
//
// Backend kabul ettiği değerler: "Everyone", "FriendsOnly", "Nobody"
// =========================================================

(function () {
    "use strict";

    const Auth = window.Auth;

    if (!Auth || typeof Auth.authFetch !== "function") {
        console.error(
            "[PrivacyEndpoint] window.Auth bulunamadi. auth.js yuklendiginden emin olun."
        );
        return;
    }

    // ---------------------------------------------------------
    // YARDIMCI: response'u normalize et
    // ---------------------------------------------------------

    async function parseJson(response) {
        try {
            return await response.json();
        } catch (err) {
            console.error(
                "[PrivacyEndpoint] JSON parse hatasi:",
                err
            );
            return null;
        }
    }

    function normalize(result, response) {
        const payload = result || {};

        const success = payload.success === true;
        const accountLocked = payload.accountLocked === true;
        const rateLimited = payload.rateLimited === true;
        const unauthorized =
            response && response.status === 401;

        const remainingSeconds =
            Number.isFinite(Number(payload.remainingSeconds)) &&
            Number(payload.remainingSeconds) > 0
                ? Math.ceil(Number(payload.remainingSeconds))
                : 0;

        const message =
            (typeof payload.message === "string" &&
                payload.message.trim()) ||
            (success
                ? "Islem basarili."
                : "Islem sirasinda bir hata olustu.");

        return {
            ok: response ? response.ok : success,
            success,
            message,
            data: payload.data !== undefined ? payload.data : null,
            unauthorized,
            rateLimited,
            accountLocked,
            remainingSeconds
        };
    }

    // ---------------------------------------------------------
    // YARDIMCI: HTTP metodu ortak isleyici
    // ---------------------------------------------------------

    async function request(method, path, body) {
        let response;
        try {
            const options = { method };

            if (body !== undefined && body !== null) {
                options.body =
                    typeof body === "string"
                        ? body
                        : JSON.stringify(body);
            }

            response = await Auth.authFetch(path, options);
        } catch (error) {
            console.error(
                "[PrivacyEndpoint] Network hatasi:",
                error
            );
            return {
                ok: false,
                success: false,
                message:
                    "Sunucuya baglanilamadi. Lutfen backend servisinin calistigindan emin olunuz.",
                data: null,
                unauthorized: false,
                rateLimited: false,
                accountLocked: false,
                remainingSeconds: 0
            };
        }

        const result = await parseJson(response);
        return normalize(result, response);
    }

    // ---------------------------------------------------------
    // ENDPOINTS
    // ---------------------------------------------------------

    /**
     * Oturum açmış kullanıcının gizlilik ayarlarını getir.
     * GET /api/privacy/me
     */
    async function getMySettings() {
        return await request(
            "GET",
            "/api/privacy/me"
        );
    }

    /**
     * Oturum açmış kullanıcının gizlilik ayarlarını güncelle.
     * PUT /api/privacy/me
     * body: { messageRequestPermission: "Everyone" | "FriendsOnly" | "Nobody" }
     */
    async function updateMySettings(permission) {
        if (
            permission === undefined ||
            permission === null ||
            permission === ""
        ) {
            return {
                ok: false,
                success: false,
                message: "Gizlilik degeri belirtilmedi.",
                data: null,
                unauthorized: false,
                rateLimited: false,
                accountLocked: false,
                remainingSeconds: 0
            };
        }

        return await request(
            "PUT",
            "/api/privacy/me",
            { messageRequestPermission: String(permission) }
        );
    }

    // ---------------------------------------------------------
    // GLOBAL EXPORT
    // ---------------------------------------------------------

    window.PrivacyAPI = {
        getMySettings,
        updateMySettings
    };
})();