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

        // İstatistik Sayıcıları
        statUsersCount: document.getElementById("statUsersCount"),
        statPendingAppealsCount: document.getElementById("statPendingAppealsCount"),
        statBannedCount: document.getElementById("statBannedCount"),
        statSystemHealth: document.getElementById("statSystemHealth"),

        // Sistem Ayarları
        toggleMaintenanceMode: document.getElementById("toggleMaintenanceMode"),
        toggleUserRegistration: document.getElementById("toggleUserRegistration"),
        toggleAuditLog: document.getElementById("toggleAuditLog"),

        // Tema
        themeToggleBtn: document.getElementById("themeToggleBtn"),
        themeIcon: document.getElementById("themeIcon"),
        themeLabel: document.getElementById("themeLabel")
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

    const MOCK_LOGS = [
        {
            id: 1,
            time: "2026-09-10 01:04:12",
            level: "INFO",
            category: "Admin İşlemleri",
            user: "Admin (192.168.1.45)",
            message: "Yönetim paneli genel bakış ekranı görüntülendi."
        },
        {
            id: 2,
            time: "2026-09-10 00:58:30",
            level: "SUCCESS",
            category: "Başvuru",
            user: "selin_kaya",
            message: "Ban kaldırma talebi onaylandı ve hesap erişimi açıldı."
        },
        {
            id: 3,
            time: "2026-09-10 00:45:18",
            level: "WARN",
            category: "Sistem",
            user: "RateLimiter",
            message: "IP 178.23.4.19 tarafından arka arkaya 5 hatalı giriş denemesi yapıldı."
        },
        {
            id: 4,
            time: "2026-09-10 00:32:00",
            level: "INFO",
            category: "User",
            user: "burak_fitness",
            message: "Kullanıcı profil güncelleme isteği tamamlandı."
        },
        {
            id: 5,
            time: "2026-09-09 23:59:10",
            level: "ERROR",
            category: "Sistem",
            user: "AuthService",
            message: "JWT token süresi dolmuş oturum isteği 401 Unauthorized ile reddedildi."
        },
        {
            id: 6,
            time: "2026-09-09 22:15:40",
            level: "INFO",
            category: "Genel",
            user: "SystemDaemon",
            message: "Günlük veritabanı önbelleği ve log indeksleme işlemi başarıyla tamamlandı."
        },
        {
            id: 7,
            time: "2026-09-09 21:05:12",
            level: "WARN",
            category: "Başvuru",
            user: "ahmet_koc",
            message: "Kullanıcı ban kaldırma talebi yönetici notu ile reddedildi."
        },
        {
            id: 8,
            time: "2026-09-09 20:30:00",
            level: "SUCCESS",
            category: "User",
            user: "mert_yildiz",
            message: "Yeni kullanıcı kaydı başarıyla oluşturuldu."
        }
    ];

    // =========================================================================
    // BAŞLANGIÇ & KULLANICI BİLGİSİ
    // =========================================================================
    function init() {
        resolveUser();
        initTheme();
        initEventListeners();
        loadAppealsData();
        state.logs = [...MOCK_LOGS];
        
        renderView("dashboard");
        startLiveSystemSimulation();
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
    // TEMA YÖNETİMİ
    // =========================================================================
    function initTheme() {
        const savedTheme = localStorage.getItem("fitness_pro_theme") || "dark";
        applyTheme(savedTheme);

        if (dom.themeToggleBtn) {
            dom.themeToggleBtn.addEventListener("click", () => {
                const current = document.documentElement.getAttribute("data-theme") || "dark";
                const next = current === "dark" ? "light" : "dark";
                applyTheme(next);
            });
        }
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("fitness_pro_theme", theme);
        if (dom.themeIcon && dom.themeLabel) {
            if (theme === "dark") {
                dom.themeIcon.textContent = "☀️";
                dom.themeLabel.textContent = "Light";
            } else {
                dom.themeIcon.textContent = "🌙";
                dom.themeLabel.textContent = "Dark";
            }
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
            dom.logSearchInput.addEventListener("input", () => renderLogsTable());
        }
        if (dom.logLevelFilter) {
            dom.logLevelFilter.addEventListener("change", () => {
                state.logLevel = dom.logLevelFilter.value;
                renderLogsTable();
            });
        }
        if (dom.logCategoryFilter) {
            dom.logCategoryFilter.addEventListener("change", () => {
                state.logCategory = dom.logCategoryFilter.value;
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
                renderSidebarNav("logs", "ALL");
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
                                logSystemAction("Bakım Modu yönetici tarafından ETKİNLEŞTİRİLDİ.", "WARN");
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
                    logSystemAction("Bakım Modu devre dışı bırakıldı, tüm erişimler normale döndü.", "INFO");
                }
            });
        }
    }

    function logSystemAction(message, level = "INFO") {
        state.logs.unshift({
            id: Date.now(),
            time: new Date().toLocaleString("tr-TR"),
            level: level,
            category: "Sistem",
            user: `${state.currentUser.username} (Yönetici)`,
            message: message
        });
        if (state.currentView === "logs") {
            renderLogsTable();
        }
    }

    // =========================================================================
    // VERİ YÜKLEME (API & MOCK ENTEGRASYONU)
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
                        ✓ Onayla
                    </button>
                    <button type="button" class="admin-action-btn reject" onclick="window.AdminPanel.openDecisionModal(${item.id}, 'reject')">
                        ✕ Reddet
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
    function renderLogsTable() {
        if (!dom.logsTableBody) return;
        dom.logsTableBody.innerHTML = "";

        const searchQuery = (dom.logSearchInput?.value || "").toLowerCase().trim();
        const levelFilter = state.logLevel;
        const categoryFilter = state.logCategory;

        const filtered = state.logs.filter(log => {
            const levelMatch = levelFilter === "ALL" || log.level === levelFilter;
            const catMatch = categoryFilter === "ALL" || log.category === categoryFilter;
            const searchMatch = !searchQuery ||
                log.message.toLowerCase().includes(searchQuery) ||
                log.user.toLowerCase().includes(searchQuery) ||
                log.category.toLowerCase().includes(searchQuery);

            return levelMatch && catMatch && searchMatch;
        });

        if (filtered.length === 0) {
            dom.logsTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="admin-empty-state">
                        <div>Seçilen kriterlere uygun log kaydı bulunamadı.</div>
                    </td>
                </tr>
            `;
            return;
        }

        filtered.forEach(log => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><span class="admin-caption">${escapeHtml(log.time)}</span></td>
                <td>${renderLogLevelBadge(log.level)}</td>
                <td><strong>${escapeHtml(log.category)}</strong></td>
                <td><span class="admin-body-sm">${escapeHtml(log.user)}</span></td>
                <td style="max-width: 400px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(log.message)}</td>
                <td>
                    <button type="button" class="admin-action-btn detail" onclick="window.AdminPanel.showLogDetail(${log.id})">
                        İncele
                    </button>
                </td>
            `;
            dom.logsTableBody.appendChild(tr);
        });
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
                    text: isApprove ? "✓ Onayla ve Kilidi Aç" : "✕ Başvuruyu Reddet",
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
     */
    function showLogDetail(logId) {
        const log = state.logs.find(l => l.id === logId);
        if (!log || !window.GlobalModal) return;

        const modalType = log.level === "ERROR" ? "error" : (log.level === "WARN" ? "warning" : (log.level === "SUCCESS" ? "success" : "info"));

        const contentHtml = `
            <div style="display: flex; flex-direction: column; gap: 12px; font-size: 14px;">
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border); padding-bottom: 8px;">
                    <span style="color: var(--text-muted);">Zaman Damgası:</span>
                    <strong>${escapeHtml(log.time)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border); padding-bottom: 8px;">
                    <span style="color: var(--text-muted);">Kategori:</span>
                    <span>${escapeHtml(log.category)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border); padding-bottom: 8px;">
                    <span style="color: var(--text-muted);">Seviye:</span>
                    ${renderLogLevelBadge(log.level)}
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border); padding-bottom: 8px;">
                    <span style="color: var(--text-muted);">Kullanıcı / Kaynak:</span>
                    <span>${escapeHtml(log.user)}</span>
                </div>
                
                <div class="global-modal-card-box">
                    <div style="font-size: 12px; color: var(--text-muted); text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Log Mesajı / Olay</div>
                    <div style="color: var(--text); line-height: 22px; font-family: monospace; font-size: 13px;">
                        ${escapeHtml(log.message)}
                    </div>
                </div>
            </div>
        `;

        window.GlobalModal.open({
            type: modalType,
            title: "Denetim Kaydı Detayı",
            description: `${log.category} kategorisindeki sistem olayı.`,
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
