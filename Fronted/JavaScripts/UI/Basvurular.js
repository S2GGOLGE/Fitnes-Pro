/**
 * =========================================================
 * FITNESS PRO - BAŞVURULAR (APPLICATIONS) UI CONTROLLER
 * =========================================================
 * Tasarım Şartnamesi (Yapılacaklar.txt) ve tasarım taslaklarına
 * (1.png & 2.png) uygun olarak geliştirilmiştir.
 *
 * Temel Fonksiyonlar:
 *   - loadApplications()
 *   - renderApplications()
 *   - filterApplications(status)
 *   - showApplicationDetails(id)
 *   - renderEmptyState(isFilterEmpty)
 *   - openNewApplicationModal()
 *
 * API Desteği:
 *   GET  /api/applications
 *   GET  /api/applications/{id}
 *   POST /api/applications
 * API erişilemediğinde dinamik mock veri ve yerel depolama kullanılır.
 * =========================================================
 */

(() => {
    'use strict';

    // =========================================================
    // CONFIG & STORAGE
    // =========================================================
    const STORAGE_KEY = 'fitness_pro_applications_data_v1';
    
    const API_BASE_URL =
        (window.Auth && typeof window.Auth.getBaseUrl === 'function' && window.Auth.getBaseUrl()) ||
        window.API_BASE_URL ||
        'http://localhost:5000';

    const ENDPOINTS = {
        list: `${API_BASE_URL}/api/applications`,
        detail: (id) => `${API_BASE_URL}/api/applications/${encodeURIComponent(id)}`,
        create: `${API_BASE_URL}/api/applications`
    };

    // =========================================================
    // DEFAULT SEED DATA (Backend henüz hazır değilse kullanılır)
    // =========================================================
    const SEED_APPLICATIONS = [
        {
            id: 1024,
            type: 'Koçluk Başvurusu',
            createdAt: '29.09.2026',
            updatedAt: '29.09.2026',
            status: 'pending', // 'pending' | 'approved' | 'rejected'
            statusText: 'Beklemede',
            description: 'Fitness Pro platformunda uzaktan ve birebir koçluk hizmeti vermek üzere başvuruyorum. 5 yıllık personal trainer ve sertifikalı fitness antrenörüyüm.',
            experience: '5 Yıl Birebir Antrenörlük, TVGFBF 2. Kademe',
            adminResponse: 'Başvurunuz inceleme sırasına alınmıştır. Belgeleriniz kontrol edildikten sonra sistem üzerinden bilgilendirileceksiniz.',
            rejectReason: null
        },
        {
            id: 1023,
            type: 'Antrenörlük Başvurusu',
            createdAt: '15.09.2026',
            updatedAt: '18.09.2026',
            status: 'approved',
            statusText: 'Onaylandı',
            description: 'Fonksiyonel fitness ve hipertrofi odaklı özel antrenman programları için eğitmenlik başvurusu.',
            experience: '3 Yıl Salon Eğitmenliği, EREPS Seviye 4',
            adminResponse: 'Tebrikler! Belgeleriniz onaylanmış ve antrenör profiliniz aktif edilmiştir. Eğitmen panelinizden danışan kabul etmeye başlayabilirsiniz.',
            rejectReason: null
        },
        {
            id: 1019,
            type: 'Diyetisyenlik Başvurusu',
            createdAt: '02.08.2026',
            updatedAt: '05.08.2026',
            status: 'rejected',
            statusText: 'Reddedildi',
            description: 'Sporcu beslenmesi ve makro besin planlaması danışmanlığı vermek için başvuru.',
            experience: 'Beslenme ve Diyetetik Lisans Mezunu',
            adminResponse: 'Yüklenen mesleki faaliyet lisansı belgesinin son geçerlilik süresi dolmuş görünmektedir. Lütfen güncel belgenizi temin ederek yeni bir başvuru oluşturunuz.',
            rejectReason: 'Belge geçerlilik süresi dolmuş veya okunamıyor.'
        },
        {
            id: 1012,
            type: 'Salon Eğitmenliği',
            createdAt: '10.07.2026',
            updatedAt: '12.07.2026',
            status: 'approved',
            statusText: 'Onaylandı',
            description: 'Merkez şube bünyesinde grup dersleri ve serbest ağırlık salon eğitmenliği pozisyonu için başvuru.',
            experience: 'Grup Egzersizleri ve Spinning Uzmanı',
            adminResponse: 'Başvurunuz kabul edilmiştir. Şube insan kaynakları yetkilisi sözleşme işlemleri için sizinle iletişime geçecektir.',
            rejectReason: null
        }
    ];

    // =========================================================
    // STATE
    // =========================================================
    let applicationsState = [];
    let currentFilter = 'all';
    let isLoading = false;

    // =========================================================
    // DOM ELEMENTS
    // =========================================================
    const container = document.getElementById('applicationsContainer');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const sidebar = document.getElementById('basvurularSidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
    const btnNewAppSidebar = document.getElementById('btnNewAppSidebar');
    const btnNewAppHeader = document.getElementById('btnNewAppHeader');

    // Stats and Counts
    const statTotal = document.getElementById('statTotalCount');
    const statPending = document.getElementById('statPendingCount');
    const statApproved = document.getElementById('statApprovedCount');
    const statRejected = document.getElementById('statRejectedCount');
    const sidebarAppCount = document.getElementById('sidebarAppCount');

    const filterCountAll = document.getElementById('filterCountAll');
    const filterCountPending = document.getElementById('filterCountPending');
    const filterCountApproved = document.getElementById('filterCountApproved');
    const filterCountRejected = document.getElementById('filterCountRejected');

    // Sidebar başvuru listesi
    const sidebarAppsList = document.getElementById('sidebarApplicationsList');
    const sidebarAppsListCount = document.getElementById('sidebarAppsListCount');

    // =========================================================
    // SVG ICONS
    // =========================================================
    const ICONS = {
        calendar: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
        clock: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
        arrowRight: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`,
        empty: `<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>`,
        filterEmpty: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>`,
        plus: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`
    };

    // =========================================================
    // STORAGE HELPERS
    // =========================================================
    function getStoredApplications() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed;
                }
            }
        } catch (e) {
            console.warn('Yerel depolama okuma hatası:', e);
        }
        return null;
    }

    function saveApplications(apps) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
        } catch (e) {
            console.warn('Yerel depolama kayıt hatası:', e);
        }
    }

    // =========================================================
    // 16. JAVASCRIPT MANTIĞI: loadApplications()
    // =========================================================
    async function loadApplications() {
        setLoading(true);

        try {
            // İlk olarak backend API denenir
            let loadedData = null;
            if (window.Auth && typeof window.Auth.authFetch === 'function') {
                try {
                    const response = await window.Auth.authFetch(ENDPOINTS.list, { method: 'GET' });
                    if (response && response.ok) {
                        const json = await response.json();
                        if (Array.isArray(json)) {
                            loadedData = json;
                        } else if (json && Array.isArray(json.data)) {
                            loadedData = json.data;
                        }
                    }
                } catch (apiErr) {
                    // API çevrimdışıysa yerel veriye devam edilir
                    console.info('API servisine ulaşılamadı, yerel veri kullanılıyor.', apiErr.message);
                }
            }

            // API yoksa veya başarısız olduysa localStorage veya Seed verisi kullanılır
            if (!loadedData) {
                const local = getStoredApplications();
                if (local) {
                    loadedData = local;
                } else {
                    loadedData = SEED_APPLICATIONS;
                    saveApplications(loadedData);
                }
            }

            applicationsState = loadedData;
            updateStatsAndCounters();
            renderApplications();
            renderSidebarApplications();
        } catch (error) {
            console.error('Başvurular yüklenirken hata:', error);
            renderErrorState('Başvurular yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
        } finally {
            setLoading(false);
        }
    }

    // =========================================================
    // 16. JAVASCRIPT MANTIĞI: filterApplications(status)
    // =========================================================
    function filterApplications(status) {
        currentFilter = status;
        
        filterButtons.forEach(btn => {
            const matches = btn.dataset.filter === status;
            btn.classList.toggle('active', matches);
            btn.setAttribute('aria-pressed', matches ? 'true' : 'false');
        });

        renderApplications();
    }

    // =========================================================
    // 16. JAVASCRIPT MANTIĞI: renderApplications()
    // =========================================================
    function renderApplications() {
        if (!container) return;

        // 1. Genel hiç başvuru yoksa -> Empty State (2.png)
        if (!applicationsState || applicationsState.length === 0) {
            renderEmptyState(false);
            return;
        }

        // 2. Filtreye göre elemanları seç
        const filtered = applicationsState.filter(app => {
            if (currentFilter === 'all') return true;
            return app.status === currentFilter;
        });

        // 3. Filtre sonucu boşsa -> Filtre Empty State (12. Madde)
        if (filtered.length === 0) {
            renderEmptyState(true);
            return;
        }

        // 4. Kartları oluştur
        const cardsHtml = filtered.map(app => createCardHtml(app)).join('');

        container.innerHTML = `
            <div class="applications-grid">
                ${cardsHtml}
            </div>
        `;

        // Detay butonlarını bağla
        container.querySelectorAll('.btn-detail').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                showApplicationDetails(id);
            });
        });
    }

    // =========================================================
    // 16. JAVASCRIPT MANTIĞI: renderEmptyState() (Matches 2.png)
    // =========================================================
    function renderEmptyState(isFilterEmpty = false) {
        if (!container) return;

        if (isFilterEmpty) {
            // Filtre sonucu boş durumu (12. Madde)
            container.innerHTML = `
                <div class="filter-empty-box">
                    <div class="empty-icon-wrap">
                        ${ICONS.filterEmpty}
                    </div>
                    <h2 class="empty-title">Bu kategoride başvuru bulunmuyor.</h2>
                    <p class="empty-subtitle">Seçtiğiniz filtreye ait başvuru kaydı bulunamadı. Diğer kategorileri inceleyebilir veya tüm başvuruları görüntüleyebilirsiniz.</p>
                    <button type="button" class="btn-reset-filter" id="btnResetFilter">
                        Tüm Başvuruları Göster
                    </button>
                </div>
            `;

            document.getElementById('btnResetFilter')?.addEventListener('click', () => {
                filterApplications('all');
            });
        } else {
            // Genel hiç başvuru yok durumu (Matches 2.png - 11. Madde)
            container.innerHTML = `
                <div class="empty-state-box">
                    <div class="empty-icon-wrap">
                        ${ICONS.empty}
                    </div>
                    <h2 class="empty-title">Henüz bir başvurunuz bulunmuyor.</h2>
                    <p class="empty-subtitle">Yaptığınız başvurular burada görüntülenecektir. Koçluk veya antrenörlük başvurusu yapmak için hemen başlayın.</p>
                    <button type="button" class="btn-empty-action" id="btnEmptyMakeApp">
                        ${ICONS.plus}
                        <span>Başvuru Yap</span>
                    </button>
                </div>
            `;

            document.getElementById('btnEmptyMakeApp')?.addEventListener('click', openNewApplicationModal);
        }
    }

    // =========================================================
    // KART OLUŞTURMA (8. & 9. Madde)
    // =========================================================
    function createCardHtml(app) {
        const statusConfig = getStatusBadge(app.status, app.statusText);

        return `
            <article class="app-card" data-id="${escapeHtml(app.id)}">
                <div>
                    <div class="app-card-header">
                        <span class="app-card-id">
                            <span class="app-card-id-dot"></span>
                            Başvuru #${escapeHtml(app.id)}
                        </span>
                        <span class="status-badge ${statusConfig.className}">
                            <span class="status-badge-dot"></span>
                            <span>${escapeHtml(statusConfig.text)}</span>
                        </span>
                    </div>

                    <h2 class="app-card-title">${escapeHtml(app.type || 'Başvuru')}</h2>

                    <div class="app-card-meta">
                        <div class="meta-row">
                            <span class="meta-key">
                                ${ICONS.calendar}
                                Başvuru Tarihi
                            </span>
                            <span class="meta-val">${escapeHtml(app.createdAt || '—')}</span>
                        </div>
                        <div class="meta-row">
                            <span class="meta-key">
                                ${ICONS.clock}
                                Son Güncelleme
                            </span>
                            <span class="meta-val">${escapeHtml(app.updatedAt || '—')}</span>
                        </div>
                    </div>

                    <p class="app-card-desc" title="${escapeHtml(app.description || '')}">
                        ${escapeHtml(app.description || 'Açıklama bulunmuyor.')}
                    </p>
                </div>

                <div class="app-card-footer">
                    <button type="button" class="btn-detail" data-id="${escapeHtml(app.id)}" aria-label="Başvuru detaylarını görüntüle">
                        <span>Detayları Gör</span>
                        ${ICONS.arrowRight}
                    </button>
                </div>
            </article>
        `;
    }

    // =========================================================
    // 16. JAVASCRIPT MANTIĞI: showApplicationDetails(id) (10. Madde)
    // =========================================================
    async function showApplicationDetails(id) {
        const numId = Number(id);
        let app = applicationsState.find(a => a.id === numId || String(a.id) === String(id));

        // API'den detay çekme hazırlığı
        if (!app && window.Auth && typeof window.Auth.authFetch === 'function') {
            try {
                const response = await window.Auth.authFetch(ENDPOINTS.detail(id));
                if (response && response.ok) {
                    const data = await response.json();
                    app = data.data || data;
                }
            } catch (err) {
                console.warn('API detay getirme hatası:', err);
            }
        }

        if (!app) {
            showToast('Başvuru detayı bulunamadı.', 'error');
            return;
        }

        if (!container) {
            console.error('applicationsContainer bulunamadı.');
            return;
        }

        const statusConfig = getStatusBadge(app.status, app.statusText);

        const detailHtml = `
            <div class="app-detail-view">
                <div class="app-detail-toolbar">
                    <button type="button" class="btn-back-to-list" id="btnBackToList" aria-label="Başvuru listesine geri dön">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                        <span>Listeye Dön</span>
                    </button>
                    <span class="app-detail-eyebrow">BAŞVURU DETAYI</span>
                </div>

                <div class="app-detail-hero">
                    <div>
                        <span class="app-detail-id">Başvuru #${escapeHtml(app.id)}</span>
                        <h2 class="app-detail-title">${escapeHtml(app.type || 'Başvuru')}</h2>
                    </div>
                    <span class="status-badge ${statusConfig.className}">
                        <span class="status-badge-dot"></span>
                        <span>${escapeHtml(statusConfig.text)}</span>
                    </span>
                </div>

                <div class="app-detail-wrap">
                    <div class="app-detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Başvuru Numarası</span>
                            <strong class="detail-value">#${escapeHtml(app.id)}</strong>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Başvuru Durumu</span>
                            <span class="detail-value">
                                <span class="status-badge ${statusConfig.className}" style="align-self: flex-start; margin-top: 2px;">
                                    <span class="status-badge-dot"></span>
                                    <span>${escapeHtml(statusConfig.text)}</span>
                                </span>
                            </span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Başvuru Türü</span>
                            <span class="detail-value">${escapeHtml(app.type)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Başvuru Tarihi</span>
                            <span class="detail-value">${escapeHtml(app.createdAt)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Son Güncelleme</span>
                            <span class="detail-value">${escapeHtml(app.updatedAt)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Deneyim / Uzmanlık</span>
                            <span class="detail-value">${escapeHtml(app.experience || 'Belirtilmedi')}</span>
                        </div>
                    </div>

                    <div class="app-detail-section">
                        <h4>Başvuru Açıklaması</h4>
                        <div class="app-detail-box">
                            ${escapeHtml(app.description || 'Açıklama bulunmuyor.')}
                        </div>
                    </div>

                    ${app.adminResponse ? `
                        <div class="app-detail-section">
                            <h4>Yönetici Yanıtı</h4>
                            <div class="app-detail-box admin-note">
                                ${escapeHtml(app.adminResponse)}
                            </div>
                        </div>
                    ` : ''}

                    ${app.rejectReason ? `
                        <div class="app-detail-section">
                            <h4>Reddedilme Nedeni</h4>
                            <div class="app-detail-box reject-reason">
                                ${escapeHtml(app.rejectReason)}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        container.innerHTML = detailHtml;

        // Filtre/barı devre dışı görsel hale getir (detay modundayken)
        document.body.classList.add('app-detail-active');

        // "Listeye Dön" butonunu bağla
        document.getElementById('btnBackToList')?.addEventListener('click', () => {
            document.body.classList.remove('app-detail-active');
            renderApplications();
        });
    }

    // =========================================================
    // YENİ BAŞVURU YAP MODALI (Matches 1.png & 2.png)
    // =========================================================
    function openNewApplicationModal() {
        if (!window.GlobalModal || typeof window.GlobalModal.open !== 'function') {
            alert('Modal sistemi şu anda kullanılamıyor.');
            return;
        }

        const formHtml = `
            <form id="newApplicationForm" onsubmit="return false;">
                <div class="modal-form-group">
                    <label for="newAppType">Başvuru Türü *</label>
                    <select id="newAppType" class="modal-form-control" required>
                        <option value="Koçluk Başvurusu">Koçluk Başvurusu (Online Coaching)</option>
                        <option value="Antrenörlük Başvurusu">Kişisel Antrenörlük (Personal Trainer)</option>
                        <option value="Diyetisyenlik Başvurusu">Diyetisyen & Beslenme Uzmanlığı</option>
                        <option value="Salon Eğitmenliği">Grup Dersi & Salon Eğitmenliği</option>
                    </select>
                </div>

                <div class="modal-form-group">
                    <label for="newAppExperience">Deneyim & Sertifikalar *</label>
                    <input type="text" id="newAppExperience" class="modal-form-control" placeholder="Örn: 4 Yıl Birebir Antrenörlük, TVGFBF 2. Kademe" required>
                </div>

                <div class="modal-form-group">
                    <label for="newAppDescription">Başvuru Açıklaması ve Motivasyon *</label>
                    <textarea id="newAppDescription" class="modal-form-control" placeholder="Kendinizden, uzmanlık alanlarınızdan ve hedeflerinizden kısaca bahsedin..." required></textarea>
                </div>
            </form>
        `;

        window.GlobalModal.open({
            type: 'info',
            title: 'Yeni Başvuru Oluştur',
            description: 'Fitness Pro ekibine katılmak veya eğitmenlik hizmeti sunmak için başvurunuzu iletin.',
            html: formHtml,
            buttons: [
                {
                    text: 'Vazgeç',
                    variant: 'secondary',
                    closeOnClick: true
                },
                {
                    text: 'Başvuruyu Gönder',
                    loadingText: 'Gönderiliyor...',
                    variant: 'primary',
                    closeOnClick: false,
                    callback: async ({ close, setLoading }) => {
                        const typeInput = document.getElementById('newAppType');
                        const expInput = document.getElementById('newAppExperience');
                        const descInput = document.getElementById('newAppDescription');

                        const type = typeInput?.value?.trim();
                        const experience = expInput?.value?.trim();
                        const description = descInput?.value?.trim();

                        if (!type || !experience || !description) {
                            showToast('Lütfen tüm zorunlu alanları doldurun.', 'warning');
                            return false;
                        }

                        if (description.length < 20) {
                            showToast('Açıklama en az 20 karakter olmalıdır.', 'warning');
                            descInput?.focus();
                            return false;
                        }

                        setLoading(true);

                        const today = new Date();
                        const dateFormatted = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;

                        const newAppObj = {
                            id: Math.floor(1000 + Math.random() * 9000),
                            type,
                            createdAt: dateFormatted,
                            updatedAt: dateFormatted,
                            status: 'pending',
                            statusText: 'Beklemede',
                            experience,
                            description,
                            adminResponse: 'Başvurunuz sisteme kaydedildi. İnceleme süreci başlatılmıştır.',
                            rejectReason: null
                        };

                        // API isteği gönder
                        if (window.Auth && typeof window.Auth.authFetch === 'function') {
                            try {
                                await window.Auth.authFetch(ENDPOINTS.create, {
                                    method: 'POST',
                                    body: JSON.stringify(newAppObj)
                                });
                            } catch (e) {
                                console.info('Backend API kayıt cevapsız, yerel veriye eklendi.');
                            }
                        }

                        // Yerel duruma ekle
                        applicationsState.unshift(newAppObj);
                        saveApplications(applicationsState);
                        updateStatsAndCounters();
                        renderApplications();
                        renderSidebarApplications();

                        setLoading(false);
                        close('submitted');

                        showToast('Başvurunuz başarıyla oluşturuldu ve incelemeye alındı.', 'success');
                        return true;
                    }
                }
            ]
        });
    }

    // =========================================================
    // YARDIMCI VE DURUM FONKSİYONLARI
    // =========================================================
    function getStatusBadge(status, customText) {
        switch (status) {
            case 'approved':
                return { className: 'status-approved', text: customText || 'Onaylandı' };
            case 'rejected':
                return { className: 'status-rejected', text: customText || 'Reddedildi' };
            case 'pending':
            default:
                return { className: 'status-pending', text: customText || 'Beklemede' };
        }
    }

    function updateStatsAndCounters() {
        const total = applicationsState.length;
        const pending = applicationsState.filter(a => a.status === 'pending').length;
        const approved = applicationsState.filter(a => a.status === 'approved').length;
        const rejected = applicationsState.filter(a => a.status === 'rejected').length;

        if (statTotal) statTotal.textContent = total;
        if (statPending) statPending.textContent = pending;
        if (statApproved) statApproved.textContent = approved;
        if (statRejected) statRejected.textContent = rejected;
        if (sidebarAppCount) sidebarAppCount.textContent = total;

        if (filterCountAll) filterCountAll.textContent = total;
        if (filterCountPending) filterCountPending.textContent = pending;
        if (filterCountApproved) filterCountApproved.textContent = approved;
        if (filterCountRejected) filterCountRejected.textContent = rejected;
    }

    function setLoading(loading) {
        isLoading = loading;
        if (!container) return;

        if (loading) {
            container.innerHTML = `
                <div class="loading-state-box">
                    <div class="loading-spinner"></div>
                    <span class="loading-text">Başvurular yükleniyor...</span>
                </div>
            `;
        }
    }

    function renderErrorState(message) {
        if (!container) return;
        container.innerHTML = `
            <div class="error-state-box">
                <h3 class="error-title">Bir Sorun Oluştu</h3>
                <p class="error-text">${escapeHtml(message)}</p>
                <button type="button" class="btn-primary-action" id="btnRetryLoad">
                    Yeniden Dene
                </button>
            </div>
        `;

        document.getElementById('btnRetryLoad')?.addEventListener('click', loadApplications);
    }

    function showToast(message, type = 'info') {
        if (window.GlobalModal && typeof window.GlobalModal.alert === 'function') {
            const title = type === 'success' ? 'Başarılı' : type === 'error' ? 'Hata' : 'Bilgi';
            window.GlobalModal.alert({ type, title, message });
        } else {
            alert(message);
        }
    }

    function escapeHtml(value) {
        if (value === null || value === undefined) return '';
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Kullanıcı profil bilgilerini Auth'tan doldurma
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

    // =========================================================
    // EVENT LISTENERS & HAMBURGER MENÜ (3. Madde)
    // =========================================================
    function openSidebar() {
        sidebar?.classList.add('is-open');
        sidebarOverlay?.classList.add('is-active');
        document.body.style.overflow = 'hidden';
        mobileMenuBtn?.setAttribute('aria-expanded', 'true');
    }

    function closeSidebar() {
        sidebar?.classList.remove('is-open');
        sidebarOverlay?.classList.remove('is-active');
        document.body.style.overflow = '';
        mobileMenuBtn?.setAttribute('aria-expanded', 'false');
    }

    function renderSidebarApplications() {
        if (!sidebarAppsList) return;

        const total = applicationsState ? applicationsState.length : 0;
        if (sidebarAppsListCount) sidebarAppsListCount.textContent = String(total);

        if (!applicationsState || applicationsState.length === 0) {
            sidebarAppsList.innerHTML = `
                <div class="sidebar-apps-empty">
                    Henüz başvuru bulunmuyor. Yukarıdaki <strong>Başvuru Yap</strong> butonu ile başlayabilirsin.
                </div>
            `;
            return;
        }

        sidebarAppsList.innerHTML = applicationsState.map(app => {
            const statusConfig = getStatusBadge(app.status, app.statusText);
            return `
                <button type="button" class="sidebar-app-item" data-id="${escapeHtml(app.id)}" aria-label="Başvuru #${escapeHtml(app.id)} detaylarını aç">
                    <div class="sidebar-app-item-row">
                        <span class="sidebar-app-id">#${escapeHtml(app.id)}</span>
                        <span class="sidebar-app-status ${statusConfig.className}">
                            <span class="sidebar-app-status-dot"></span>
                            <span>${escapeHtml(statusConfig.text)}</span>
                        </span>
                    </div>
                    <span class="sidebar-app-type">${escapeHtml(app.type || 'Başvuru')}</span>
                    <span class="sidebar-app-date">${escapeHtml(app.createdAt || '—')}</span>
                </button>
            `;
        }).join('');

        // Tıklama olaylarını bağla
        sidebarAppsList.querySelectorAll('.sidebar-app-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                // Aktif görsel state
                sidebarAppsList.querySelectorAll('.sidebar-app-item').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');

                // Detayları göster
                showApplicationDetails(id);

                // Mobil ise sidebar'ı otomatik kapat
                if (window.innerWidth <= 960) {
                    closeSidebar();
                }
            });
        });
    }

    function bindGlobalEvents() {
        // Filtre düğmeleri
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const status = btn.dataset.filter;
                filterApplications(status);
            });
        });

        // Yeni Başvuru butonları
        btnNewAppSidebar?.addEventListener('click', openNewApplicationModal);
        btnNewAppHeader?.addEventListener('click', openNewApplicationModal);

        // Hamburger Menü & Mobil Sidebar
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
    // BAŞLATMA (INIT)
    // =========================================================
    document.addEventListener('DOMContentLoaded', () => {
        updateUserData();
        bindGlobalEvents();
        loadApplications();
    });

})();
