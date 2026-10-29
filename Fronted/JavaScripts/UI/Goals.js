/**
 * Fitness Pro - Goals (Hedefler) UI Controller
 * Emojiler yerine modern SVG ikonlar kullanılarak tasarlanmıştır.
 * Tasarım taslakları (1.png, 2.png) ve setting.html mimarisi ile uyumlu.
 */

(() => {
    'use strict';

    // DOM Elements
    const goalsNavList = document.getElementById('goalsNavList');
    const goalsCountTag = document.getElementById('goalsCountTag');
    const dynamicContent = document.getElementById('goalsDynamicContent');
    const btnAddGoalSidebar = document.getElementById('btnAddGoalSidebar');
    const sidebar = document.getElementById('goalsSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');

    // Storage Key
    const STORAGE_KEY = 'fitness_pro_goals_data_v2';

    // SVG Icons Registry
    const SVG_ICONS = {
        target: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>`,
        scale: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M3 7l4 8h10l4-8M6 15a6 6 0 0 0 12 0"></path></svg>`,
        dumbbell: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 5v14M18 5v14M2 9v6M22 9v6M6 12h12"></path></svg>`,
        calendar: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
        cardio: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>`,
        water: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path></svg>`,
        zap: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`,
        flag: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>`,
        plusLarge: `<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
        check: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
        trash: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
        arrowRight: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`
    };

    function getCategoryIcon(category) {
        switch (category) {
            case 'Kilo': return SVG_ICONS.scale;
            case 'Hipertrofi': return SVG_ICONS.dumbbell;
            case 'Alışkanlık': return SVG_ICONS.calendar;
            case 'Kardiyo': return SVG_ICONS.cardio;
            case 'Sağlık': return SVG_ICONS.water;
            default: return SVG_ICONS.target;
        }
    }

    // State
    let goals = loadGoals();
    let activeGoalId = goals.length > 0 ? goals[0].id : null;

    // Load from LocalStorage
    function loadGoals() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (data) {
                const parsed = JSON.parse(data);
                if (Array.isArray(parsed)) {
                    return parsed;
                }
            }
        } catch (e) {
            console.error('LocalStorage okuma hatası:', e);
        }
        return [];
    }

    // Save to LocalStorage
    function saveGoals(items) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        } catch (e) {
            console.error('LocalStorage yazma hatası:', e);
        }
    }

    // Initialize
    function init() {
        // Dynamic user info from Auth if available
        if (window.Auth && typeof window.Auth.getUser === 'function') {
            const user = window.Auth.getUser();
            if (user && user.username) {
                const profileUsername = document.querySelector('.profile-username');
                const profileAvatar = document.querySelector('.profile-avatar');
                if (profileUsername) profileUsername.textContent = user.username;
                if (profileAvatar) profileAvatar.textContent = user.username.charAt(0).toUpperCase();
            }
        }

        renderSidebar();
        bindGlobalEvents();

        if (activeGoalId) {
            renderGoalDetail(activeGoalId);
        } else {
            renderEmptyOrAddView();
        }
    }

    // Render Sidebar List
    function renderSidebar() {
        if (!goalsNavList) return;

        goalsNavList.innerHTML = '';
        if (goalsCountTag) {
            goalsCountTag.textContent = `${goals.length} Hedef`;
        }

        goals.forEach(goal => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `goal-nav-btn ${goal.id === activeGoalId ? 'active' : ''}`;
            btn.setAttribute('data-id', goal.id);
            btn.setAttribute('aria-selected', goal.id === activeGoalId ? 'true' : 'false');

            const categoryIcon = getCategoryIcon(goal.category);

            btn.innerHTML = `
                <div class="goal-nav-btn-info">
                    <span class="goal-nav-icon">${categoryIcon}</span>
                    <span class="goal-nav-text">${escapeHtml(goal.title)}</span>
                </div>
                <span class="goal-nav-badge">%${goal.percent}</span>
            `;

            btn.addEventListener('click', () => {
                activeGoalId = goal.id;
                renderSidebar();
                renderGoalDetail(goal.id);
                closeSidebar();
            });

            goalsNavList.appendChild(btn);
        });

        // Add Goal button state
        if (btnAddGoalSidebar) {
            btnAddGoalSidebar.classList.toggle('active', activeGoalId === 'new');
        }
    }

    // Render Goal Detail (Matches 2.png - "Aynı setting kısmı gibi")
    function renderGoalDetail(goalId) {
        const goal = goals.find(g => g.id === goalId);
        if (!goal) {
            renderEmptyOrAddView();
            return;
        }

        const isCompleted = goal.status === 'Tamamlandı' || goal.percent >= 100;

        dynamicContent.innerHTML = `
            <div class="goals-content-wrapper">
                <!-- HEADER -->
                <header class="goal-detail-header">
                    <div class="goal-header-text">
                        <p class="eyebrow">HEDEF DETAYLARI</p>
                        <h1>${escapeHtml(goal.title)}</h1>
                        <p>${escapeHtml(goal.notes || 'Hedefinize doğru düzenli adımlarla ilerleyin.')}</p>
                    </div>
                    <div class="goal-badges">
                        <span class="badge badge-category">${escapeHtml(goal.category || 'Fitness')}</span>
                        <span class="badge badge-status ${isCompleted ? 'completed' : ''}">
                            ${isCompleted ? SVG_ICONS.check + ' Tamamlandı' : '● ' + goal.status}
                        </span>
                    </div>
                </header>

                <!-- MAIN PROGRESS SHOWCASE CARD (Setting style big rounded card) -->
                <article class="goal-showcase-card">
                    <div class="showcase-top">
                        <span class="showcase-label">İlerleme Durumu</span>
                        <span class="showcase-percentage">%${goal.percent}</span>
                    </div>

                    <div class="goal-progress-bar-track" role="progressbar" aria-valuenow="${goal.percent}" aria-valuemin="0" aria-valuemax="100">
                        <div class="goal-progress-bar-fill" style="width: ${Math.min(100, Math.max(0, goal.percent))}%"></div>
                    </div>

                    <div class="showcase-metrics-grid">
                        <div class="metric-item">
                            <span class="metric-item-label">Başlangıç</span>
                            <span class="metric-item-value">${goal.startVal} ${goal.unit}</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-item-label">Mevcut Değer</span>
                            <span class="metric-item-value highlight">${goal.currentVal} ${goal.unit}</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-item-label">Hedef Değer</span>
                            <span class="metric-item-value">${goal.targetVal} ${goal.unit}</span>
                        </div>
                    </div>
                </article>

                <!-- SECONDARY DETAILS GRID -->
                <div class="goal-details-grid">
                    <!-- CARD 1: QUICK PROGRESS UPDATE -->
                    <article class="detail-card">
                        <div class="detail-card-header">
                            <h3 class="detail-card-title">
                                ${SVG_ICONS.zap}
                                <span>Güncel Değer Girişi</span>
                            </h3>
                            <span class="card-kicker" style="font-size: 11px; color: var(--muted);">${goal.unit}</span>
                        </div>
                        <p style="font-size: 13px; color: var(--secondary); margin-bottom: 16px;">
                            En son ölçümünüzü veya ilerlemenizi girerek hedef yüzdenizi güncelleyin.
                        </p>
                        <form id="formUpdateProgress" class="progress-quick-update">
                            <div class="quick-input-group">
                                <input type="number" step="any" id="inputCurrentVal" value="${goal.currentVal}" required>
                                <span>${goal.unit}</span>
                            </div>
                            <button type="submit" class="btn-update">Güncelle</button>
                        </form>
                    </article>

                    <!-- CARD 2: MILESTONES / KİLOMETRE TAŞLARI -->
                    <article class="detail-card">
                        <div class="detail-card-header">
                            <h3 class="detail-card-title">
                                ${SVG_ICONS.flag}
                                <span>Hedef Adımları</span>
                            </h3>
                            <span style="font-size: 11px; color: var(--muted);">${goal.deadline || 'Hedef Tarih'}</span>
                        </div>
                        <div class="milestones-list">
                            ${(goal.milestones || []).map((ms, idx) => `
                                <div class="milestone-item ${ms.done ? 'done' : ''}" data-idx="${idx}" style="cursor: pointer;">
                                    <span class="milestone-check">${ms.done ? SVG_ICONS.check : ''}</span>
                                    <span>${escapeHtml(ms.text)}</span>
                                </div>
                            `).join('') || '<p style="font-size: 12px; color: var(--muted);">Ekli aşama bulunmuyor.</p>'}
                        </div>
                    </article>
                </div>

                <!-- ACTIONS FOOTER BAR -->
                <div class="goal-actions-bar">
                    <button type="button" class="btn-danger-outline" id="btnDeleteGoal" style="display:inline-flex; align-items:center; gap:6px;">
                        ${SVG_ICONS.trash}
                        <span>Hedefi Sil</span>
                    </button>
                    <div style="display: flex; gap: 10px;">
                        <button type="button" class="btn-complete-goal" id="btnToggleComplete">
                            ${isCompleted ? 'Tekrar Devam Ettir' : 'Hedefi Tamamlandı Olarak İşaretle'}
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Bind Detail Page Events
        const formUpdate = document.getElementById('formUpdateProgress');
        formUpdate?.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('inputCurrentVal');
            const newVal = parseFloat(input.value);
            if (!isNaN(newVal)) {
                updateGoalMetric(goal.id, newVal);
            }
        });

        // Milestone toggle
        document.querySelectorAll('.milestone-item').forEach(item => {
            item.addEventListener('click', () => {
                const idx = parseInt(item.getAttribute('data-idx'), 10);
                if (!isNaN(idx) && goal.milestones && goal.milestones[idx]) {
                    goal.milestones[idx].done = !goal.milestones[idx].done;
                    saveGoals(goals);
                    renderGoalDetail(goal.id);
                }
            });
        });

        // Toggle Complete
        document.getElementById('btnToggleComplete')?.addEventListener('click', () => {
            if (isCompleted) {
                goal.status = 'Devam Ediyor';
                goal.percent = recalculatePercent(goal.startVal, goal.currentVal, goal.targetVal);
            } else {
                goal.status = 'Tamamlandı';
                goal.percent = 100;
                if (goal.milestones) {
                    goal.milestones.forEach(m => m.done = true);
                }
            }
            saveGoals(goals);
            renderSidebar();
            renderGoalDetail(goal.id);
        });

        // Delete Goal
        document.getElementById('btnDeleteGoal')?.addEventListener('click', () => {
            // Native confirm() yerine merkezi GlobalModal kullanılıyor
            const proceedWithDelete = () => {
                goals = goals.filter(g => g.id !== goal.id);
                saveGoals(goals);
                activeGoalId = goals.length > 0 ? goals[0].id : null;
                renderSidebar();
                if (activeGoalId) {
                    renderGoalDetail(activeGoalId);
                } else {
                    renderEmptyOrAddView();
                }

                if (window.GlobalModal) {
                    window.GlobalModal.open({
                        type: 'success',
                        title: 'Hedef Silindi',
                        description: `"${goal.title}" hedefi başarıyla kaldırıldı.`,
                        buttons: [{ text: 'Tamam', variant: 'primary', closeOnClick: true }]
                    });
                }
            };

            if (window.GlobalModal) {
                // Silme onayı: özel buton metinleri için doğrudan open() kullanıyoruz
                window.GlobalModal.open({
                    type: 'warning',
                    title: 'Hedefi Sil',
                    description: `"${goal.title}" hedefini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
                    buttons: [
                        { text: 'Vazgeç', variant: 'secondary', closeOnClick: true },
                        { text: 'Sil', variant: 'danger', closeOnClick: true, callback: proceedWithDelete }
                    ]
                });
            } else {
                if (confirm(`"${goal.title}" hedefini silmek istediğinize emin misiniz?`)) {
                    proceedWithDelete();
                }
            }
        });
    }

    // Render Empty / Add Goal View (Matches 1.png)
    function renderEmptyOrAddView() {
        dynamicContent.innerHTML = `
            <div class="goals-content-wrapper">
                <div class="empty-goals-container" id="emptyContainer">
                    <div class="empty-goal-card" id="btnTriggerAddForm">
                        <div class="empty-goal-icon-box">${SVG_ICONS.plusLarge}</div>
                        <h2 class="empty-goal-title">Hedef Ekle</h2>
                        <p class="empty-goal-subtitle">
                            Kendinize yeni bir antrenman, kilo, kas ya da günlük yaşam hedefi belirleyin ve gelişiminizi adım adım takip edin.
                        </p>
                        <button type="button" class="btn-primary-large">
                            <span>Yeni Hedef Oluştur</span>
                            ${SVG_ICONS.arrowRight}
                        </button>
                    </div>
                </div>

                <div id="addGoalFormContainer" style="display: none;">
                    <div class="goal-form-card">
                        <header class="goal-form-header">
                            <h2>Yeni Hedef Belirle</h2>
                            <p>Hedef detaylarınızı doldurarak takip listenize ekleyin.</p>
                        </header>

                        <form id="formNewGoal">
                            <div class="form-grid">
                                <div class="form-group full-width">
                                    <label class="form-label" for="newGoalTitle">Hedef Başlığı *</label>
                                    <input class="form-input" type="text" id="newGoalTitle" placeholder="Örn: 10 KG Kilo Verme, Bench Press 100 KG..." required>
                                </div>

                                <div class="form-group">
                                    <label class="form-label" for="newGoalCategory">Kategori *</label>
                                    <select class="form-select" id="newGoalCategory" required>
                                        <option value="Kilo">Kilo Verme / Alma</option>
                                        <option value="Hipertrofi">Kas & Güç</option>
                                        <option value="Alışkanlık">Düzenli İdman</option>
                                        <option value="Kardiyo">Koşu & Dayanıklılık</option>
                                        <option value="Sağlık">Su & Beslenme</option>
                                    </select>
                                </div>

                                <div class="form-group">
                                    <label class="form-label" for="newGoalUnit">Ölçüm Birimi *</label>
                                    <select class="form-select" id="newGoalUnit" required>
                                        <option value="kg">Kilogram (kg)</option>
                                        <option value="gün">Gün</option>
                                        <option value="Litre">Litre</option>
                                        <option value="km">Kilometre (km)</option>
                                        <option value="tekrar">Tekrar</option>
                                    </select>
                                </div>

                                <div class="form-group">
                                    <label class="form-label" for="newGoalStart">Başlangıç Değeri *</label>
                                    <input class="form-input" type="number" step="any" id="newGoalStart" placeholder="Örn: 80" required>
                                </div>

                                <div class="form-group">
                                    <label class="form-label" for="newGoalTarget">Hedeflenen Değer *</label>
                                    <input class="form-input" type="number" step="any" id="newGoalTarget" placeholder="Örn: 72" required>
                                </div>

                                <div class="form-group">
                                    <label class="form-label" for="newGoalCurrent">Şu Anki Değer *</label>
                                    <input class="form-input" type="number" step="any" id="newGoalCurrent" placeholder="Örn: 78" required>
                                </div>

                                <div class="form-group">
                                    <label class="form-label" for="newGoalDeadline">Hedef Bitiş Tarihi</label>
                                    <input class="form-input" type="text" id="newGoalDeadline" placeholder="Örn: 30 Kasım 2026">
                                </div>

                                <div class="form-group full-width">
                                    <label class="form-label" for="newGoalNotes">Motivasyon / Notlar</label>
                                    <textarea class="form-textarea" id="newGoalNotes" rows="3" placeholder="Bu hedefe ulaşmak için izleyeceğiniz strateji..."></textarea>
                                </div>
                            </div>

                            <div class="form-actions">
                                <button type="button" class="btn-secondary" id="btnCancelAdd">İptal</button>
                                <button type="submit" class="btn-primary">Hedefi Kaydet</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        const emptyContainer = document.getElementById('emptyContainer');
        const formContainer = document.getElementById('addGoalFormContainer');
        const btnTrigger = document.getElementById('btnTriggerAddForm');
        const btnCancel = document.getElementById('btnCancelAdd');
        const form = document.getElementById('formNewGoal');

        btnTrigger?.addEventListener('click', () => {
            emptyContainer.style.display = 'none';
            formContainer.style.display = 'block';
            document.getElementById('newGoalTitle')?.focus();
        });

        btnCancel?.addEventListener('click', () => {
            if (goals.length > 0 && activeGoalId !== 'new') {
                renderGoalDetail(activeGoalId);
            } else {
                formContainer.style.display = 'none';
                emptyContainer.style.display = 'flex';
            }
        });

        form?.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = document.getElementById('newGoalTitle').value.trim();
            const category = document.getElementById('newGoalCategory').value;
            const unit = document.getElementById('newGoalUnit').value;
            const startVal = parseFloat(document.getElementById('newGoalStart').value);
            const targetVal = parseFloat(document.getElementById('newGoalTarget').value);
            const currentVal = parseFloat(document.getElementById('newGoalCurrent').value);
            const deadline = document.getElementById('newGoalDeadline').value.trim() || 'Tarih Belirtilmedi';
            const notes = document.getElementById('newGoalNotes').value.trim();

            // Basit validasyon — GlobalModal üzerinden kullanıcıya bildir
            if (isNaN(startVal) || isNaN(targetVal) || isNaN(currentVal)) {
                if (window.GlobalModal) {
                    window.GlobalModal.open({
                        type: 'error',
                        title: 'Eksik Bilgi',
                        description: 'Başlangıç, hedef ve mevcut değer alanları sayısal olmalıdır.',
                        buttons: [{ text: 'Tamam', variant: 'primary', closeOnClick: true }]
                    });
                } else {
                    alert('Başlangıç, hedef ve mevcut değer alanları sayısal olmalıdır.');
                }
                return;
            }

            if (startVal === targetVal) {
                if (window.GlobalModal) {
                    window.GlobalModal.open({
                        type: 'warning',
                        title: 'Geçersiz Hedef',
                        description: 'Başlangıç ve hedef değer aynı olamaz.',
                        buttons: [{ text: 'Tamam', variant: 'primary', closeOnClick: true }]
                    });
                } else {
                    alert('Başlangıç ve hedef değer aynı olamaz.');
                }
                return;
            }

            const percent = recalculatePercent(startVal, currentVal, targetVal);

            const newGoal = {
                id: 'g-' + Date.now(),
                title,
                category,
                startVal,
                currentVal,
                targetVal,
                unit,
                percent,
                status: percent >= 100 ? 'Tamamlandı' : 'Devam Ediyor',
                deadline,
                notes,
                milestones: [
                    { text: 'Hedefe başlandı', done: true },
                    { text: '%50 aşamasına ulaş', done: percent >= 50 },
                    { text: 'Nihai hedefe ulaş (' + targetVal + ' ' + unit + ')', done: percent >= 100 }
                ]
            };

            goals.push(newGoal);
            saveGoals(goals);
            activeGoalId = newGoal.id;
            renderSidebar();
            renderGoalDetail(newGoal.id);

            // Başarı bildirimi — GlobalModal üzerinden
            if (window.GlobalModal) {
                window.GlobalModal.open({
                    type: 'success',
                    title: 'Hedef Eklendi',
                    description: `"${title}" hedefi takip listenize eklendi.`,
                    buttons: [{ text: 'Tamam', variant: 'primary', closeOnClick: true }]
                });
            }
        });
    }

    // Update goal metric
    function updateGoalMetric(goalId, newVal) {
        const goal = goals.find(g => g.id === goalId);
        if (!goal) return;

        goal.currentVal = newVal;
        goal.percent = recalculatePercent(goal.startVal, goal.currentVal, goal.targetVal);
        if (goal.percent >= 100) {
            goal.status = 'Tamamlandı';
        } else if (goal.status === 'Tamamlandı' && goal.percent < 100) {
            goal.status = 'Devam Ediyor';
        }

        saveGoals(goals);
        renderSidebar();
        renderGoalDetail(goal.id);
    }

    // Calculate percentage based on target direction
    function recalculatePercent(start, current, target) {
        if (start === target) return 100;
        let progress;
        if (target < start) {
            // Decreasing goal (e.g. weight loss: 80 -> 70)
            progress = ((start - current) / (start - target)) * 100;
        } else {
            // Increasing goal (e.g. muscle mass: 50 -> 60)
            progress = ((current - start) / (target - start)) * 100;
        }
        return Math.max(0, Math.min(100, Math.round(progress)));
    }

    // Escape HTML utility
    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Global Events
    function bindGlobalEvents() {
        // "+ Yeni Hedef Ekle" button in sidebar
        btnAddGoalSidebar?.addEventListener('click', () => {
            activeGoalId = 'new';
            renderSidebar();
            renderEmptyOrAddView();
            // Automatically reveal the form
            setTimeout(() => {
                const emptyBox = document.getElementById('emptyContainer');
                if (emptyBox) emptyBox.style.display = 'none';
                const formBox = document.getElementById('addGoalFormContainer');
                if (formBox) formBox.style.display = 'block';
                document.getElementById('newGoalTitle')?.focus();
            }, 50);
            closeSidebar();
        });

        // Mobile drawer toggles
        mobileMenuBtn?.addEventListener('click', openSidebar);
        sidebarCloseBtn?.addEventListener('click', closeSidebar);
        overlay?.addEventListener('click', closeSidebar);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeSidebar();
        });
    }

    function openSidebar() {
        sidebar?.classList.add('is-open');
        overlay?.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
        sidebar?.classList.remove('is-open');
        overlay?.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
