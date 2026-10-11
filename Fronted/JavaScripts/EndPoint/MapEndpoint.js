// =========================================================
// FITNESS PRO - MAP & LOCATION ENDPOINT INTEGRATION
// =========================================================
// Backend:
//   MapController / IMapService / MapService
//   POST /api/locations (veya /api/maps)
//   Model: MapsModel (Country, Province, District, Neighbourhood, Address, Latitude, Longitude)
// =========================================================

(function () {
    "use strict";

    const API_BASE_URL = window.API_BASE_URL || "http://localhost:8081";
    const ONBOARDING_TOKEN_KEY = "fitnesspro_onboarding_token";

    // Kayıt/giriş sonrası verilen sınırlı yetkili onboarding token'ı varsa onu,
    // yoksa normal oturum token'ını kullanır.
    function getAuthToken() {
        let token = null;
        try {
            token = sessionStorage.getItem(ONBOARDING_TOKEN_KEY);
        } catch (e) {
            token = null;
        }
        if (!token) {
            if (window.Auth && typeof window.Auth.getToken === "function") {
                token = window.Auth.getToken();
            } else {
                token = localStorage.getItem("fitness_pro_token");
            }
        }
        return token;
    }

    async function saveLocation(locationData) {
        if (!locationData) {
            throw new Error("Kaydedilecek konum verisi bulunamadı.");
        }

        // Backend MapsModel alanlarıyla birebir eşleme:
        // Country, Province (İl), District (İlçe), Neighbourhood (Mahalle), Address, Latitude, Longitude
        const payload = {
            country: locationData.country || "Türkiye",
            province: locationData.province || locationData.city || "",
            district: locationData.district || "",
            neighbourhood: locationData.neighbourhood || locationData.neighborhood || "",
            address: locationData.address || `${locationData.district || ""}, ${locationData.province || locationData.city || ""}`.trim(),
            latitude: (locationData.latitude !== undefined && locationData.latitude !== null)
                ? parseFloat(locationData.latitude)
                : (locationData.lat !== undefined && locationData.lat !== null ? parseFloat(locationData.lat) : null),
            longitude: (locationData.longitude !== undefined && locationData.longitude !== null)
                ? parseFloat(locationData.longitude)
                : (locationData.lng !== undefined && locationData.lng !== null ? parseFloat(locationData.lng) : null)
        };

        let token = getAuthToken();

        const headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        };

        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        let response;
        try {
            response = await fetch(`${API_BASE_URL}/api/locations`, {
                method: "POST",
                headers: headers,
                body: JSON.stringify(payload)
            });
        } catch (netErr) {
            // /api/locations erişilemezse /api/maps rotasını dene
            try {
                response = await fetch(`${API_BASE_URL}/api/maps`, {
                    method: "POST",
                    headers: headers,
                    body: JSON.stringify(payload)
                });
            } catch (fallbackErr) {
                throw new Error("Sunucuya bağlanılamadı. Backend servisinin (http://localhost:8081) çalıştığından emin olunuz.");
            }
        }

        let result = null;
        try {
            result = await response.json();
        } catch (e) {
            result = null;
        }

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error("Oturum süresi dolmuş veya kimlik doğrulanamadı (401). Lütfen tekrar giriş yapınız.");
            }
            const msg = (result && (result.message || result.Message)) || `Konum kaydedilemedi (HTTP ${response.status}).`;
            throw new Error(msg);
        }

        // Backend başarıyı açıkça bildirmediyse kaydı başarılı sayma.
        if (!result || result.success !== true) {
            throw new Error((result && (result.message || result.Message)) || "Konum kaydı backend tarafından onaylanmadı.");
        }

        return result;
    }

    // Backend'den konum / e-posta doğrulama durumunu getirir (GET /api/locations/status).
    async function getStatus() {
        const token = getAuthToken();
        if (!token) {
            throw new Error("Oturum bilgisi bulunamadı. Lütfen tekrar giriş yapınız.");
        }

        let response;
        try {
            response = await fetch(`${API_BASE_URL}/api/locations/status`, {
                method: "GET",
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            });
        } catch (netErr) {
            throw new Error("Sunucuya bağlanılamadı.");
        }

        let result = null;
        try {
            result = await response.json();
        } catch (e) {
            result = null;
        }

        if (response.status === 401) {
            throw new Error("Oturum süresi dolmuş veya kimlik doğrulanamadı (401). Lütfen tekrar giriş yapınız.");
        }
        if (!response.ok || !result || result.success !== true || !result.data) {
            throw new Error((result && result.message) || `Durum alınamadı (HTTP ${response.status}).`);
        }

        return result.data;
    }

    // Backend'den kayıtlı kullanıcı konumlarını getirir (GET /api/locations veya /api/maps).
    async function getLocations(userId) {
        const token = getAuthToken();
        if (!token) {
            throw new Error("Oturum bilgisi bulunamadı. Lütfen tekrar giriş yapınız.");
        }

        const headers = {
            "Accept": "application/json",
            "Authorization": `Bearer ${token}`
        };

        const queryString = userId ? `?userId=${encodeURIComponent(userId)}` : "";
        let response;
        try {
            response = await fetch(`${API_BASE_URL}/api/locations${queryString}`, {
                method: "GET",
                headers: headers
            });
        } catch (netErr) {
            // /api/locations erişilemezse /api/maps rotasını dene
            try {
                response = await fetch(`${API_BASE_URL}/api/maps${queryString}`, {
                    method: "GET",
                    headers: headers
                });
            } catch (fallbackErr) {
                throw new Error("Sunucuya bağlanılamadı. Backend servisinin (" + API_BASE_URL + ") çalıştığından emin olunuz.");
            }
        }

        let result = null;
        try {
            result = await response.json();
        } catch (e) {
            result = null;
        }

        if (response.status === 401) {
            throw new Error("Oturum süresi dolmuş veya kimlik doğrulanamadı (401). Lütfen tekrar giriş yapınız.");
        }

        if (!response.ok || !result || result.success !== true) {
            const msg = (result && (result.message || result.Message)) || `Konumlar alınamadı (HTTP ${response.status}).`;
            throw new Error(msg);
        }

        // result.data listesini (veya boş listeyi) döndür
        return Array.isArray(result.data) ? result.data : [];
    }

    window.MapEndpoint = {
        saveLocation: saveLocation,
        getStatus: getStatus,
        getLocations: getLocations
    };
})();
