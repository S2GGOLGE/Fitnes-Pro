/**
 * ==========================================================================
 * FITNESS PRO - ADMIN PANEL KONTROL VE ETKİLEŞİM YÖNETİCİSİ
 * Raporlar/Tasarım/Admin Panel şablonlarına (1.png, 2.png, 3.png, 1 (2).png),
 * Renk Tema.pdf, Tipografi.pdf ve GlobalModalManager sistemine tam uyumlu.
 * ==========================================================================
 */

(function () {
    "use strict";

    // Sayfa Durumu
    const state = {
        currentView: "dashboard", // "dashboard" | "appeals" | "logs" | "system"
        appealCategory: "ban-appeals", // "ban-appeals" | "coach-appeals"
        logCategory: "ALL", // "ALL" | "Sistem" | "User" | "Başvuru" | "Admin İşlemleri" | "Genel"
        logLevel: "ALL", // "ALL" | "INFO" | "WARN" | "ERROR" | "SUCCESS"
        appeals: [],
        logs: [],
        logsBackendAvailable: false, // /api/logs başarıyla yüklendi mi?
        logsCurrentPage: 1,
        logsPageSize: 20,
        currentUser: null
    };

    // DOM Öğeleri
    const dom = {
        adminNavGroup: document.getElementById("adminNavGroup"),
        adminBackBtn: document.getElementById("adminBackBtn"),
        adminSidebar: document.getElementById("adminSidebar"),
        adminSidebarOverlay: document.getElementById("adminSidebarOverlay"),
        adminMenuToggle: document.getElementById("adminMenuToggle"),
        adminSidebarClose: document.getElementById("adminSidebarClose"),
        sidebarUsername: document.getElementById("sidebarUsername"),
        adminAvatar: document.getElementById("adminAvatar"),
        adminGreetingUsername: document.getElementById("adminGreetingUsername"),
        breadcrumbCurrent: document.getElementById("breadcrumbCurrent"),
        adminBreadcrumb: document.getElementById("adminBreadcrumb"),
        
        // Görünüm Bölümleri
        viewDashboard: document.getElementById("viewDashboard"),
        viewAppeals: document.getElementById("viewAppeals"),
        viewLogs: document.getElementById("viewLogs"),
        viewSystem: document.getElementById("viewSystem"),

        // Başvuru Tablosu & Filtreleri
        appealsTableBody: document.getElementById("appealsTableBody"),
        appealSearchInput: document.getElementById("appealSearchInput"),
        appealStatusFilter: document.getElementById("appealStatusFilter"),
        appealRefreshBtn: document.getElementById("appealRefreshBtn"),
        dashboardRecentAppeals: document.getElementById("dashboardRecentAppeals"),

        // Log Tablosu & Filtreleri
        logsTableBody: document.getElementById("logsTableBody"),
        logSearchInput: document.getElementById("logSearchInput"),
        logLevelFilter: document.getElementById("logLevelFilter"),
        logCategoryFilter: document.getElementById("logCategoryFilter"),
        logClearFiltersBtn: document.getElementById("logClearFiltersBtn"),
        logsPagination: document.getElementById("logsPagination"),
        logsPaginationInfo: document.getElementById("logsPaginationInfo"),
        logsPageNumbers: document.getElementById("logsPageNumbers"),
        logsPrevPage: document.getElementById("logsPrevPage"),
        logsNextPage: document.getElementById("logsNextPage"),
        logsPageSize: document.getElementById("logsPageSize"),

        // İstatistik Sayıcıları
        statUsersCount: document.getElementById("statUsersCount"),
        statPendingAppealsCount: document.getElementById("statPendingAppealsCount"),
        statBannedCount: document.getElementById("statBannedCount"),
        statSystemHealth: document.getElementById("statSystemHealth"),

        // Sistem Ayarları
        toggleMaintenanceMode: document.getElementById("toggleMaintenanceMode"),
        toggleUserRegistration: document.getElementById("toggleUserRegistration"),
        toggleAuditLog: document.getElementById("toggleAuditLog")
    };

    // =========================================================================
    // ÖRNEK VE YEDEK VERİLER
    // =========================================================================
    const MOCK_APPEALS = [
        {
            id: 101,
            username: "burak_fitness",
            type: "Ban Kaldırma Talepleri",
            date: "2026-09-09 14:32",
            reason: "Hatalı şifre denemesi sonucu hesabım kilitlendi, şifremi sıfırladım lütfen kilidi açın.",
            status: "Pending"
        },
        {
            id: 102,
            username: "caner_demir",
            type: "Coach Başvurular",
            date: "2026-09-09 11:20",
            reason: "5 yıllık fitness antrenörlüğü sertifikam bulunmaktadır, platformda koçluk yapmak istiyorum.",
            status: "Pending"
        },
        {
            id: 103,
            username: "selin_kaya",
            type: "Ban Kaldırma Talepleri",
            date: "2026-09-08 19:15",
            reason: "Yurtdışı seyahatim sırasında VPN kullandığım için hesabım şüpheli işlemden banlandı.",
            status: "Approved"
        },
        {
            id: 104,
            username: "mert_yildiz",
            type: "Coach Başvurular",
            date: "2026-09-08 16:45",
            reason: "Pilates ve fonksiyonel antrenman uzmanıyım, sporcu yetiştirme programım mevcut.",
            status: "Pending"
        },
        {
            id: 105,
            username: "ahmet_koc",
            type: "Ban Kaldırma Talepleri",
            date: "2026-09-07 10:04",
            reason: "Topluluk kurallarını ihlal eden içerik iddiası asılsızdır, tekrar değerlendirilmesini talep ediyorum.",
            status: "Rejected"
        },
        {
            id: 106,
            username: "zeynep_fit",
            type: "Coach Başvurular",
            date: "2026-09-06 22:30",
            reason: "Beslenme ve diyetetik mezunuyum, üyelerin beslenme takibini yapmak istiyorum.",
            status: "Approved"
        }
    ];

    // =========================================================================
    // BAŞLANGIÇ & KULLANICI BİLGİSİ
    // =========================================================================
    async function init() {
        if (!await ensureAdminAccess()) {
            return;
        }

        resolveUser();
        initTheme();
        initEventListeners();
        loadAppealsData();
        loadLogsData();

        renderView("dashboard");
        startLiveSystemSimulation();
    }

    async function ensureAdminAccess() {
        if (!window.Auth || !window.Auth.isAuthenticated()) {
            window.location.replace("Login.html");
            return false;
        }

        const isAdmin = await window.Auth.fetchAdminAccess();

        if (isAdmin) {
            return true;
        }

        showAccessDeniedAndRedirect();
        return false;
    }

    function showAccessDeniedAndRedirect() {
        const redirectToIndex = () => window.location.replace("index.html");

        if (!window.GlobalModal || typeof window.GlobalModal.alert !== "function") {
            redirectToIndex();
            return;
        }

        window.GlobalModal.alert({
            type: "warning",
            title: "Yetkisiz erişim",
            message: "Bu sayfayı görüntüleme yetkiniz bulunmuyor.",
            closeOnOverlay: false,
            closeOnEscape: false,
            closeButton: false,
            buttons: [{
                text: "Tamam",
                variant: "primary",
                callback: redirectToIndex
            }]
        });
    }

    function resolveUser() {
        let user = null;
        if (window.Auth && typeof window.Auth.getUser === "function") {
            user = window.Auth.getUser();
        }

        if (!user) {
            const stored = localStorage.getItem("fitness_pro_user");
            if (stored) {
                try { user = JSON.parse(stored); } catch (e) {}
            }
        }

        state.currentUser = user || { username: "Emre", role: "Admin" };
        const username = state.currentUser.username || "Admin";

        if (dom.sidebarUsername) dom.sidebarUsername.textContent = username;
        if (dom.adminGreetingUsername) dom.adminGreetingUsername.textContent = username;
    }

    // =========================================================================
    // TEMA YÖNETİMİ (Kullanıcı Tercihi: Dark veya Light)
    // =========================================================================
    function getPreferredTheme() {
        // 1. Kullanıcının kayıtlı tercihi (localStorage)
        const storedTheme = localStorage.getItem("fitness_pro_theme") || localStorage.getItem("theme");
        if (storedTheme === "dark" || storedTheme === "light") {
            return storedTheme;
        }

        // 2. Kullanıcı profilinde tema tercihi varsa
        if (state.currentUser && state.currentUser.theme) {
            return state.currentUser.theme;
        }

        // 3. Kullanıcının sistem/tarayıcı tercihi
        if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
            return "light";
        }

        // 4. Varsayılan tema (Dark)
        return "dark";
    }

    function initTheme() {
        // Kullanıcının belirlediği tema ile uygula
        const preferredTheme = getPreferredTheme();
        applyTheme(preferredTheme);

        // Kullanıcı başka bir sayfada (örn: Ayarlar) temasını değiştirirse anında senkronize et
        window.addEventListener("storage", (e) => {
            if (e.key === "fitness_pro_theme" || e.key === "theme") {
                if (e.newValue) {
                    applyTheme(e.newValue);
                }
            }
        });

        // Kullanıcı açık bir tercih seçmemişse sistem teması değişimlerini dinle
        if (!localStorage.getItem("fitness_pro_theme") && !localStorage.getItem("theme") && window.matchMedia) {
            window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", (e) => {
                applyTheme(e.matches ? "light" : "dark");
            });
        }
    }

    function applyTheme(theme) {
        const selected = (theme === "light") ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", selected);
        if (selected === "light") {
            document.body.classList.add("light-theme");
        } else {
            document.body.classList.remove("light-theme");
        }
    }

    // =========================================================================
    // RESPONSIVE MOBİL DRAWER YÖNETİMİ
    // =========================================================================
    function openMobileSidebar() {
        if (dom.adminSidebar) dom.adminSidebar.classList.add("is-open");
        if (dom.adminSidebarOverlay) dom.adminSidebarOverlay.classList.add("show");
        if (dom.adminMenuToggle) dom.adminMenuToggle.setAttribute("aria-expanded", "true");
        document.body.classList.add("admin-sidebar-open");
    }

    function closeMobileSidebar() {
        if (dom.adminSidebar) dom.adminSidebar.classList.remove("is-open");
        if (dom.adminSidebarOverlay) dom.adminSidebarOverlay.classList.remove("show");
        if (dom.adminMenuToggle) dom.adminMenuToggle.setAttribute("aria-expanded", "false");
        document.body.classList.remove("admin-sidebar-open");
    }

    // =========================================================================
    // GÖRÜNÜM GEÇİŞLERİ VE SOL MENÜ GÜNCELLEMESİ (1.png, 2.png, 3.png, 1(2).png)
    // =========================================================================
    function renderView(viewName, subParam = null) {
        state.currentView = viewName;
        closeMobileSidebar();

        if (dom.viewDashboard) dom.viewDashboard.style.display = "none";
        if (dom.viewAppeals) dom.viewAppeals.style.display = "none";
        if (dom.viewLogs) dom.viewLogs.style.display = "none";
        if (dom.viewSystem) dom.viewSystem.style.display = "none";

        renderSidebarNav(viewName, subParam);

        const username = state.currentUser?.username || "Admin";
        const titleEl = document.getElementById("adminGreetingTitle");
        const subtitleEl = document.getElementById("adminGreetingSubtitle");

        switch (viewName) {
            case "dashboard":
                if (dom.viewDashboard) dom.viewDashboard.style.display = "block";
                if (dom.breadcrumbCurrent) dom.breadcrumbCurrent.textContent = "Genel Bakış";
                if (titleEl) {
                    titleEl.innerHTML = `Merhaba Saygı Değer <span id="adminGreetingUsername">${escapeHtml(username)}</span> Admin Bey`;
                }
                if (subtitleEl) {
                    subtitleEl.textContent = "Yönetim paneline hoş geldiniz.";
                }
                renderDashboard();
                break;

            case "appeals":
                if (dom.viewAppeals) dom.viewAppeals.style.display = "block";
                if (subParam) state.appealCategory = subParam;
                if (dom.breadcrumbCurrent) dom.breadcrumbCurrent.textContent = `Başvurular / ${state.appealCategory === "ban-appeals" ? "Ban Kaldırma Talepleri" : "Coach Başvurular"}`;
                if (titleEl) {
                    titleEl.textContent = state.appealCategory === "ban-appeals" ? "Ban Kaldırma Talepleri" : "Coach Başvuruları";
                }
                if (subtitleEl) {
                    subtitleEl.textContent = "Kullanıcılardan gelen talepleri inceleyin, onaylayın veya reddedin.";
                }
                renderAppealsTable();
                break;

            case "logs":
                if (dom.viewLogs) dom.viewLogs.style.display = "block";
                if (subParam) {
                    state.logCategory = subParam;
                    if (dom.logCategoryFilter) dom.logCategoryFilter.value = subParam;
                }
                if (dom.breadcrumbCurrent) dom.breadcrumbCurrent.textContent = `Loglar / ${state.logCategory === "ALL" ? "Tümü" : state.logCategory}`;
                if (titleEl) {
                    titleEl.textContent = "Sistem & Güvenlik Denetim Günlüğü";
                }
                if (subtitleEl) {
                    subtitleEl.textContent = "Platformdaki tüm işlemler, oturum hareketleri ve güvenlik kayıtları.";
                }
                renderLogsTable();
                break;

            case "system":
                if (dom.viewSystem) dom.viewSystem.style.display = "block";
                if (dom.breadcrumbCurrent) dom.breadcrumbCurrent.textContent = "Sistem Durumu ve Yapılandırma";
                if (titleEl) {
                    titleEl.textContent = "Sistem Durumu & Güvenlik";
                }
                if (subtitleEl) {
                    subtitleEl.textContent = "Sunucu donanım kaynakları, API sağlığı ve güvenlik parametreleri.";
                }
                if (subParam) {
                    highlightSystemCard(subParam);
                }
                break;
        }

        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function renderSidebarNav(viewName, subParam) {
        if (!dom.adminNavGroup) return;
        dom.adminNavGroup.innerHTML = "";

        let buttons = [];

        if (viewName === "dashboard") {
            buttons = [
                { label: "Başvurular", action: () => renderView("appeals", "ban-appeals") },
                { label: "Loglar", action: () => renderView("logs", "ALL") },
                { label: "Sistem", action: () => renderView("system") }
            ];
        } else if (viewName === "appeals") {
            buttons = [
                { 
                    label: "Ban Kaldırma Talepleri", 
                    active: state.appealCategory === "ban-appeals",
                    action: () => {
                        state.appealCategory = "ban-appeals";
                        renderView("appeals", "ban-appeals");
                    }
                },
                { 
                    label: "Coach Başvurular", 
                    active: state.appealCategory === "coach-appeals",
                    action: () => {
                        state.appealCategory = "coach-appeals";
                        renderView("appeals", "coach-appeals");
                    }
                }
            ];
        } else if (viewName === "logs") {
            const logCats = ["Sistem", "User", "Başvuru", "Admin İşlemleri", "Genel"];
            buttons = logCats.map(cat => ({
                label: cat,
                active: state.logCategory === cat,
                action: () => {
                    state.logCategory = cat;
                    if (dom.logCategoryFilter) dom.logCategoryFilter.value = cat;
                    renderView("logs", cat);
                }
            }));
        } else if (viewName === "system") {
            buttons = [
                { label: "Sistem Durumu", action: () => highlightSystemCard("sysCardStatus") },
                { label: "Güvenlik", action: () => highlightSystemCard("sysCardSecurity") },
                { label: "Sistem Bilgileri", action: () => highlightSystemCard("sysCardInfo") },
                { label: "Sistem Ayarları", action: () => highlightSystemCard("sysCardSettings") }
            ];
        }

        buttons.forEach(btn => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = `admin-btn-pill ${btn.active ? "active" : ""}`;
            button.textContent = btn.label;
            button.addEventListener("click", btn.action);
            dom.adminNavGroup.appendChild(button);
        });
    }

    // =========================================================================
    // ETKİLEŞİMLER
    // =========================================================================
    function initEventListeners() {
        // Sol Üst Hamburger Menü Aç / Kapat
        if (dom.adminMenuToggle) {
            dom.adminMenuToggle.addEventListener("click", () => {
                const isOpen = dom.adminSidebar?.classList.contains("is-open");
                if (isOpen) {
                    closeMobileSidebar();
                } else {
                    openMobileSidebar();
                }
            });
        }

        // Mobilde Çarpı (Kapat) Butonu
        if (dom.adminSidebarClose) {
            dom.adminSidebarClose.addEventListener("click", closeMobileSidebar);
        }

        // Overlay'e Tıklayınca Kapat
        if (dom.adminSidebarOverlay) {
            dom.adminSidebarOverlay.addEventListener("click", closeMobileSidebar);
        }

        // ESC Tuşu ile Kapat
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && dom.adminSidebar?.classList.contains("is-open")) {
                closeMobileSidebar();
            }
        });

        // Geri Dön
        if (dom.adminBackBtn) {
            dom.adminBackBtn.addEventListener("click", () => {
                if (state.currentView !== "dashboard") {
                    renderView("dashboard");
                } else {
                    window.location.href = "index.html";
                }
            });
        }

        // Breadcrumb
        if (dom.adminBreadcrumb) {
            const homeSpan = dom.adminBreadcrumb.querySelector("span:first-child");
            if (homeSpan) {
                homeSpan.style.cursor = "pointer";
                homeSpan.title = "Genel Bakışa Dön";
                homeSpan.addEventListener("click", () => renderView("dashboard"));
            }
        }

        // Dashboard Stat Kartları
        document.querySelectorAll(".admin-stat-card").forEach(card => {
            card.addEventListener("click", () => {
                const navTarget = card.dataset.nav;
                const subParam = card.dataset.sub || card.dataset.logCat;
                if (navTarget) {
                    renderView(navTarget, subParam);
                }
            });
        });

        // Başvurular Arama & Filtreleme
        if (dom.appealSearchInput) {
            dom.appealSearchInput.addEventListener("input", () => renderAppealsTable());
        }
        if (dom.appealStatusFilter) {
            dom.appealStatusFilter.addEventListener("change", () => renderAppealsTable());
        }
        if (dom.appealRefreshBtn) {
            dom.appealRefreshBtn.addEventListener("click", () => {
                loadAppealsData(true);
            });
        }

        // Loglar Arama & Filtreleme
        if (dom.logSearchInput) {
            dom.logSearchInput.addEventListener("input", () => {
                state.logsCurrentPage = 1;
                renderLogsTable();
            });
        }
        if (dom.logLevelFilter) {
            dom.logLevelFilter.addEventListener("change", () => {
                state.logLevel = dom.logLevelFilter.value;
                state.logsCurrentPage = 1;
                renderLogsTable();
            });
        }
        if (dom.logCategoryFilter) {
            dom.logCategoryFilter.addEventListener("change", () => {
                state.logCategory = dom.logCategoryFilter.value;
                state.logsCurrentPage = 1;
                renderSidebarNav("logs", state.logCategory);
                renderLogsTable();
            });
        }
        if (dom.logClearFiltersBtn) {
            dom.logClearFiltersBtn.addEventListener("click", () => {
                if (dom.logSearchInput) dom.logSearchInput.value = "";
                if (dom.logLevelFilter) dom.logLevelFilter.value = "ALL";
                if (dom.logCategoryFilter) dom.logCategoryFilter.value = "ALL";
                state.logCategory = "ALL";
                state.logLevel = "ALL";
                state.logsCurrentPage = 1;
                renderSidebarNav("logs", "ALL");
                renderLogsTable();
            });
        }

        // Log Tablosu Sayfalama
        if (dom.logsPrevPage) {
            dom.logsPrevPage.addEventListener("click", () => {
                if (state.logsCurrentPage > 1) {
                    state.logsCurrentPage -= 1;
                    renderLogsTable();
                }
            });
        }
        if (dom.logsNextPage) {
            dom.logsNextPage.addEventListener("click", () => {
                state.logsCurrentPage += 1;
                renderLogsTable();
            });
        }
        if (dom.logsPageSize) {
            dom.logsPageSize.addEventListener("change", () => {
                const next = Math.max(1, Number(dom.logsPageSize.value) || 20);
                state.logsPageSize = next;
                state.logsCurrentPage = 1;
                renderLogsTable();
            });
        }

        // Sistem Ayarları Toggle Onayları (GlobalModal Confirm)
        if (dom.toggleMaintenanceMode) {
            dom.toggleMaintenanceMode.addEventListener("change", (e) => {
                const willEnable = e.target.checked;
                if (willEnable) {
                    // Bakım modunu açarken onay iste
                    e.preventDefault();
                    e.target.checked = false; // Kullanıcı onaylayana kadar kapalı tut

                    if (window.GlobalModal) {
                        window.GlobalModal.confirm({
                            title: "Bakım Modunu Açmak İstiyor musunuz?",
                            description: "Bakım modu etkinleştirildiğinde yöneticiler haricindeki tüm kullanıcıların platform erişimi geçici olarak durdurulur.",
                            onConfirm: () => {
                                dom.toggleMaintenanceMode.checked = true;
                                window.GlobalModal.alert({
                                    type: "warning",
                                    title: "Bakım Modu Aktif",
                                    message: "Sistem bakım moduna alındı. Yalnızca admin oturumları aktiftir."
                                });
                            }
                        });
                    } else {
                        dom.toggleMaintenanceMode.checked = true;
                    }
                } else {
                    // Bakım modu kapatıldı — backend'in bu aksiyonu kayıt altına
                    // alması beklenir; sayfayı yenilemek log listesini tazeler.
                }
            });
        }
    }

    // =========================================================================
    // VERİ YÜKLEME (API)
    // =========================================================================
    async function loadAppealsData(showToast = false) {
        let loadedFromApi = false;

        if (window.Auth && typeof window.Auth.authFetch === "function" && window.Auth.isAuthenticated()) {
            try {
                const res = await window.Auth.authFetch("/api/admin/ban-appeals");
                if (res && res.ok) {
                    const data = await res.json();
                    if (data && data.data && Array.isArray(data.data.items)) {
                        state.appeals = data.data.items.map(item => ({
                            id: item.id,
                            username: item.username,
                            type: "Ban Kaldırma Talepleri",
                            date: item.createdAt ? new Date(item.createdAt).toLocaleString("tr-TR") : "Bilinmiyor",
                            reason: item.appealReason || "Gerekçe belirtilmedi",
                            status: item.status || "Pending"
                        }));
                        state.appeals.push(...MOCK_APPEALS.filter(a => a.type === "Coach Başvurular"));
                        loadedFromApi = true;
                    }
                }
            } catch (err) {
                console.info("Backend API erişilemedi, zenginleştirilmiş yerel veri seti kullanılıyor.");
            }
        }

        if (!loadedFromApi) {
            state.appeals = [...MOCK_APPEALS];
        }

        updateDashboardCounts();
        if (state.currentView === "appeals") {
            renderAppealsTable();
        } else if (state.currentView === "dashboard") {
            renderDashboard();
        }

        if (showToast) {
            if (window.GlobalModal) {
                window.GlobalModal.alert({
                    type: "success",
                    title: "Liste Yenilendi",
                    message: "Başvurular ve durum sayaçları güncellendi."
                });
            }
        }
    }

    function updateDashboardCounts() {
        const pendingCount = state.appeals.filter(a => a.status === "Pending").length;
        if (dom.statPendingAppealsCount) dom.statPendingAppealsCount.textContent = pendingCount;
    }

    // =========================================================================
    // LOG VERİ YÜKLEME (Backend /api/logs endpoint'i)
    // =========================================================================
    //
    // Backend response yapısı (ApiResponseModel + GetLogModel):
    // {
    //   success / succes : boolean,
    //   data: {
    //     systemLogs:  SystemLogModel[],
    //     userLogs:    UserLogModel[],
    //     appealLogs:  AppealLogModel[],
    //     adminLogs:   AdminLogModel[],
    //     generalLogs: GeneralLogModel[]
    //   },
    //   error: object | null
    // }
    //
    // Not: Backend "succes" (C# tarafında yazım hatası) dönüyor.
    // Frontend hem "success" hem de "succes" anahtarını kabul eder.
    //
    // JWT: window.Auth.authFetch otomatik olarak "Authorization: Bearer {token}"
    // başlığını ekler; 401 durumunda mevcut auth sistemi logout akışını çalıştırır.
    //
    // Sahte veri (mock) FALLBACK'i YOKTUR. Backend bağlantısı kurulamazsa
    // kullanıcı "Sisteme Bağlanılamıyor" uyarısı görür.
    //
    async function loadLogsData() {
        let loadedFromApi = false;
        state.logs = [];
        state.logsBackendAvailable = false;
        state.logsCurrentPage = 1;

        if (
            window.Auth &&
            typeof window.Auth.authFetch === "function" &&
            window.Auth.isAuthenticated()
        ) {
            try {
                const res = await window.Auth.authFetch("/api/logs", { method: "GET" });
                if (res && res.ok) {
                    const payload = await res.json();
                    const isSuccess = payload && (payload.success === true || payload.succes === true);
                    if (isSuccess && payload.data) {
                        state.logs = mergeBackendLogsToState(payload.data);
                        state.logsBackendAvailable = true;
                        loadedFromApi = true;
                    } else if (payload && (payload.success === false || payload.succes === false)) {
                        showLogsBackendConnectionError(
                            "Backend log verilerini getirmedi: " + (payload.message || "bilinmeyen hata")
                        );
                    } else {
                        showLogsBackendConnectionError("Beklenmeyen API cevabı alındı.");
                    }
                } else if (res && res.status === 403) {
                    showLogsApiError("Bu sayfayı görüntülemek için Admin yetkisi gereklidir.");
                } else if (res && res.status === 404) {
                    showLogsBackendConnectionError("Log endpoint'i bulunamadı (HTTP 404).");
                } else if (res && res.status >= 500) {
                    showLogsBackendConnectionError(`Sunucu hatası (HTTP ${res.status}).`);
                } else if (res) {
                    showLogsBackendConnectionError(`Beklenmeyen yanıt (HTTP ${res.status}).`);
                }
            } catch (err) {
                console.info("[ADMIN LOGS] Backend erişilemedi:", err);
                showLogsBackendConnectionError("Backend servisine bağlanılamadı.");
            }
        } else {
            // Auth yoksa backend zaten çağrılamaz → bağlantı kurulamıyor
            showLogsBackendConnectionError("Aktif oturum bulunamadığı için backend çağrısı yapılamadı.");
        }

        if (!loadedFromApi) {
            state.logs = [];
            state.logsBackendAvailable = false;
        }

        if (state.currentView === "logs") {
            renderLogsTable();
        }
    }

    function mergeBackendLogsToState(data) {
        const out = [];

        const pushGroup = (arr, prefix, category) => {
            if (!Array.isArray(arr)) return;
            arr.forEach(item => out.push(buildLogEntry(prefix, item, category)));
        };

        pushGroup(data.systemLogs,  "sys", "Sistem");
        pushGroup(data.userLogs,    "usr", "User");
        pushGroup(data.appealLogs,  "app", "Başvuru");
        pushGroup(data.adminLogs,   "adm", "Admin İşlemleri");
        pushGroup(data.generalLogs, "gen", "Genel");

        return out;
    }

    function buildLogEntry(prefix, log, category) {
        if (!log || typeof log !== "object") return null;

        const backendId = pickField(log, "Id", "id");
        const message   = pickField(log, "Message", "message") || "";

        return {
            // UI için sanal id (5 farklı tablodan gelen Id çakışmasın diye prefix'li)
            id: `${prefix}_${backendId ?? Math.random().toString(36).slice(2)}`,

            // Tablo sütunları (mevcut UI yapısı korunur)
            time:     formatLogTime(pickField(log, "CreatedAt", "createdAt")),
            level:    pickField(log, "Level", "level") || "INFO",
            category: category,
            user:     resolveLogUser(prefix, log),
            message:  message,

            // Detay modalında gösterilecek ek alanlar
            source:        prefix,
            action:        pickField(log, "Action", "action") || "",
            ipAddress:     pickField(log, "IpAddress", "ipAddress") || null,
            userId:        pickField(log, "UserId", "userId") || null,
            appealId:      pickField(log, "AppealId", "appealId") || null,
            performedBy:   pickField(log, "PerformedBy", "performedBy") || null,
            targetUsername: pickField(log, "TargetUsername", "targetUsername") || null,
            adminUsername: pickField(log, "AdminUsername", "adminUsername") || null,
            logCategory:   pickField(log, "Category", "category") || null
        };
    }

    function pickField(obj, camel, lower) {
        if (!obj) return null;
        if (obj[camel] !== undefined && obj[camel] !== null) return obj[camel];
        if (obj[lower] !== undefined && obj[lower] !== null) return obj[lower];
        return null;
    }

    function resolveLogUser(prefix, log) {
        const fallback = (val, alt) =>
            (val === null || val === undefined || val === "") ? alt : val;

        switch (prefix) {
            case "sys": return fallback(pickField(log, "Source", "source"), "Sistem");
            case "usr": return fallback(pickField(log, "Username", "username"), "Kullanıcı");
            case "app": return fallback(pickField(log, "Username", "username"), "Bilinmiyor");
            case "adm": return fallback(pickField(log, "AdminUsername", "adminUsername"), "Admin");
            case "gen": return fallback(
                pickField(log, "Username", "username"),
                fallback(pickField(log, "Category", "category"), "Genel")
            );
            default: return "-";
        }
    }

    function formatLogTime(value) {
        if (!value) return "Bilinmiyor";
        // Backend ISO 8601 / "2026-09-10T01:04:12" gibi gönderebilir
        const d = new Date(value);
        if (!isNaN(d.getTime())) {
            return d.toLocaleString("tr-TR");
        }
        return String(value);
    }

    function showLogsApiError(message) {
        if (window.GlobalModal && typeof window.GlobalModal.alert === "function") {
            window.GlobalModal.alert({
                type: "error",
                title: "Loglar Yüklenemedi",
                message: message
            });
        } else {
            console.error("[ADMIN LOGS]", message);
        }
    }

    // Backend bağlantısı kurulamadığında çağrılır (ağ hatası / 5xx / 404 / boş cevap).
    function showLogsBackendConnectionError(detail) {
        const message =
            "Sisteme bağlanılamıyor. Log verileri backend'den alınamadı.\n\n" +
            "Lütfen backend servisinin çalıştığından emin olun ve sayfayı yenileyin.\n\n" +
            (detail ? "Detay: " + detail : "");

        if (window.GlobalModal && typeof window.GlobalModal.alert === "function") {
            window.GlobalModal.alert({
                type: "error",
                title: "Sisteme Bağlanılamıyor",
                message: message
            });
        } else {
            console.error("[ADMIN LOGS] Sisteme bağlanılamıyor:", detail);
        }
    }

    // =========================================================================
    // DASHBOARD İÇERİK RENDER (1.png)
    // =========================================================================
    function renderDashboard() {
        if (!dom.dashboardRecentAppeals) return;
        dom.dashboardRecentAppeals.innerHTML = "";

        const recent = state.appeals.slice(0, 4);

        if (recent.length === 0) {
            dom.dashboardRecentAppeals.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--admin-text-muted);">Henüz başvuru bulunmamaktadır.</td></tr>`;
            return;
        }

        recent.forEach(item => {
            const tr = document.createElement("tr");
            const typeShort = item.type === "Ban Kaldırma Talepleri" ? "Ban Talebi" : "Coach";
            tr.innerHTML = `
                <td><strong style="white-space: nowrap;">${escapeHtml(item.username)}</strong></td>
                <td><span class="admin-type-tag" title="${escapeHtml(item.type)}">${typeShort}</span></td>
                <td>${renderStatusBadge(item.status)}</td>
                <td style="text-align: right;">
                    <button type="button" class="admin-action-btn detail" onclick="window.AdminPanel.showAppealDetail(${item.id})">
                        İncele
                    </button>
                </td>
            `;
            dom.dashboardRecentAppeals.appendChild(tr);
        });
    }

    // =========================================================================
    // BAŞVURULAR TABLOSU (2.png)
    // =========================================================================
    function renderAppealsTable() {
        if (!dom.appealsTableBody) return;
        dom.appealsTableBody.innerHTML = "";

        const searchQuery = (dom.appealSearchInput?.value || "").toLowerCase().trim();
        const statusFilter = dom.appealStatusFilter?.value || "ALL";

        const filtered = state.appeals.filter(item => {
            const categoryMatch = (state.appealCategory === "ban-appeals" && item.type === "Ban Kaldırma Talepleri") ||
                                  (state.appealCategory === "coach-appeals" && item.type === "Coach Başvurular");

            const statusMatch = statusFilter === "ALL" || item.status === statusFilter;

            const searchMatch = !searchQuery ||
                item.username.toLowerCase().includes(searchQuery) ||
                item.reason.toLowerCase().includes(searchQuery);

            return categoryMatch && statusMatch && searchMatch;
        });

        if (filtered.length === 0) {
            dom.appealsTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="admin-empty-state">
                        <div>Aradığınız kriterlere uygun başvuru kaydı bulunamadı.</div>
                    </td>
                </tr>
            `;
            return;
        }

        filtered.forEach(item => {
            const tr = document.createElement("tr");
            
            const isPending = item.status === "Pending";
            const actionsHtml = isPending ? `
                <div class="admin-actions" style="justify-content: flex-end;">
                    <button type="button" class="admin-action-btn approve" onclick="window.AdminPanel.openDecisionModal(${item.id}, 'approve')">
                        Onayla
                    </button>
                    <button type="button" class="admin-action-btn reject" onclick="window.AdminPanel.openDecisionModal(${item.id}, 'reject')">
                        Reddet
                    </button>
                    <button type="button" class="admin-action-btn detail" onclick="window.AdminPanel.showAppealDetail(${item.id})">
                        Detay
                    </button>
                </div>
            ` : `
                <div class="admin-actions" style="justify-content: flex-end;">
                    <button type="button" class="admin-action-btn detail" onclick="window.AdminPanel.showAppealDetail(${item.id})">
                        Detay
                    </button>
                </div>
            `;

            tr.innerHTML = `
                <td><strong class="admin-caption">#${item.id}</strong></td>
                <td><strong>${escapeHtml(item.username)}</strong></td>
                <td><span class="admin-caption">${escapeHtml(item.type)}</span></td>
                <td><span class="admin-caption">${escapeHtml(item.date)}</span></td>
                <td style="max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(item.reason)}">
                    ${escapeHtml(item.reason)}
                </td>
                <td>${renderStatusBadge(item.status)}</td>
                <td>${actionsHtml}</td>
            `;

            dom.appealsTableBody.appendChild(tr);
        });
    }

    // =========================================================================
    // LOGLAR TABLOSU (3.png)
    // =========================================================================
    function getFilteredLogs() {
        const searchQuery = (dom.logSearchInput?.value || "").toLowerCase().trim();
        const levelFilter = state.logLevel;
        const categoryFilter = state.logCategory;

        const safeStr = (v) =>
            (v === null || v === undefined) ? "" : String(v).toLowerCase();

        return state.logs.filter(log => {
            const levelMatch = levelFilter === "ALL" || log.level === levelFilter;
            const catMatch = categoryFilter === "ALL" || log.category === categoryFilter;
            const searchMatch = !searchQuery ||
                safeStr(log.message).includes(searchQuery) ||
                safeStr(log.user).includes(searchQuery) ||
                safeStr(log.category).includes(searchQuery) ||
                safeStr(log.action).includes(searchQuery) ||
                safeStr(log.ipAddress).includes(searchQuery);

            return levelMatch && catMatch && searchMatch;
        });
    }

    function computePageWindow(current, total) {
        const out = [];
        const maxButtons = 5;

        if (total <= maxButtons + 2) {
            for (let i = 1; i <= total; i += 1) out.push(i);
            return out;
        }

        const left = Math.max(2, current - 1);
        const right = Math.min(total - 1, current + 1);

        out.push(1);
        if (left > 2) out.push("…");
        for (let i = left; i <= right; i += 1) out.push(i);
        if (right < total - 1) out.push("…");
        out.push(total);

        return out;
    }

    function renderLogsPagination(filteredCount) {
        if (!dom.logsPagination) return;

        const pageSize = Math.max(1, Number(state.logsPageSize) || 20);
        const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize));

        if (state.logsCurrentPage > totalPages) {
            state.logsCurrentPage = totalPages;
        }
        if (state.logsCurrentPage < 1) {
            state.logsCurrentPage = 1;
        }

        const currentPage = state.logsCurrentPage;
        const start = filteredCount === 0 ? 0 : ((currentPage - 1) * pageSize) + 1;
        const end = Math.min(filteredCount, currentPage * pageSize);

        if (dom.logsPaginationInfo) {
            dom.logsPaginationInfo.textContent = filteredCount === 0
                ? "Gösterilecek kayıt yok"
                : `${start}-${end} / ${filteredCount} kayıt`;
        }

        if (dom.logsPrevPage) {
            dom.logsPrevPage.disabled = currentPage <= 1;
        }
        if (dom.logsNextPage) {
            dom.logsNextPage.disabled = currentPage >= totalPages;
        }

        if (dom.logsPageNumbers) {
            dom.logsPageNumbers.innerHTML = "";
            const pages = computePageWindow(currentPage, totalPages);
            pages.forEach(item => {
                if (item === "…") {
                    const ellipsis = document.createElement("span");
                    ellipsis.className = "admin-pagination-ellipsis";
                    ellipsis.textContent = "…";
                    dom.logsPageNumbers.appendChild(ellipsis);
                    return;
                }
                const button = document.createElement("button");
                button.type = "button";
                button.className = "admin-pagination-page" + (item === currentPage ? " is-active" : "");
                button.textContent = String(item);
                button.setAttribute("aria-label", `Sayfa ${item}`);
                if (item === currentPage) {
                    button.setAttribute("aria-current", "page");
                    button.disabled = true;
                } else {
                    button.addEventListener("click", () => {
                        state.logsCurrentPage = item;
                        renderLogsTable();
                    });
                }
                dom.logsPageNumbers.appendChild(button);
            });
        }

        const hidePagination = filteredCount === 0 || state.logsBackendAvailable === false;
        dom.logsPagination.hidden = hidePagination;
    }

    function renderLogsTable() {
        if (!dom.logsTableBody) return;
        dom.logsTableBody.innerHTML = "";

        // Backend bağlantısı kurulamamışsa tabloyu uyarı satırı ile kilitle.
        if (state.logsBackendAvailable === false) {
            dom.logsTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="admin-empty-state">
                        <div style="display: flex; align-items: center; justify-content: center; gap: 8px; color: var(--admin-warning); font-weight: 600;">
                            <span aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg></span>
                            <span>Sisteme bağlanılamıyor. Log verileri gösterilemiyor.</span>
                        </div>
                        <div style="margin-top: 6px; font-size: 12px; color: var(--admin-text-muted);">
                            Lütfen backend servisinin çalıştığından emin olun ve sayfayı yenileyin.
                        </div>
                    </td>
                </tr>
            `;
            renderLogsPagination(0);
            return;
        }

        const filtered = getFilteredLogs();

        if (filtered.length === 0) {
            dom.logsTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="admin-empty-state">
                        <div>Seçilen kriterlere uygun log kaydı bulunamadı.</div>
                    </td>
                </tr>
            `;
            renderLogsPagination(0);
            return;
        }

        const pageSize = Math.max(1, Number(state.logsPageSize) || 20);
        const startIndex = (state.logsCurrentPage - 1) * pageSize;
        const pageItems = filtered.slice(startIndex, startIndex + pageSize);

        pageItems.forEach(log => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><span class="admin-caption">${escapeHtml(log.time || "Bilinmiyor")}</span></td>
                <td>${renderLogLevelBadge(log.level)}</td>
                <td><strong>${escapeHtml(log.category || "-")}</strong></td>
                <td><span class="admin-body-sm">${escapeHtml(log.user || "-")}</span></td>
                <td style="max-width: 400px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(log.message || "")}">${escapeHtml(log.message || "")}</td>
                <td>
                    <button type="button" class="admin-action-btn detail" onclick="window.AdminPanel.showLogDetail('${log.id}')">
                        İncele
                    </button>
                </td>
            `;
            dom.logsTableBody.appendChild(tr);
        });

        renderLogsPagination(filtered.length);
    }

    // =========================================================================
    // MERKEZİ MODAL ENTEGRASYONU (GlobalModalManager.js)
    // =========================================================================

    /**
     * Başvuru Karar Modalı (Onay / Ret):
     * Harici GlobalModal altyapısı kullanılarak kullanıcı adı, gerekçe ve yönetici notu alanı açılır.
     */
    function openDecisionModal(id, action) {
        const item = state.appeals.find(a => a.id === id);
        if (!item || !window.GlobalModal) return;

        const isApprove = action === "approve";
        const title = isApprove ? "Başvuruyu Onayla" : "Başvuruyu Reddet";
        const type = isApprove ? "success" : "delete";

        const contentHtml = `
            <div class="global-modal-card-box">
                <div style="font-size: 12px; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Kullanıcı Talebi</div>
                <div style="margin-top: 6px; font-size: 14px; line-height: 20px; color: var(--text);">
                    "${escapeHtml(item.reason)}"
                </div>
            </div>

            <div class="global-modal-field">
                <label for="adminDecisionNoteInput" class="global-modal-label">
                    Yönetici Karar Notu (${isApprove ? "Opsiyonel" : "Gerekçe Giriniz"}):
                </label>
                <textarea id="adminDecisionNoteInput" class="global-modal-textarea" rows="3" placeholder="${isApprove ? "Kullanıcıya iletilecek onay notu..." : "Başvurunun reddedilme sebebini yazınız..."}"></textarea>
            </div>
        `;

        window.GlobalModal.open({
            type: type,
            title: title,
            description: `${item.username} kullanıcısının "${item.type}" başvurusu için karar vermek üzeresiniz.`,
            content: contentHtml,
            size: "default",
            buttons: [
                {
                    text: "Vazgeç",
                    className: "global-modal-button-secondary",
                    closeOnClick: true
                },
                {
                    id: "btnModalConfirmDecision",
                    text: isApprove ? "Onayla ve Kilidi Aç" : "Başvuruyu Reddet",
                    className: isApprove ? "global-modal-button-primary" : "global-modal-button-danger",
                    closeOnClick: false,
                    callback: async () => {
                        const noteInput = document.getElementById("adminDecisionNoteInput");
                        const note = noteInput ? noteInput.value.trim() : "";

                        // Butonu loading durumuna al
                        window.GlobalModal.setLoading("btnModalConfirmDecision", true);

                        // Backend API dene
                        if (window.Auth && typeof window.Auth.authFetch === "function") {
                            try {
                                const endpoint = isApprove ? `/api/admin/ban-appeals/${id}/approve` : `/api/admin/ban-appeals/${id}/reject`;
                                await window.Auth.authFetch(endpoint, {
                                    method: "POST",
                                    body: JSON.stringify({ adminNote: note })
                                });
                            } catch (err) {
                                console.info("Backend API çağrısı offline, yerel veri güncellendi.");
                            }
                        }

                        // Yerel durumu güncelle
                        item.status = isApprove ? "Approved" : "Rejected";

                        // Log ekle
                        state.logs.unshift({
                            id: Date.now(),
                            time: new Date().toLocaleString("tr-TR"),
                            level: isApprove ? "SUCCESS" : "WARN",
                            category: "Admin İşlemleri",
                            user: `${state.currentUser.username} (Yönetici)`,
                            message: `${item.username} kullanıcısının başvurusu ${isApprove ? "onaylandı" : "reddedildi"}. Not: ${note || "Belirtilmedi."}`
                        });

                        window.GlobalModal.close();
                        updateDashboardCounts();
                        renderAppealsTable();

                        // Başarı bildirimi modalı
                        setTimeout(() => {
                            window.GlobalModal.alert({
                                type: isApprove ? "success" : "warning",
                                title: isApprove ? "Başvuru Onaylandı" : "Başvuru Reddedildi",
                                message: `${item.username} kullanıcısının başvurusu başarıyla ${isApprove ? "onaylandı ve hesabı açıldı." : "reddedildi."}`
                            });
                        }, 200);
                    }
                }
            ]
        });
    }

    /**
     * Başvuru Detay Modalı (Harici GlobalModal ile)
     */
    function showAppealDetail(id) {
        const item = state.appeals.find(a => a.id === id);
        if (!item || !window.GlobalModal) return;

        const isPending = item.status === "Pending";

        const contentHtml = `
            <div style="display: flex; flex-direction: column; gap: 12px; font-size: 14px;">
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border); padding-bottom: 8px;">
                    <span style="color: var(--text-muted);">Kullanıcı Adı:</span>
                    <strong>${escapeHtml(item.username)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border); padding-bottom: 8px;">
                    <span style="color: var(--text-muted);">Başvuru Türü:</span>
                    <span>${escapeHtml(item.type)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border); padding-bottom: 8px;">
                    <span style="color: var(--text-muted);">Tarih:</span>
                    <span>${escapeHtml(item.date)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border); padding-bottom: 8px;">
                    <span style="color: var(--text-muted);">Mevcut Durum:</span>
                    ${renderStatusBadge(item.status)}
                </div>
                
                <div class="global-modal-card-box">
                    <div style="font-size: 12px; color: var(--text-muted); text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Başvuru Açıklaması</div>
                    <div style="color: var(--text); line-height: 22px;">
                        ${escapeHtml(item.reason)}
                    </div>
                </div>
            </div>
        `;

        const buttons = [];

        if (isPending) {
            buttons.push(
                {
                    text: "✓ Onayla",
                    className: "global-modal-button-primary",
                    closeOnClick: true,
                    callback: () => {
                        setTimeout(() => openDecisionModal(item.id, "approve"), 200);
                    }
                },
                {
                    text: "✕ Reddet",
                    className: "global-modal-button-danger",
                    closeOnClick: true,
                    callback: () => {
                        setTimeout(() => openDecisionModal(item.id, "reject"), 200);
                    }
                },
                {
                    text: "Kapat",
                    className: "global-modal-button-secondary",
                    closeOnClick: true
                }
            );
        } else {
            buttons.push({
                text: "Kapat",
                className: "global-modal-button-primary",
                closeOnClick: true
            });
        }

        window.GlobalModal.open({
            type: "info",
            title: `Başvuru Bilgisi (#${item.id})`,
            description: `${item.username} kullanıcısına ait başvuru kaydı.`,
            content: contentHtml,
            buttons: buttons
        });
    }

    /**
     * Log Detayı Modalı (Harici GlobalModal ile)
     * Backend'den gelen tüm opsiyonel alanlar (IpAddress, Action,
     * UserId, AppealId, PerformedBy, TargetUsername, AdminUsername,
     * Category) güvenli şekilde gösterilir.
     */
    function showLogDetail(logId) {
        const log = state.logs.find(l => l.id === logId);
        if (!log || !window.GlobalModal) return;

        const modalType = log.level === "ERROR" ? "error" : (log.level === "WARN" ? "warning" : (log.level === "SUCCESS" ? "success" : "info"));

        const safe = (v, fallback) =>
            (v === null || v === undefined || v === "") ? fallback : escapeHtml(String(v));

        const detailRow = (label, value) => value === null || value === undefined || value === ""
            ? ""
            : `
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border); padding-bottom: 8px;">
                    <span style="color: var(--text-muted);">${escapeHtml(label)}:</span>
                    <span>${value}</span>
                </div>
            `;

        // Backend kaynak tipine göre hangi ek alanlar gösterilecek
        const source = log.source || "";
        const extraRows = [
            detailRow("Eylem (Action)",     safe(log.action,        "—")),
            detailRow("IP Adresi",          safe(log.ipAddress,     "—")),
            detailRow("Kullanıcı ID",       safe(log.userId,        null)),
            detailRow("Başvuru ID",         safe(log.appealId,      null)),
            detailRow("İşlemi Yapan (PerformedBy)", safe(log.performedBy, null)),
            detailRow("Hedef Kullanıcı",    safe(log.targetUsername, null)),
            detailRow("Admin Kullanıcı",    safe(log.adminUsername, null)),
            detailRow("Alt Kategori",       safe(log.logCategory,   null))
        ].filter(Boolean).join("");

        const contentHtml = `
            <div style="display: flex; flex-direction: column; gap: 12px; font-size: 14px;">
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border); padding-bottom: 8px;">
                    <span style="color: var(--text-muted);">Zaman Damgası:</span>
                    <strong>${escapeHtml(log.time || "Bilinmiyor")}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border); padding-bottom: 8px;">
                    <span style="color: var(--text-muted);">Kategori:</span>
                    <span>${escapeHtml(log.category || "-")}</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border); padding-bottom: 8px;">
                    <span style="color: var(--text-muted);">Seviye:</span>
                    ${renderLogLevelBadge(log.level)}
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border); padding-bottom: 8px;">
                    <span style="color: var(--text-muted);">Kullanıcı / Kaynak:</span>
                    <span>${escapeHtml(log.user || "-")}</span>
                </div>
                ${extraRows}
                <div class="global-modal-card-box">
                    <div style="font-size: 12px; color: var(--text-muted); text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Log Mesajı / Olay</div>
                    <div style="color: var(--text); line-height: 22px; font-family: monospace; font-size: 13px;">
                        ${escapeHtml(log.message || "")}
                    </div>
                </div>
            </div>
        `;

        window.GlobalModal.open({
            type: modalType,
            title: "Denetim Kaydı Detayı",
            description: `${log.category || "Genel"} kategorisindeki sistem olayı.`,
            content: contentHtml,
            buttons: [
                {
                    text: "Tamam",
                    className: "global-modal-button-primary",
                    closeOnClick: true
                }
            ]
        });
    }

    // =========================================================================
    // SİSTEM GÖRÜNÜMÜ & CANLI SİMÜLASYON (1 (2).png)
    // =========================================================================
    function highlightSystemCard(cardId) {
        const card = document.getElementById(cardId);
        if (card) {
            card.scrollIntoView({ behavior: "smooth", block: "center" });
            card.style.transition = "outline 0.3s ease";
            card.style.outline = "2px solid var(--admin-primary)";
            setTimeout(() => {
                card.style.outline = "none";
            }, 1600);
        }
    }

    function startLiveSystemSimulation() {
        const cpuEl = document.getElementById("metricCpu");
        const cpuBar = document.getElementById("metricCpuBar");
        const pingEl = document.getElementById("metricPing");
        const quickApi = document.getElementById("quickApiResponse");

        if (!cpuEl || !cpuBar) return;

        setInterval(() => {
            const cpuVal = Math.floor(10 + Math.random() * 18);
            cpuEl.textContent = `${cpuVal}%`;
            cpuBar.style.width = `${cpuVal}%`;

            const pingVal = Math.floor(14 + Math.random() * 18);
            if (pingEl) pingEl.textContent = `${pingVal} ms`;
            if (quickApi) quickApi.textContent = `${pingVal} ms`;
        }, 3500);
    }

    // =========================================================================
    // YARDIMCI ROZET VE HTML ŞABLONLARI
    // =========================================================================
    function renderStatusBadge(status) {
        switch (status) {
            case "Pending":
                return `<span class="admin-badge admin-badge-pending"><span class="admin-badge-dot"></span>Beklemede</span>`;
            case "Approved":
                return `<span class="admin-badge admin-badge-approved"><span class="admin-badge-dot"></span>Onaylandı</span>`;
            case "Rejected":
                return `<span class="admin-badge admin-badge-rejected"><span class="admin-badge-dot"></span>Reddedildi</span>`;
            default:
                return `<span class="admin-badge admin-badge-info">${escapeHtml(status)}</span>`;
        }
    }

    function renderLogLevelBadge(level) {
        switch (level) {
            case "INFO":
                return `<span class="admin-badge admin-badge-info"><span class="admin-badge-dot"></span>INFO</span>`;
            case "WARN":
                return `<span class="admin-badge admin-badge-pending"><span class="admin-badge-dot"></span>WARN</span>`;
            case "ERROR":
                return `<span class="admin-badge admin-badge-rejected"><span class="admin-badge-dot"></span>ERROR</span>`;
            case "SUCCESS":
                return `<span class="admin-badge admin-badge-approved"><span class="admin-badge-dot"></span>SUCCESS</span>`;
            default:
                return `<span class="admin-badge admin-badge-system">${escapeHtml(level)}</span>`;
        }
    }

    function escapeHtml(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Global Dışa Aktarım
    window.AdminPanel = {
        renderView,
        openDecisionModal,
        showAppealDetail,
        showLogDetail
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
