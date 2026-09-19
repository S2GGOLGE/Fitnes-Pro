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

    async function callTwoFactor(method, path, body) {
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

    window.TwoFactorEndpoint = {
        fetchStatus: function () {
            return callTwoFactor("GET", "/api/two-factor/status");
        },
        enable: function () {
            return callTwoFactor("POST", "/api/two-factor/enable");
        },
        disable: function () {
            return callTwoFactor("POST", "/api/two-factor/disable");
        },
        sendCode: function () {
            return callTwoFactor("POST", "/api/two-factor/send-code");
        },
        verify: function (code) {
            return callTwoFactor("POST", "/api/two-factor/verify", { code });
        }
    };
})();
