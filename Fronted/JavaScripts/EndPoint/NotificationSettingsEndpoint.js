(function () {
    "use strict";
    async function request(method, body) {
        if (!window.Auth || typeof window.Auth.authFetch !== "function") throw new Error("Oturum doğrulanamadı.");
        const response = await window.Auth.authFetch("/api/notification-settings", {
            method,
            ...(body ? { body: JSON.stringify(body) } : {})
        });
        let payload = {};
        try { payload = await response.json(); } catch { /* empty response */ }
        if (!response.ok) throw new Error(payload.message || `İstek başarısız (HTTP ${response.status}).`);
        return payload;
    }
    window.NotificationSettingsAPI = {
        get: () => request("GET"),
        save: (settings) => request("PUT", settings)
    };
})();
