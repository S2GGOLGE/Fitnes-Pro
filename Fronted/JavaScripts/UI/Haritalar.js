/**
 * =========================================================
 * FITNESS PRO - HARİTALAR (MAPS) UI CONTROLLER
 * =========================================================
 * Açıklama Şartnamesi (Açıklama.txt) ve Haritalar.png tasarımına
 * birebir uygun, modüler ve frontend odaklı geliştirilmiştir.
 *
 * Önemli Kural (Madde 26):
 *   Backend yazılmamıştır, database/API çağrısı yapılmaz.
 *   Tüm kullanıcı ve mesafe verileri harita mimarisi
 *   üzerinden yönetilir.
 *
 * Fonksiyonlar (Madde 23):
 *   - initializeMapPage()
 *   - initializeMap()
 *   - requestUserLocation()
 *   - handleLocationSuccess(pos)
 *   - handleLocationError(err)
 *   - renderUserMarkers()
 *   - renderNearbyUsers()
 *   - filterUsers(type)
 *   - showUserInfo(userId)
 *   - focusUser(userId)
 *   - centerOnUser()
 *   - showLoading(show)
 *   - showEmptyState(show)
 *   - showError(message)
 * =========================================================
 */

(() => {
    'use strict';

    // =========================================================
    // VARSAYILAN MERKEZ & KONUM BİLGİSİ
    // =========================================================
    // Varsayılan Merkez: Kadıköy / Moda, İstanbul
    const DEFAULT_COORDS = {
        lat: 40.9880,
        lng: 29.0280
    };

    // Kullanıcının anlık konumu (Geolocation ile güncellenebilir)
    let userLocation = {
        lat: DEFAULT_COORDS.lat,
        lng: DEFAULT_COORDS.lng,
        isCustom: false
    };

    // =========================================================
    // STATE
    // =========================================================
    let mapUsers = [];
    let currentFilter = "all"; // "all" | "friend" | "trainer"
    let mapInstance = null;
    let userMarkerInstance = null;
    let markersLayerGroup = null;
    let isLeafletReady = false;

    // =========================================================
    // DOM ELEMENTS
    // =========================================================
    const filterButtons = document.querySelectorAll('.filter-btn');
    const sidebarQuickUsers = document.getElementById('sidebarQuickUsers');
    const nearbyUsersGrid = document.getElementById('nearbyUsersGrid');
    const mapLoadingOverlay = document.getElementById('mapLoadingOverlay');
    const locationBanner = document.getElementById('locationBanner');
    const locationBannerText = document.getElementById('locationBannerText');
    const btnBannerRetry = document.getElementById('btnBannerRetry');
    const btnCenterOnUser = document.getElementById('btnCenterOnUser');
    const btnRequestLocationHeader = document.getElementById('btnRequestLocationHeader');
    const btnLocationText = document.getElementById('btnLocationText');

    const filterCountAll = document.getElementById('filterCountAll');
    const filterCountFriend = document.getElementById('filterCountFriend');
    const filterCountTrainer = document.getElementById('filterCountTrainer');
    const sidebarNearbyCount = document.getElementById('sidebarNearbyCount');
    const activeFilterCountBadge = document.getElementById('activeFilterCountBadge');

    const sidebar = document.getElementById('haritalarSidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');

    // =========================================================
    // SVG ICONS
    // =========================================================
    const ICONS = {
        mapPin: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
        user: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
        star: `<svg width="12" height="12" viewBox="0 0 24 24" fill="#eab308" stroke="#eab308" stroke-width="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
        arrowRight: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`,
        empty: `<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`
    };

    // =========================================================
    // HAVERSINE MESAFE HESABI (Madde 16)
    // =========================================================
    function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // Dünya yarıçapı metre cinsinden
        const φ1 = (lat1 * Math.PI) / 180;
        const φ2 = (lat2 * Math.PI) / 180;
        const Δφ = ((lat2 - lat1) * Math.PI) / 180;
        const Δλ = ((lon2 - lon1) * Math.PI) / 180;

        const a =
            Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        const distanceMeters = Math.round(R * c);

        if (distanceMeters < 1000) {
            return `${distanceMeters} m`;
        }
        return `${(distanceMeters / 1000).toFixed(1)} km`;
    }

    function getDistanceNumeric(lat1, lon1, lat2, lon2) {
        const R = 6371e3;
        const φ1 = (lat1 * Math.PI) / 180;
        const φ2 = (lat2 * Math.PI) / 180;
        const Δφ = ((lat2 - lat1) * Math.PI) / 180;
        const Δλ = ((lon2 - lon1) * Math.PI) / 180;
        const a =
            Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * R;
    }

    // =========================================================
    // =========================================================
    // 23. JAVASCRIPT MANTIĞI: initializeMapPage()
    // =========================================================
    async function initializeMapPage() {
        updateUserData();
        bindEvents();
        initializeMap();

        // Backend'den kayıtlı kullanıcı konumlarını getir
        await fetchRegisteredLocations();

        // Tarayıcı daha önce konum iznini reddettiyse, otomatik olarak banner'ı göster
        // böylece kullanıcı "Tekrar Dene" butonunu görebilsin.
        if (navigator.permissions && navigator.permissions.query) {
            navigator.permissions.query({ name: 'geolocation' }).then((status) => {
                if (status.state === 'denied') {
                    handleLocationError({ code: 1, message: "Permission denied" });
                } else {
                    requestUserLocation(false);
                }
            }).catch(() => {
                requestUserLocation(false);
            });
        } else {
            requestUserLocation(false);
        }
    }

    // =========================================================
    // BACKEND API ENTEGRASYONU: fetchRegisteredLocations()
    // =========================================================
    let rawApiUsers = [];

    async function fetchRegisteredLocations() {
        if (!window.MapEndpoint || typeof window.MapEndpoint.getLocations !== 'function') {
            console.warn('[Haritalar] MapEndpoint.getLocations bulunamadı.');
            mapUsers = [];
            updateCounters();
            renderSidebarQuickUsers();
            showEmptyState(false);
            if (markersLayerGroup) markersLayerGroup.clearLayers();
            return;
        }

        showLoading(true);

        try {
            const data = await window.MapEndpoint.getLocations();
            rawApiUsers = Array.isArray(data) ? data : [];

            // Giriş yapan aktif kullanıcının kimliğini al
            let currentUserId = 0;
            if (window.Auth && typeof window.Auth.getUser === 'function') {
                const u = window.Auth.getUser();
                if (u && (u.id || u.userId)) {
                    currentUserId = Number(u.id || u.userId);
                }
            }

            // Backend verisinden geçerli koordinata sahip kullanıcıları filtrele
            // Enlem [-90, 90], Boylam [-180, 180] ve (0,0) olmayanlar
            const validLocations = rawApiUsers.filter(item => {
                const lat = Number(item.latitude);
                const lng = Number(item.longitude);
                return (
                    !isNaN(lat) &&
                    !isNaN(lng) &&
                    lat >= -90 && lat <= 90 &&
                    lng >= -180 && lng <= 180 &&
                    !(lat === 0 && lng === 0)
                );
            });

            // Kendi konumumuz veritabanında varsa ve henüz GPS almadıysak haritayı oraya merkezle
            const myLocation = validLocations.find(loc => loc.userId === currentUserId);
            if (myLocation && !userLocation.isCustom) {
                userLocation.lat = Number(myLocation.latitude);
                userLocation.lng = Number(myLocation.longitude);
                if (isLeafletReady && mapInstance) {
                    renderUserLocationMarker();
                }
            }

            // Diğer kayıtlı kullanıcıları harita listesine dönüştür
            const otherUsers = validLocations.filter(loc => loc.userId !== currentUserId);

            if (otherUsers.length > 0) {
                mapUsers = otherUsers.map(loc => {
                    const lat = Number(Number(loc.latitude).toFixed(6));
                    const lng = Number(Number(loc.longitude).toFixed(6));
                    const distance = calculateHaversineDistance(userLocation.lat, userLocation.lng, lat, lng);
                    const distNum = getDistanceNumeric(userLocation.lat, userLocation.lng, lat, lng);

                    const roleStr = (loc.role || '').toLowerCase();
                    const isTrainer = roleStr.includes('trainer') || roleStr.includes('antren') || roleStr.includes('admin') || roleStr.includes('ileri');

                    const username = loc.username || `uye_${loc.userId}`;
                    const fullname = loc.fullName || loc.fullname || username;

                    // Avatar harfleri (örn: Ali Demir -> AD)
                    const parts = fullname.trim().split(/\s+/);
                    let avatarLetters = 'FP';
                    if (parts.length >= 2) {
                        avatarLetters = (parts[0][0] + parts[1][0]).toUpperCase();
                    } else if (parts.length === 1 && parts[0].length >= 2) {
                        avatarLetters = parts[0].substring(0, 2).toUpperCase();
                    }

                    return {
                        id: loc.userId,
                        username: username,
                        fullname: fullname,
                        type: isTrainer ? 'trainer' : 'friend',
                        typeTitle: isTrainer ? 'Antrenör' : 'Arkadaş',
                        roleDescription: isTrainer ? 'Personal Trainer' : (loc.role || 'Fitness Partneri'),
                        avatarLetters: avatarLetters,
                        profilePhoto: '',
                        latitude: lat,
                        longitude: lng,
                        distance: distance,
                        distanceMeters: distNum,
                        bio: `@${username} Fitness Pro kayıtlı üyesi.`
                    };
                });

                // Mesafeye göre sırala
                mapUsers.sort((a, b) => a.distanceMeters - b.distanceMeters);

                updateCounters();
                renderSidebarQuickUsers();
                renderNearbyUsers();
                renderUserMarkers();
            } else if (validLocations.length === 0) {
                // Veritabanında hiç koordinatlı kullanıcı yoksa boş durum göster
                mapUsers = [];
                updateCounters();
                renderSidebarQuickUsers();
                showEmptyState(false);
                if (markersLayerGroup) markersLayerGroup.clearLayers();
            } else {
                // Sadece kendisi varsa
                mapUsers = [];
                updateCounters();
                renderSidebarQuickUsers();
                showEmptyState(false);
                if (markersLayerGroup) markersLayerGroup.clearLayers();
            }
        } catch (err) {
            console.error('[Haritalar] Konumlar backendden alınırken hata oluştu:', err);
            showError(err.message || 'Konumlar sunucudan alınamadı.');
            mapUsers = [];
            updateCounters();
            renderSidebarQuickUsers();
            showEmptyState(false);
            if (markersLayerGroup) markersLayerGroup.clearLayers();
        } finally {
            showLoading(false);
        }
    }

    // =========================================================

    // =========================================================
    // 23. JAVASCRIPT MANTIĞI: initializeMap()
    // =========================================================
    function initializeMap() {
        showLoading(true);

        const mapDom = document.getElementById('fitnessMap');
        if (!mapDom) return;

        // Leaflet kütüphanesi kontrolü
        if (typeof window.L === 'undefined') {
            console.warn('Leaflet kütüphanesi yüklenemedi. SVG yedek arayüz aktif.');
            renderMapFallback(mapDom);
            showLoading(false);
            return;
        }

        try {
            isLeafletReady = true;

            // Leaflet Harita Başlatma
            mapInstance = window.L.map('fitnessMap', {
                center: [userLocation.lat, userLocation.lng],
                zoom: 15,
                zoomControl: false,
                attributionControl: false
            });

            // Modern Dark CartoDB Matter Tile Layer
            window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                maxZoom: 19,
                subdomains: 'abcd'
            }).addTo(mapInstance);

            // Zoom butonunu sol alt yerine sağ üste ekle
            window.L.control.zoom({ position: 'topright' }).addTo(mapInstance);

            // Marker grubu
            markersLayerGroup = window.L.layerGroup().addTo(mapInstance);

            // Kullanıcının kendi konum marker'ını çiz (Madde 6)
            renderUserLocationMarker();

            // Kullanıcıların marker'larını çiz
            renderUserMarkers();

            showLoading(false);
        } catch (err) {
            console.error('Harita oluşturulurken hata oluştu:', err);
            renderMapFallback(mapDom);
            showLoading(false);
        }
    }

    // =========================================================
    // 6. KULLANICININ KENDİ KONUM MARKER'I (SEN)
    // =========================================================
    function renderUserLocationMarker() {
        if (!isLeafletReady || !mapInstance) return;

        if (userMarkerInstance) {
            userMarkerInstance.remove();
        }

        const userHtml = `
            <div class="user-location-marker" title="Senin Konumun">
                <div class="user-pulse-ring"></div>
                <div class="user-center-core"></div>
                <span class="user-marker-label">Sen</span>
            </div>
        `;

        const userIcon = window.L.divIcon({
            html: userHtml,
            className: 'user-marker-container',
            iconSize: [36, 36],
            iconAnchor: [18, 18]
        });

        userMarkerInstance = window.L.marker([userLocation.lat, userLocation.lng], {
            icon: userIcon,
            zIndexOffset: 1000
        }).addTo(mapInstance);

        userMarkerInstance.bindPopup(`
            <div class="map-popup-card" style="text-align: center; padding: 12px 14px;">
                <strong style="color: var(--primary); font-size: 13px; display: block; margin-bottom: 4px;">Senin Konumun</strong>
                <p style="font-size: 11px; color: var(--secondary); margin: 0;">Yakınındaki sporcular bu konuma göre mesafelendirilmiştir.</p>
            </div>
        `);
    }

    // =========================================================
    // 23. JAVASCRIPT MANTIĞI: renderUserMarkers()
    // =========================================================
    function renderUserMarkers() {
        if (!isLeafletReady || !markersLayerGroup) return;

        markersLayerGroup.clearLayers();

        const filtered = mapUsers.filter(user => {
            if (currentFilter === 'all') return true;
            return user.type === currentFilter;
        });

        filtered.forEach(user => {
            const isTrainer = user.type === 'trainer';
            const markerClass = isTrainer ? 'marker-trainer' : 'marker-friend';
            const badgeClass = isTrainer ? 'badge-trainer' : 'badge-friend';

            const markerHtml = `
                <div class="custom-user-marker ${markerClass}" data-user-id="${user.id}">
                    <div class="marker-avatar-wrap ${markerClass}">
                        <div class="marker-avatar-inner">
                            ${user.profilePhoto ? `<img src="${escapeHtml(user.profilePhoto)}" alt="${escapeHtml(user.username)}" onerror="this.remove()">` : ''}
                            <span>${escapeHtml(user.avatarLetters)}</span>
                        </div>
                        <span class="marker-type-badge ${badgeClass}"></span>
                    </div>
                    <div class="marker-pin-tip"></div>
                </div>
            `;

            const icon = window.L.divIcon({
                html: markerHtml,
                className: 'custom-leaflet-marker',
                iconSize: [42, 48],
                iconAnchor: [21, 48],
                popupAnchor: [0, -48]
            });

            const marker = window.L.marker([user.latitude, user.longitude], { icon });

            // Popup İçeriği (Madde 12)
            const popupContent = createPopupHtml(user);
            marker.bindPopup(popupContent, { maxWidth: 280 });

            marker.on('click', () => {
                focusUserCard(user.id);
            });

            markersLayerGroup.addLayer(marker);
        });
    }

    // =========================================================
    // 12. POPUP BİLGİ KARTI HTML (Marker'a Tıklama)
    // =========================================================
    function createPopupHtml(user) {
        const isTrainer = user.type === 'trainer';
        const badgeClass = isTrainer ? 'badge-trainer' : 'badge-friend';
        const avatarClass = isTrainer ? 'avatar-trainer' : 'avatar-friend';

        return `
            <div class="map-popup-card">
                <div class="popup-card-header">
                    <div class="popup-avatar ${avatarClass}">
                        ${escapeHtml(user.avatarLetters)}
                    </div>
                    <div class="popup-user-meta">
                        <strong class="popup-username">@${escapeHtml(user.username)}</strong>
                        <div class="popup-fullname">${escapeHtml(user.fullname)}</div>
                        <span class="popup-badge ${badgeClass}">
                            ${isTrainer ? ICONS.star : ICONS.user}
                            ${escapeHtml(user.typeTitle)}
                        </span>
                    </div>
                </div>

                <div class="popup-distance-row">
                    ${ICONS.mapPin}
                    <span>Uzaklık:</span>
                    <strong class="popup-distance-val">${escapeHtml(user.distance)}</strong>
                </div>

                <button type="button" class="popup-btn-profile" onclick="window.__fitnessMapOpenProfile(${user.id})">
                    <span>Profili Gör</span>
                    ${ICONS.arrowRight}
                </button>
            </div>
        `;
    }

    // =========================================================
    // 15. YAKIN KİŞİLER LİSTESİ RENDER
    // =========================================================
    function renderNearbyUsers() {
        if (!nearbyUsersGrid) return;

        const filtered = mapUsers.filter(user => {
            if (currentFilter === 'all') return true;
            return user.type === currentFilter;
        });

        if (filtered.length === 0) {
            showEmptyState(true);
            return;
        }

        nearbyUsersGrid.innerHTML = filtered.map(user => {
            const isTrainer = user.type === 'trainer';
            const badgeClass = isTrainer ? 'badge-trainer' : 'badge-friend';
            const avatarClass = isTrainer ? 'card-avatar-trainer' : 'card-avatar-friend';

            return `
                <article class="user-card" id="userCard-${user.id}">
                    <div class="user-card-top">
                        <div class="user-card-avatar ${avatarClass}">
                            ${escapeHtml(user.avatarLetters)}
                        </div>
                        <div class="user-card-details">
                            <h3 class="user-card-username">@${escapeHtml(user.username)}</h3>
                            <p class="user-card-fullname">${escapeHtml(user.fullname)} • ${escapeHtml(user.roleDescription)}</p>
                            <div class="user-card-badges">
                                <span class="popup-badge ${badgeClass}">
                                    ${isTrainer ? ICONS.star : ICONS.user}
                                    ${escapeHtml(user.typeTitle)}
                                </span>
                                <span class="user-card-distance">
                                    ${ICONS.mapPin}
                                    ${escapeHtml(user.distance)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div class="user-card-actions">
                        <button type="button" class="btn-card-map" data-focus-id="${user.id}">
                            ${ICONS.mapPin}
                            <span>Haritada Gör</span>
                        </button>
                        <button type="button" class="btn-card-profile" data-profile-id="${user.id}">
                            <span>Profili Gör</span>
                        </button>
                    </div>
                </article>
            `;
        }).join('');

        // Kart içi buton dinleyicileri
        nearbyUsersGrid.querySelectorAll('.btn-card-map').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = Number(e.currentTarget.dataset.focusId);
                focusUser(id);
            });
        });

        nearbyUsersGrid.querySelectorAll('.btn-card-profile').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = Number(e.currentTarget.dataset.profileId);
                showUserInfo(id);
            });
        });

        if (activeFilterCountBadge) {
            activeFilterCountBadge.textContent = `${filtered.length} Kişi Listeleniyor`;
        }
    }

    // =========================================================
    // HARİTALAR.PNG SOL MENÜ: YEŞİL KULLANICI PİLL BUTONLARI
    // =========================================================
    function renderSidebarQuickUsers() {
        if (!sidebarQuickUsers) return;

        // İlk 3 veya 4 kişiyi Haritalar.png'deki gibi göster
        const quickSlice = mapUsers.slice(0, 4);

        sidebarQuickUsers.innerHTML = quickSlice.map(user => {
            return `
                <button type="button" class="btn-user-pill" data-pill-id="${user.id}" title="${escapeHtml(user.fullname)} (@${escapeHtml(user.username)})">
                    <div class="btn-user-pill-avatar">
                        ${escapeHtml(user.avatarLetters)}
                    </div>
                    <div class="btn-user-pill-info">
                        <span class="btn-user-pill-username">@${escapeHtml(user.username)}</span>
                        <span class="btn-user-pill-meta">${escapeHtml(user.typeTitle)} • ${escapeHtml(user.distance)}</span>
                    </div>
                </button>
            `;
        }).join('');

        sidebarQuickUsers.querySelectorAll('.btn-user-pill').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = Number(e.currentTarget.dataset.pillId);
                focusUser(id);
                // Mobildeyse sidebar'ı kapat
                if (window.innerWidth <= 960) {
                    sidebar?.classList.remove('is-open');
                    sidebarOverlay?.classList.remove('is-active');
                    document.body.style.overflow = '';
                }
            });
        });
    }

    // =========================================================
    // 23. JAVASCRIPT MANTIĞI: filterUsers(type) (Madde 14)
    // =========================================================
    function filterUsers(type) {
        currentFilter = type;

        filterButtons.forEach(btn => {
            const matches = btn.dataset.filter === type;
            btn.classList.toggle('active', matches);
            btn.setAttribute('aria-pressed', matches ? 'true' : 'false');
        });

        renderUserMarkers();
        renderNearbyUsers();
    }

    // =========================================================
    // 23. JAVASCRIPT MANTIĞI: focusUser(userId) & centerOnUser()
    // =========================================================
    function focusUser(userId) {
        const user = mapUsers.find(u => u.id === userId);
        if (!user) return;

        if (isLeafletReady && mapInstance) {
            mapInstance.flyTo([user.latitude, user.longitude], 16, {
                animate: true,
                duration: 1.2
            });

            // İlgili marker'ın popup'ını aç
            markersLayerGroup?.eachLayer(layer => {
                const latLng = layer.getLatLng();
                if (
                    Math.abs(latLng.lat - user.latitude) < 0.00001 &&
                    Math.abs(latLng.lng - user.longitude) < 0.00001
                ) {
                    layer.openPopup();
                }
            });
        }

        focusUserCard(userId);
    }

    function focusUserCard(userId) {
        // Kartı vurgula ve ekran kaydır
        const card = document.getElementById(`userCard-${userId}`);
        if (card) {
            document.querySelectorAll('.user-card').forEach(c => c.style.borderColor = '');
            card.style.borderColor = 'var(--primary)';
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    function centerOnUser() {
        if (isLeafletReady && mapInstance) {
            mapInstance.flyTo([userLocation.lat, userLocation.lng], 15, {
                animate: true,
                duration: 1
            });
            userMarkerInstance?.openPopup();
        }
    }

    // =========================================================
    // 7. TARAYICI KONUMU İSTEĞİ (navigator.geolocation)
    // =========================================================
    let locationRequestInProgress = false;
    const LOCATION_MIN_LOADING_MS = 600;

    function setLocationButtonsLoading(loading) {
        [btnRequestLocationHeader, btnBannerRetry].forEach(btn => {
            if (!btn) return;
            btn.disabled = loading;
            btn.classList.toggle('is-loading', loading);
        });
        if (btnLocationText) {
            btnLocationText.textContent = loading ? "Konum alınıyor..." : "Konum İzni Tekrar İste";
        }
    }

    function requestUserLocation(showBannerOnSuccess = true) {
        if (!navigator.geolocation) {
            handleLocationError({ code: 0, message: "Tarayıcınız konum servisini desteklemiyor." });
            return;
        }

        // Çift tıklama koruması
        if (locationRequestInProgress) {
            console.log("[Haritalar] Konum isteği zaten devam ediyor, yoksayıldı.");
            return;
        }
        locationRequestInProgress = true;

        // Loading state göster
        setLocationButtonsLoading(true);

        // Banner'ı gizle
        if (locationBanner) {
            locationBanner.style.display = 'none';
        }

        console.log("[Haritalar] Konum izni isteniyor...");
        const startedAt = Date.now();

        const finishWith = (cb) => {
            const elapsed = Date.now() - startedAt;
            const wait = Math.max(0, LOCATION_MIN_LOADING_MS - elapsed);
            setTimeout(() => {
                cb();
                locationRequestInProgress = false;
                setLocationButtonsLoading(false);
            }, wait);
        };

        navigator.geolocation.getCurrentPosition(
            (pos) => finishWith(() => handleLocationSuccess(pos, showBannerOnSuccess)),
            (err) => finishWith(() => handleLocationError(err)),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }

    function handleLocationSuccess(pos, showFeedback) {
        // Buton metnini geri al
        if (btnLocationText) btnLocationText.textContent = "Konum İzni Tekrar İste";

        userLocation = {
            lat: Number(pos.coords.latitude.toFixed(6)),
            lng: Number(pos.coords.longitude.toFixed(6)),
            isCustom: true
        };

        // Banner'ı gizle
        if (locationBanner) {
            locationBanner.classList.remove('location-banner--denied');
            locationBanner.style.display = 'none';
        }

        // Kayıtlı kullanıcılar varsa konumlarına göre mesafelerini güncelle, 
        if (rawApiUsers && rawApiUsers.length > 0) {
            fetchRegisteredLocations();
        }

        // Haritayı güncelle
        if (isLeafletReady && mapInstance) {
            renderUserLocationMarker();
            renderUserMarkers();
            centerOnUser();
        }

        // Başarı bildirimi
        if (showFeedback && window.GlobalModal && typeof window.GlobalModal.alert === 'function') {
            window.GlobalModal.alert({
                type: 'success',
                title: 'Konum Güncellendi',
                message: 'Harita anlık konumunuza göre başarıyla güncellendi.'
            });
        }
    }

    function handleLocationError(err) {
        // Buton metnini geri al
        if (btnLocationText) btnLocationText.textContent = "Konum İzni Tekrar İste";

        let message = "";
        const isDenied = err && err.code === 1;
        const isUnavailable = err && err.code === 2;
        const isTimeout = err && err.code === 3;

        if (isDenied) {
            message = "Konum izni tarayıcı ayarlarından engellenmiş. Lütfen tarayıcı site ayarlarından konum iznini açın.";
        } else if (isUnavailable) {
            message = "Konum bilgisi alınamadı. Lütfen konum izinlerinizi kontrol edip tekrar deneyin.";
        } else if (isTimeout) {
            message = "Konum alımı zaman aşımına uğradı. Lütfen tekrar deneyin.";
        } else if (err && err.code === 0) {
            message = "Tarayıcınız konum servisini desteklemiyor.";
        } else {
            message = "Konum alınamadı. Lütfen konum izinlerinizi kontrol edip tekrar deneyin.";
        }

        // Banner'ı göster
        if (locationBanner && locationBannerText) {
            locationBannerText.textContent = message;
            locationBanner.style.display = 'flex';
            if (isDenied) {
                locationBanner.classList.remove('location-banner--denied');
                void locationBanner.offsetWidth;
                locationBanner.classList.add('location-banner--denied');
            } else {
                locationBanner.classList.remove('location-banner--denied');
            }
        }
    }

    // =========================================================
    // 13. PROFİLİ GÖR BUTONU & MODAL (Madde 12, 13)
    // =========================================================
    function showUserInfo(userId) {
        const user = mapUsers.find(u => u.id === userId);
        if (!user) return;

        if (window.GlobalModal && typeof window.GlobalModal.open === 'function') {
            const isTrainer = user.type === 'trainer';

            const modalHtml = `
                <div style="display: flex; flex-direction: column; gap: 16px;">
                    <div style="display: flex; align-items: center; gap: 14px; background: var(--surface); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border);">
                        <div style="width: 52px; height: 52px; border-radius: 50%; background: var(--card); border: 2px solid ${isTrainer ? 'var(--trainer)' : 'var(--friend)'}; display: grid; place-items: center; font-size: 18px; font-weight: 800; color: var(--text);">
                            ${escapeHtml(user.avatarLetters)}
                        </div>
                        <div>
                            <strong style="font-size: 16px; color: var(--text); display: block;">${escapeHtml(user.fullname)}</strong>
                            <span style="font-size: 13px; color: var(--primary); font-weight: 700;">@${escapeHtml(user.username)}</span>
                            <div style="font-size: 12px; color: var(--secondary); margin-top: 2px;">${escapeHtml(user.roleDescription)}</div>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div style="background: var(--surface); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border);">
                            <span style="font-size: 11px; color: var(--muted); text-transform: uppercase; font-weight: 700; display: block;">Mesafe</span>
                            <strong style="font-size: 14px; color: var(--primary);">${escapeHtml(user.distance)}</strong>
                        </div>
                        <div style="background: var(--surface); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border);">
                            <span style="font-size: 11px; color: var(--muted); text-transform: uppercase; font-weight: 700; display: block;">Üyelik Türü</span>
                            <strong style="font-size: 14px; color: ${isTrainer ? 'var(--trainer)' : 'var(--friend)'};">${escapeHtml(user.typeTitle)}</strong>
                        </div>
                    </div>

                    <div style="background: var(--surface); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border);">
                        <span style="font-size: 11px; color: var(--muted); text-transform: uppercase; font-weight: 700; display: block; margin-bottom: 6px;">Hakkında</span>
                        <p style="font-size: 13px; color: var(--secondary); line-height: 1.5; margin: 0;">${escapeHtml(user.bio)}</p>
                    </div>
                </div>
            `;

            window.GlobalModal.open({
                type: 'info',
                title: `@${user.username} Profili`,
                description: `${user.typeTitle} Detay Bilgisi`,
                html: modalHtml,
                buttons: [
                    {
                        text: 'Kapat',
                        variant: 'secondary',
                        closeOnClick: true
                    },
                    {
                        text: 'Mesaj Gönder',
                        variant: 'primary',
                        closeOnClick: true,
                        callback: () => {
                            window.location.href = `Mesajlar.html?user=${encodeURIComponent(user.username)}`;
                        }
                    }
                ]
            });
        } else {
            window.location.href = `Profile.html?user=${encodeURIComponent(user.username)}`;
        }
    }

    // Leaflet Popup içinden çağrı için global köprü
    window.__fitnessMapOpenProfile = (userId) => {
        showUserInfo(userId);
    };

    // =========================================================
    // 17. BOŞ DURUM & 19. LOADING
    // =========================================================
    function showLoading(show) {
        if (!mapLoadingOverlay) return;
        mapLoadingOverlay.style.display = show ? 'flex' : 'none';
    }

    function showEmptyState(isFilterEmpty = true) {
        if (!nearbyUsersGrid) return;

        nearbyUsersGrid.innerHTML = `
            <div class="empty-users-box">
                <div class="empty-users-icon">
                    ${ICONS.empty}
                </div>
                <h3 class="empty-users-title">Bu kategoride yakınında kimse bulunmuyor.</h3>
                <p class="empty-users-subtitle">Seçili filtreye ait kayıtlı sporcu veya antrenör bulunamadı. Tüm kişileri incelemek için filtreyi sıfırlayabilirsiniz.</p>
                <button type="button" class="filter-btn active" id="btnResetMapFilter">
                    Tüm Kişileri Göster
                </button>
            </div>
        `;

        document.getElementById('btnResetMapFilter')?.addEventListener('click', () => {
            filterUsers('all');
        });

        if (activeFilterCountBadge) {
            activeFilterCountBadge.textContent = '0 Kişi Listeleniyor';
        }
    }

    function showError(message) {
        if (locationBanner && locationBannerText) {
            locationBannerText.textContent = message || "Konum bilgileri yüklenirken bir hata oluştu.";
            locationBanner.style.display = 'flex';
        } else if (window.GlobalModal && typeof window.GlobalModal.alert === 'function') {
            window.GlobalModal.alert({
                type: 'error',
                title: 'Hata',
                message: message || "Bir hata oluştu."
            });
        }
    }

    // Leaflet CDN kapalıysa çalışan modern SVG yedek radar haritası
    function renderMapFallback(container) {
        container.innerHTML = `
            <div style="position: relative; width: 100%; height: 100%; display: grid; place-items: center; background: radial-gradient(circle, #131c16 0%, #0b0f0d 75%); overflow: hidden;">
                <!-- Radar Çizgileri -->
                <div style="position: absolute; width: 280px; height: 280px; border: 1px dashed rgba(34, 197, 94, 0.2); border-radius: 50%;"></div>
                <div style="position: absolute; width: 180px; height: 180px; border: 1px solid rgba(34, 197, 94, 0.25); border-radius: 50%;"></div>
                
                <!-- Merkez Sen -->
                <div style="position: absolute; width: 18px; height: 18px; border-radius: 50%; background: var(--primary); border: 3px solid #fff; box-shadow: 0 0 16px var(--primary); z-index: 5;"></div>
                <span style="position: absolute; margin-top: 36px; background: rgba(0,0,0,0.8); border: 1px solid var(--primary); border-radius: 99px; padding: 2px 8px; font-size: 11px; font-weight: 700; color: var(--primary);">Sen</span>

                <!-- Harita Kullanıcıları -->
                <div style="position: absolute; transform: translate(60px, -50px); text-align: center; cursor: pointer;" onclick="window.__fitnessMapOpenProfile(1)">
                    <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--card); border: 2px solid var(--friend); color: var(--friend); font-size: 11px; font-weight: 800; display: grid; place-items: center; margin: 0 auto;">MY</div>
                    <span style="font-size: 10px; color: var(--text); background: rgba(0,0,0,0.7); padding: 1px 4px; border-radius: 4px;">@fitness_master</span>
                </div>
                <div style="position: absolute; transform: translate(-80px, 45px); text-align: center; cursor: pointer;" onclick="window.__fitnessMapOpenProfile(4)">
                    <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--card); border: 2px solid var(--trainer); color: var(--trainer); font-size: 11px; font-weight: 800; display: grid; place-items: center; margin: 0 auto;">AE</div>
                    <span style="font-size: 10px; color: var(--text); background: rgba(0,0,0,0.7); padding: 1px 4px; border-radius: 4px;">@coach_ahmet</span>
                </div>
            </div>
        `;
    }

    // =========================================================
    // SAYAÇLAR VE KULLANICI BİLGİSİ
    // =========================================================
    function updateCounters() {
        const total = mapUsers.length;
        const friends = mapUsers.filter(u => u.type === 'friend').length;
        const trainers = mapUsers.filter(u => u.type === 'trainer').length;

        if (filterCountAll) filterCountAll.textContent = total;
        if (filterCountFriend) filterCountFriend.textContent = friends;
        if (filterCountTrainer) filterCountTrainer.textContent = trainers;
        if (sidebarNearbyCount) sidebarNearbyCount.textContent = `${total} Kişi`;
    }

    function updateUserData() {
        if (!window.Auth || typeof window.Auth.getUser !== 'function') return;
        const user = window.Auth.getUser();
        if (!user) return;

        const usernameEl = document.getElementById('sidebarUsername');
        const roleEl = document.getElementById('sidebarUserRole');
        const avatarEl = document.getElementById('sidebarAvatar');

        const name = user.username || user.name || 'User';
        const role = user.role || 'User';

        if (usernameEl) usernameEl.textContent = name;
        if (roleEl) roleEl.textContent = `Rol: ${role}`;
        if (avatarEl) avatarEl.textContent = (name[0] || 'U').toUpperCase();
    }

    function escapeHtml(val) {
        if (val === null || val === undefined) return '';
        return String(val)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // =========================================================
    // EVENT BINDINGS
    // =========================================================
    function bindEvents() {
        // Filtre butonları
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.filter;
                filterUsers(type);
            });
        });

        // Konum butonları
        btnCenterOnUser?.addEventListener('click', centerOnUser);
        btnRequestLocationHeader?.addEventListener('click', () => requestUserLocation(true));
        btnBannerRetry?.addEventListener('click', () => requestUserLocation(true));

        // Hamburger Menü
        const openSidebar = () => {
            sidebar?.classList.add('is-open');
            sidebarOverlay?.classList.add('is-active');
            document.body.style.overflow = 'hidden';
            mobileMenuBtn?.setAttribute('aria-expanded', 'true');
        };

        const closeSidebar = () => {
            sidebar?.classList.remove('is-open');
            sidebarOverlay?.classList.remove('is-active');
            document.body.style.overflow = '';
            mobileMenuBtn?.setAttribute('aria-expanded', 'false');
        };

        mobileMenuBtn?.addEventListener('click', openSidebar);
        sidebarCloseBtn?.addEventListener('click', closeSidebar);
        sidebarOverlay?.addEventListener('click', closeSidebar);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && sidebar?.classList.contains('is-open')) {
                closeSidebar();
            }
        });
    }

    // =========================================================
    // BAŞLAT (INIT)
    // =========================================================
    document.addEventListener('DOMContentLoaded', initializeMapPage);

})();
