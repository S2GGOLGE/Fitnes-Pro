// =========================================================
// FITNESS PRO - 2FA ENDPOINT INTEGRATION
// =========================================================
// Mevcut authentication mekanizmasını (window.Auth.authFetch)
// kullanarak 2FA durumunu sorgular ve enable/disable işlemlerini
// gerçekleştirir. JWT, Auth.authFetch tarafından otomatik olarak
// "Authorization: Bearer {token}" başlığına eklenir; 401 yanıtında
// mevcut auth sistemi logout akışını çalıştırır.
//
// Backend beklenen response formatları:
//   GET  /api/two-factor/status   -> { isEnabled: boolean }
//   POST /api/two-factor/enable   -> { message, isEnabled: true  }
//   POST /api/two-factor/disable  -> { message, isEnabled: false }
//
// Frontend tarafında sahte/mock fallback YOKTUR. Backend bağlantısı
// kurulamazsa çağıran koda hata fırlatılır; UI katmanı bu hatayı
// mevcut toast/notification sistemiyle kullanıcıya bildirir.
// =========================================================

(function () {
    "use strict";

    const ONBOARDING_TOKEN_KEY = "fitnesspro_onboarding_token";

    function getBaseUrl() {
        return (window.Auth && typeof window.Auth.getBaseUrl === "function")
            ? window.Auth.getBaseUrl()
            : (window.API_BASE_URL || "http://localhost:8081");
    }

    function getOnboardingToken() {
        try {
            return sessionStorage.getItem(ONBOARDING_TOKEN_KEY);
        } catch (e) {
            return null;
        }
    }

    async function parseTwoFactorResponse(response) {
        let payload = null;
        try {
            payload = await response.json();
        } catch (parseError) {
            payload = null;
        }

        if (!response.ok) {
            const backendMessage =
                payload && typeof payload.message === "string" && payload.message.trim()
                    ? payload.message
                    : response.status === 401
                        ? "Oturum süresi dolmuş veya kimlik doğrulanamadı (401)."
                        : `İstek başarısız (HTTP ${response.status}).`;
            throw new Error(backendMessage);
        }

        return payload || {};
    }

    async function callWithExplicitToken(method, path, body, token) {
        const options = {
            method,
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${token}`
            }
        };

        if (body !== undefined) {
            options.headers["Content-Type"] = "application/json";
            options.body = JSON.stringify(body);
        }

        let response;
        try {
            response = await fetch(`${getBaseUrl()}${path}`, options);
        } catch (netErr) {
            throw new Error("Sunucuya bağlanılamadı.");
        }

        return parseTwoFactorResponse(response);
    }

    async function callTwoFactor(method, path, body, explicitToken) {
        if (explicitToken && typeof explicitToken === "string") {
            return callWithExplicitToken(method, path, body, explicitToken);
        }

        if (!window.Auth || typeof window.Auth.authFetch !== "function") {
            throw new Error("Kimlik doğrulama altyapısı hazır değil.");
        }

        const options = { method };

        if (body !== undefined) {
            options.body = JSON.stringify(body);
        }

        const response = await window.Auth.authFetch(path, options);

        let payload = null;
        try {
            payload = await response.json();
        } catch (parseError) {
            payload = null;
        }

        if (!response.ok) {
            const backendMessage =
                payload && typeof payload.message === "string" && payload.message.trim()
                    ? payload.message
                    : `İstek başarısız (HTTP ${response.status}).`;
            throw new Error(backendMessage);
        }

        return payload || {};
    }

    // Kayıt sonrası veya login e-posta doğrulama adımı:
    // Açıkça verilen token veya sınırlı yetkili onboarding token'ı varsa onunla çağır.
    async function callTwoFactorWithOnboarding(method, path, body, explicitToken) {
        const tokenToUse =
            (explicitToken && typeof explicitToken === "string" ? explicitToken : null) ||
            getOnboardingToken();

        if (!tokenToUse) {
            return callTwoFactor(method, path, body);
        }

        return callWithExplicitToken(method, path, body, tokenToUse);
    }

    window.TwoFactorEndpoint = {
        fetchStatus: function (explicitToken) {
            return callTwoFactor("GET", "/api/two-factor/status", undefined, explicitToken);
        },
        enable: function () {
            return callTwoFactor("POST", "/api/two-factor/enable");
        },
        disable: function () {
            return callTwoFactor("POST", "/api/two-factor/disable");
        },
        sendCode: function (explicitToken) {
            return callTwoFactorWithOnboarding("POST", "/api/two-factor/send-code", undefined, explicitToken);
        },
        verify: function (code, explicitToken) {
            return callTwoFactorWithOnboarding("POST", "/api/two-factor/verify", { code }, explicitToken);
        }
    };
})();
