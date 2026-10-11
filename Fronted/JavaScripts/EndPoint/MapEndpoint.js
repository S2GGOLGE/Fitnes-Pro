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

        // Token alımı (window.Auth varsa oradan, yoksa localStorage'dan)
        let token = null;
        if (window.Auth && typeof window.Auth.getToken === "function") {
            token = window.Auth.getToken();
        } else {
            token = localStorage.getItem("fitness_pro_token");
        }

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

        return result || { success: true, message: "Konum başarıyla kaydedildi." };
    }

    window.MapEndpoint = {
        saveLocation: saveLocation
    };
})();
