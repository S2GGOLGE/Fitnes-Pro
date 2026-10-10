/**
 * =========================================================
 * FITNESS PRO - KONUM BELİRLEME (HARİTA) SAYFASI JS
 * Tasarım ve Kapsam: Raporlar/Tasarım/Kayıt Ol Sonrası/Açıklama.txt & 1.png
 * =========================================================
 */

(function () {
    "use strict";

    // Application State
    const state = {
        map: null,
        marker: null,
        userLevel: "Acemi", // Acemi, Orta, Uzman
        userEmail: "",
        username: "",
        locationSelected: false,
        locationData: {
            country: "Türkiye",
            city: "",
            district: "",
            neighborhood: "",
            lat: null,
            lng: null
        }
    };

    // DOM Elements
    const elements = {
        mapContainer: document.getElementById("mapContainer"),
        btnAutoLocation: document.getElementById("btnAutoLocation"),
        btnManualEntry: document.getElementById("btnManualEntry"),
        btnContinue: document.getElementById("btnContinue"),
        btnSkipLocation: document.getElementById("btnSkipLocation"),
        roleBadge: document.getElementById("roleBadge"),
        selectedAddressText: document.getElementById("selectedAddressText"),
        alertBox: document.getElementById("locationAlertBox"),
        
        // Modal Elements
        manualModal: document.getElementById("manualModal"),
        modalCloseBtn: document.getElementById("modalCloseBtn"),
        modalCancelBtn: document.getElementById("modalCancelBtn"),
        modalSaveBtn: document.getElementById("modalSaveBtn"),
        inputCountry: document.getElementById("inputCountry"),
        inputCity: document.getElementById("inputCity"),
        inputDistrict: document.getElementById("inputDistrict"),
        inputNeighborhood: document.getElementById("inputNeighborhood")
    };

    // Common city coordinates for manual positioning fallback
    const CITY_COORDINATES = {
        "istanbul": [41.0082, 28.9784],
        "ankara": [39.9334, 32.8597],
        "izmir": [38.4237, 27.1428],
        "bursa": [40.1885, 29.0610],
        "antalya": [36.8969, 30.7133],
        "adana": [37.0000, 35.3213],
        "konya": [37.8746, 32.4932],
        "gaziantep": [37.0662, 37.3833],
        "sanliurfa": [37.1674, 38.7955],
        "kocaeli": [40.8533, 29.8815],
        "eskisehir": [39.7667, 30.5256],
        "trabzon": [41.0027, 39.7168],
        "samsun": [41.2867, 36.33]
    };

    /**
     * Kullanıcı Bilgilerini Oku (SessionStorage / URL params)
     */
    function initUserData() {
        // 1. Session Storage kontrolü (Singup.html'den aktarılan)
        try {
            const stored = sessionStorage.getItem("fitnesspro_register_user") || sessionStorage.getItem("registeredUser");
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.level) state.userLevel = parsed.level;
                if (parsed.email) state.userEmail = parsed.email;
                if (parsed.username) state.username = parsed.username;
            }
        } catch (e) {
            console.warn("Kullanıcı verisi okunamadı:", e);
        }

        // 2. URL Query Parametreleri kontrolü (?level=Uzman vb.)
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("level")) {
            state.userLevel = urlParams.get("level");
        }
        if (urlParams.get("email")) {
            state.userEmail = urlParams.get("email");
        }

        updateRoleDisplay();
    }

    /**
     * Kullanıcı Rolü ve Kısıtlamaları Güncelle
     * Kural: Standart kullanıcılar atlayabilir, Uzman seviyesindekiler atlayamaz!
     */
    function updateRoleDisplay() {
        const isUzman = state.userLevel && state.userLevel.toLowerCase() === "uzman";
        
        if (elements.roleBadge) {
            elements.roleBadge.textContent = isUzman ? "Seviye: Uzman" : `Seviye: ${state.userLevel || "Standart"}`;
            if (isUzman) {
                elements.roleBadge.classList.add("is-uzman");
            } else {
                elements.roleBadge.classList.remove("is-uzman");
            }
        }

        // Uzman kullanıcılar için "Atla" butonunu gizle
        if (elements.btnSkipLocation) {
            if (isUzman) {
                elements.btnSkipLocation.classList.add("hidden");
                elements.btnSkipLocation.setAttribute("aria-hidden", "true");
            } else {
                elements.btnSkipLocation.classList.remove("hidden");
                elements.btnSkipLocation.removeAttribute("aria-hidden");
            }
        }
    }

    /**
     * Haritayı Başlat (Leaflet + CartoDB Dark Tiles)
     */
    function initMap() {
        if (!elements.mapContainer || typeof L === "undefined") {
            console.error("Leaflet harita kütüphanesi yüklenemedi.");
            return;
        }

        // Türkiye merkezli başlangıç konumu
        const defaultLat = 41.0082;
        const defaultLng = 28.9784;

        state.map = L.map("mapContainer", {
            center: [defaultLat, defaultLng],
            zoom: 12,
            zoomControl: true
        });

        // Koyu Tema Harita Katmanı (CartoDB Dark Matter)
        L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
            attribution: '&copy; <a href="https://carto.com/">CARTO</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
            subdomains: "abcd",
            maxZoom: 19
        }).addTo(state.map);

        // Haritaya tıklama ile konum belirleme
        state.map.on("click", (e) => {
            handleMapClick(e.latlng.lat, e.latlng.lng);
        });

        // Özel Marker İkonu (Yeşil Fitness Pro Pin)
        createCustomMarker([defaultLat, defaultLng], false);
    }

    /**
     * Harita Üzerinde Pin / Marker Oluştur veya Güncelle
     */
    function createCustomMarker(latlng, setActive = true) {
        const customIcon = L.divIcon({
            className: "fitness-map-pin",
            html: `
                <div style="
                    width: 38px;
                    height: 38px;
                    background: #22C55E;
                    border: 3px solid #0B0F0D;
                    border-radius: 50% 50% 50% 0;
                    transform: rotate(-45deg);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 14px rgba(34, 197, 94, 0.5);
                ">
                    <div style="
                        width: 12px;
                        height: 12px;
                        background: #0B0F0D;
                        border-radius: 50%;
                        transform: rotate(45deg);
                    "></div>
                </div>
            `,
            iconSize: [38, 38],
            iconAnchor: [19, 38],
            popupAnchor: [0, -38]
        });

        if (state.marker) {
            state.marker.setLatLng(latlng);
        } else {
            state.marker = L.marker(latlng, {
                icon: customIcon,
                draggable: true
            }).addTo(state.map);

            state.marker.on("dragend", (e) => {
                const pos = e.target.getLatLng();
                handleMapClick(pos.lat, pos.lng);
            });
        }

        if (setActive) {
            state.locationSelected = true;
            state.locationData.lat = latlng[0] || latlng.lat;
            state.locationData.lng = latlng[1] || latlng.lng;
        }
    }

    /**
     * Haritaya tıklandığında konumu güncelle
     */
    async function handleMapClick(lat, lng) {
        createCustomMarker([lat, lng], true);
        state.locationData.lat = lat;
        state.locationData.lng = lng;
        state.locationSelected = true;

        showAlert("Konum harita üzerinden seçildi.", "success", 2500);
        updateAddressChip(`Koordinat: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);

        // Reverse Geocoding (Nominatim API - Graceful with timeout)
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            const resp = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
                { signal: controller.signal }
            );
            clearTimeout(timeoutId);

            if (resp.ok) {
                const data = await resp.json();
                if (data && data.address) {
                    const city = data.address.province || data.address.city || data.address.state || "";
                    const district = data.address.suburb || data.address.town || data.address.district || "";
                    const country = data.address.country || "Türkiye";

                    state.locationData.city = city;
                    state.locationData.district = district;
                    state.locationData.country = country;

                    const formatted = [district, city, country].filter(Boolean).join(", ");
                    if (formatted) {
                        updateAddressChip(formatted);
                    }
                }
            }
        } catch (e) {
            // Geocoding başarısız olsa da koordinatlar geçerlidir.
        }
    }

    /**
     * Otomatik Konum Belirleme (HTML5 Geolocation)
     */
    function requestUserLocation() {
        if (!navigator.geolocation) {
            showAlert("Tarayıcınız otomatik konum servisini desteklemiyor. Lütfen Manuel Giriş yapınız.", "warning");
            return;
        }

        if (elements.btnAutoLocation) {
            elements.btnAutoLocation.disabled = true;
            elements.btnAutoLocation.innerHTML = `
                <svg class="spin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;animation:spin 1s linear infinite;">
                    <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
                    <path d="M12 2a10 10 0 0 1 10 10"></path>
                </svg>
                <span>Konum Alınıyor...</span>
            `;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;

                state.locationSelected = true;
                state.locationData.lat = lat;
                state.locationData.lng = lng;

                if (state.map) {
                    state.map.setView([lat, lng], 15);
                    createCustomMarker([lat, lng], true);
                }

                showAlert("Mevcut konumunuz başarıyla tespit edildi!", "success");
                handleMapClick(lat, lng);
                resetAutoLocationButton();
            },
            (err) => {
                console.warn("Geolocation Hatası:", err);
                showAlert("Konumun alınamadı. Konum iznini kontrol ederek tekrar deneyebilir veya Manuel Giriş yapabilirsiniz.", "warning");
                resetAutoLocationButton();
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    }

    function resetAutoLocationButton() {
        if (elements.btnAutoLocation) {
            elements.btnAutoLocation.disabled = false;
            elements.btnAutoLocation.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
                </svg>
                <span>Otomatik Konum Belirle</span>
            `;
        }
    }

    /**
     * Manuel Giriş Modalı İşlemleri
     */
    function openManualModal() {
        if (!elements.manualModal) return;
        elements.manualModal.classList.add("active");
        if (elements.inputCity) elements.inputCity.focus();
    }

    function closeManualModal() {
        if (!elements.manualModal) return;
        elements.manualModal.classList.remove("active");
    }

    function saveManualLocation(e) {
        if (e) e.preventDefault();

        const country = elements.inputCountry ? elements.inputCountry.value.trim() : "Türkiye";
        const city = elements.inputCity ? elements.inputCity.value.trim() : "";
        const district = elements.inputDistrict ? elements.inputDistrict.value.trim() : "";
        const neighborhood = elements.inputNeighborhood ? elements.inputNeighborhood.value.trim() : "";

        if (!city) {
            alert("Lütfen en azından İl bilgisini giriniz.");
            if (elements.inputCity) elements.inputCity.focus();
            return;
        }

        state.locationData.country = country || "Türkiye";
        state.locationData.city = city;
        state.locationData.district = district;
        state.locationData.neighborhood = neighborhood;
        state.locationSelected = true;

        // İl adına göre haritayı odakla (bilinen koordinat veya varsayılan)
        const cityKey = city.toLowerCase().replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c");
        const coords = CITY_COORDINATES[cityKey] || [41.0082, 28.9784];

        state.locationData.lat = coords[0];
        state.locationData.lng = coords[1];

        if (state.map) {
            state.map.setView(coords, 13);
            createCustomMarker(coords, true);
        }

        const addressSummary = [neighborhood, district, city, country].filter(Boolean).join(", ");
        updateAddressChip(addressSummary);

        closeManualModal();
        showAlert("Manuel konum başarıyla kaydedildi!", "success");
    }

    /**
     * Adres Chip'ini Güncelle
     */
    function updateAddressChip(text) {
        if (elements.selectedAddressText) {
            elements.selectedAddressText.textContent = text || "Konum Henüz Belirlenmedi";
        }
    }

    /**
     * Bildirim Göster
     */
    function showAlert(message, type = "warning", duration = 4000) {
        if (!elements.alertBox) return;
        elements.alertBox.textContent = message;
        elements.alertBox.className = `location-alert-box show ${type}`;

        if (duration > 0) {
            setTimeout(() => {
                if (elements.alertBox) {
                    elements.alertBox.className = "location-alert-box";
                    elements.alertBox.textContent = "";
                }
            }, duration);
        }
    }

    /**
     * Devam Et Butonu Kontrolü
     * Kural: Standart kullanıcılar atlayabilir, Uzman seviyesindekiler atlayamaz!
     */
    function handleContinue() {
        const isUzman = state.userLevel && state.userLevel.toLowerCase() === "uzman";

        if (isUzman && !state.locationSelected) {
            showAlert("Uzman seviyesindeki eğitmenler için konum belirleme zorunludur! Lütfen haritadan veya Manuel Giriş ile konumunuzu belirleyiniz.", "warning", 5000);
            return;
        }

        saveAndNavigateNext();
    }

    /**
     * Standart Kullanıcılar İçin Atla
     */
    function handleSkip() {
        const isUzman = state.userLevel && state.userLevel.toLowerCase() === "uzman";
        if (isUzman) {
            showAlert("Uzman seviyesindeki kullanıcılar bu adımı atlayamaz.", "warning");
            return;
        }

        // Konum seçilmeden devam et
        state.locationSelected = false;
        saveAndNavigateNext();
    }

    /**
     * Verileri Sakla ve E-posta Doğrulama Sayfasına Yönlendir
     */
    function saveAndNavigateNext() {
        try {
            sessionStorage.setItem("fitnesspro_location", JSON.stringify(state.locationData));
            // Kullanıcı seviyesini ve e-postasını bir sonraki sayfaya aktar
            const userState = {
                username: state.username,
                email: state.userEmail,
                level: state.userLevel,
                locationSet: state.locationSelected
            };
            sessionStorage.setItem("fitnesspro_register_user", JSON.stringify(userState));
        } catch (e) {
            console.warn("Storage hatası:", e);
        }

        // E-posta Doğrulama Sayfasına Yönlendir
        const targetUrl = `EpostaDogrulama.html${state.userEmail ? `?email=${encodeURIComponent(state.userEmail)}` : ""}`;
        window.location.href = targetUrl;
    }

    /**
     * Event Listeners & Initialize
     */
    document.addEventListener("DOMContentLoaded", () => {
        initUserData();
        initMap();

        if (elements.btnAutoLocation) {
            elements.btnAutoLocation.addEventListener("click", requestUserLocation);
        }

        if (elements.btnManualEntry) {
            elements.btnManualEntry.addEventListener("click", openManualModal);
        }

        if (elements.modalCloseBtn) {
            elements.modalCloseBtn.addEventListener("click", closeManualModal);
        }

        if (elements.modalCancelBtn) {
            elements.modalCancelBtn.addEventListener("click", closeManualModal);
        }

        if (elements.modalSaveBtn) {
            elements.modalSaveBtn.addEventListener("click", saveManualLocation);
        }

        if (elements.btnContinue) {
            elements.btnContinue.addEventListener("click", handleContinue);
        }

        if (elements.btnSkipLocation) {
            elements.btnSkipLocation.addEventListener("click", handleSkip);
        }

        // Dışarı tıklandığında modalı kapat
        if (elements.manualModal) {
            elements.manualModal.addEventListener("click", (e) => {
                if (e.target === elements.manualModal) {
                    closeManualModal();
                }
            });
        }

        // ESC tuşu ile modalı kapat
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && elements.manualModal && elements.manualModal.classList.contains("active")) {
                closeManualModal();
            }
        });

        // Test kolaylığı: Role badge'e tıklayınca Uzman / Standart arasında geçiş yapabilme
        if (elements.roleBadge) {
            elements.roleBadge.style.cursor = "pointer";
            elements.roleBadge.title = "Test: Seviyeyi değiştirmek için tıklayın";
            elements.roleBadge.addEventListener("click", () => {
                state.userLevel = state.userLevel.toLowerCase() === "uzman" ? "Acemi" : "Uzman";
                updateRoleDisplay();
                showAlert(`Test Modu: Seviye "${state.userLevel}" olarak değiştirildi.`, "success", 2000);
            });
        }
    });

})();
