/**
 * =========================================================
 * FITNESS PRO — PROGRESS (İLERLEMEM) PAGE CONTROLLER
 * =========================================================
 * Frontend-only controller:
 * - Progress data management (API-ready structure)
 * - Sidebar / mobile menu (same logic as index.js)
 * - Date period filter (30d / 3m / 6m / all)
 * - Body hotspot tooltip interaction
 * - Timeline point selection & live data update
 * - No backend / API / fetch calls
 */

document.addEventListener("DOMContentLoaded", () => {
    // Auth Guard
    if (window.Auth && !window.Auth.requireAuth()) {
        return;
    }

    if (window.Auth) {
        window.Auth.syncAuthUI();
    }

    function getStoredProgress() {
        try {
            const raw = localStorage.getItem('fitness_pro_progress');
            if (raw) return JSON.parse(raw);
        } catch (e) {}
        return null;
    }

    const savedProgress = getStoredProgress();

    const emptyPeriod = {
        initial: {
            date: '-',
            weight: 0,
            fat: 0,
            muscle: 0,
            measurements: { chest: 0, waist: 0, arm: 0, leg: 0, shoulder: 0 }
        },
        current: {
            date: '-',
            weight: 0,
            fat: 0,
            muscle: 0,
            measurements: { chest: 0, waist: 0, arm: 0, leg: 0, shoulder: 0 }
        },
        bodyStatus: {
            label: 'Ölçüm Bekleniyor',
            percent: 0,
            desc: 'Henüz vücut ölçümü kaydedilmedi. İlerlemenizi görmek için ilk ölçümünüzü girin.'
        }
    };

    const progressData = savedProgress || {
        periods: {
            '30d': emptyPeriod,
            '3m': emptyPeriod,
            '6m': emptyPeriod,
            'all': emptyPeriod
        },
        timeline: [],
        hotspots: {
            chest: { label: 'Göğüs', field: 'chest', unit: 'cm', positiveIsGain: true },
            waist: { label: 'Bel', field: 'waist', unit: 'cm', positiveIsGain: false },
            arm: { label: 'Kol', field: 'arm', unit: 'cm', positiveIsGain: true },
            leg: { label: 'Bacak', field: 'leg', unit: 'cm', positiveIsGain: true },
            shoulder: { label: 'Omuz', field: 'shoulder', unit: 'cm', positiveIsGain: true }
        }
    };
    /* =========================================================
       2.  DOM REFERENCES
       ========================================================= */

    // Sidebar
    const sidebar        = document.getElementById("sidebar");
    const sidebarToggle  = document.getElementById("sidebarToggle");
    const mobileMenuBtn  = document.getElementById("mobileMenuBtn");
    const sidebarOverlay = document.getElementById("sidebarOverlay");
    const logoutBtn      = document.getElementById("logoutBtn");
    const currentDateEl  = document.getElementById("currentDate");

    // Period filter
    const periodBtns = document.querySelectorAll(".date-filter-btn");

    // Left panel (initial)
    const panelInitialDate = document.getElementById("panelInitialDate");
    const panelInitialWeight = document.getElementById("panelInitialWeight");
    const initFat      = document.getElementById("initFat");
    const initMuscle   = document.getElementById("initMuscle");
    const initChest    = document.getElementById("initChest");
    const initWaist    = document.getElementById("initWaist");
    const initArm      = document.getElementById("initArm");
    const initLeg      = document.getElementById("initLeg");
    const initShoulder = document.getElementById("initShoulder");

    // Right panel (current)
    const panelCurrentDate   = document.getElementById("panelCurrentDate");
    const panelCurrentWeight = document.getElementById("panelCurrentWeight");
    const curFat      = document.getElementById("curFat");
    const curMuscle   = document.getElementById("curMuscle");
    const curChest    = document.getElementById("curChest");
    const curWaist    = document.getElementById("curWaist");
    const curArm      = document.getElementById("curArm");
    const curLeg      = document.getElementById("curLeg");
    const curShoulder = document.getElementById("curShoulder");

    // Weight delta banner
    const deltaFrom  = document.getElementById("deltaFrom");
    const deltaTo    = document.getElementById("deltaTo");
    const deltaValue = document.getElementById("deltaValue");

    // Change summary cards
    const summaryWeight      = document.getElementById("summaryWeight");
    const summaryWeightDelta = document.getElementById("summaryWeightDelta");
    const summaryFat         = document.getElementById("summaryFat");
    const summaryFatDelta    = document.getElementById("summaryFatDelta");
    const summaryWaist       = document.getElementById("summaryWaist");
    const summaryWaistDelta  = document.getElementById("summaryWaistDelta");
    const summaryMuscle      = document.getElementById("summaryMuscle");
    const summaryMuscleDelta = document.getElementById("summaryMuscleDelta");

    // Body status
    const statusBarFill = document.getElementById("statusBarFill");
    const statusPercent = document.getElementById("statusPercent");
    const statusLabel   = document.getElementById("statusLabel");
    const statusDesc    = document.getElementById("statusDesc");

    // Timeline
    const timelineItems      = document.querySelectorAll(".timeline-item");
    const timelineDetailCard = document.getElementById("timelineDetailCard");
    const tlDetailDate       = document.getElementById("tlDetailDate");
    const tlDetailWeight     = document.getElementById("tlDetailWeight");
    const tlDetailFat        = document.getElementById("tlDetailFat");
    const tlDetailWaist      = document.getElementById("tlDetailWaist");
    const tlDetailMuscle     = document.getElementById("tlDetailMuscle");

    // Hotspot tooltip
    const hotspotGroups    = document.querySelectorAll(".hotspot-group");
    const measureTooltip   = document.getElementById("measurementTooltip");
    const tooltipRegion    = document.getElementById("tooltipRegion");
    const tooltipInitVal   = document.getElementById("tooltipInitVal");
    const tooltipCurVal    = document.getElementById("tooltipCurVal");
    const tooltipDelta     = document.getElementById("tooltipDelta");

    /* =========================================================
       3.  APP STATE
       ========================================================= */

    let activePeriod = "all";
    let activeTimelinePoint = 0;   // index into progressData.timeline

    /* =========================================================
       4.  DATE
       ========================================================= */

    (function initDate() {
        const now = new Date();
        const fmt = now.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
        if (currentDateEl) currentDateEl.textContent = fmt;
    })();

    /* =========================================================
       5.  SIDEBAR (same logic as index.js)
       ========================================================= */

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener("click", () => {
            if (window.innerWidth <= 800) return;
            sidebar.classList.toggle("collapsed");
        });
    }

    function openMobileSidebar() {
        sidebar.classList.add("mobile-open");
        sidebarOverlay.classList.add("active");
        document.body.style.overflow = "hidden";
    }

    function closeMobileSidebar() {
        sidebar.classList.remove("mobile-open");
        sidebarOverlay.classList.remove("active");
        document.body.style.overflow = "";
    }

    if (mobileMenuBtn)   mobileMenuBtn.addEventListener("click", openMobileSidebar);
    if (sidebarOverlay)  sidebarOverlay.addEventListener("click", closeMobileSidebar);

    document.querySelectorAll(".nav-item").forEach(item => {
        item.addEventListener("click", () => {
            if (window.innerWidth <= 800) closeMobileSidebar();
        });
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 800) closeMobileSidebar();
    });

    if (logoutBtn && !logoutBtn.dataset.authBound) {
        logoutBtn.dataset.authBound = "true";
        logoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            if (window.Auth && typeof window.Auth.confirmLogout === "function") {
                window.Auth.confirmLogout();
                return;
            }

            const performLogout = () => {
                if (window.Auth) {
                    window.Auth.logout(true);
                } else {
                    localStorage.removeItem("fitness_pro_token");
                    localStorage.removeItem("fitness_pro_user");
                    window.location.href = "Login.html";
                }
            };

            if (window.GlobalModal && typeof window.GlobalModal.confirm === "function") {
                window.GlobalModal.confirm({
                    title: "Çıkış Yap",
                    description: "Oturumunuz sonlandırılacak. Devam etmek istiyor musunuz?",
                    buttons: [
                        { text: "İptal", variant: "secondary" },
                        {
                            text: "Çıkış Yap",
                            variant: "danger",
                            callback: () => performLogout()
                        }
                    ]
                });
            }
        });
    }

    /* =========================================================
       6.  RENDER PERIOD DATA
       ========================================================= */

    function renderPeriod(periodKey) {
        const data = progressData.periods[periodKey];
        if (!data) return;

        const { initial, current, bodyStatus } = data;

        // Left panel
        if (panelInitialDate)   panelInitialDate.textContent   = initial.date || '-';
        if (panelInitialWeight) panelInitialWeight.textContent = initial.weight ? ${initial.weight} : '-';
        if (initFat)            initFat.textContent            = initial.fat ? % : '-';
        if (initMuscle)         initMuscle.textContent         = initial.muscle ? ${initial.muscle} kg : '-';
        if (initChest)          initChest.textContent          = initial.measurements?.chest ? ${initial.measurements.chest} cm : '-';
        if (initWaist)          initWaist.textContent          = initial.measurements?.waist ? ${initial.measurements.waist} cm : '-';
        if (initArm)            initArm.textContent            = initial.measurements?.arm ? ${initial.measurements.arm} cm : '-';
        if (initLeg)            initLeg.textContent            = initial.measurements?.leg ? ${initial.measurements.leg} cm : '-';
        if (initShoulder)       initShoulder.textContent       = initial.measurements?.shoulder ? ${initial.measurements.shoulder} cm : '-';

        // Right panel
        if (panelCurrentDate)   panelCurrentDate.textContent   = current.date || '-';
        if (panelCurrentWeight) panelCurrentWeight.textContent = current.weight ? ${current.weight} : '-';
        if (curFat)             curFat.textContent             = current.fat ? % : '-';
        if (curMuscle)          curMuscle.textContent          = current.muscle ? ${current.muscle} kg : '-';
        if (curChest)           curChest.textContent           = current.measurements?.chest ? ${current.measurements.chest} cm : '-';
        if (curWaist)           curWaist.textContent           = current.measurements?.waist ? ${current.measurements.waist} cm : '-';
        if (curArm)             curArm.textContent             = current.measurements?.arm ? ${current.measurements.arm} cm : '-';
        if (curLeg)             curLeg.textContent             = current.measurements?.leg ? ${current.measurements.leg} cm : '-';
        if (curShoulder)        curShoulder.textContent        = current.measurements?.shoulder ? ${current.measurements.shoulder} cm : '-';

        // Weight delta banner & summary
        if (!initial.weight && !current.weight) {
            if (deltaFrom)  deltaFrom.textContent  = '-';
            if (deltaTo)    deltaTo.textContent    = '-';
            if (deltaValue) {
                deltaValue.textContent = '0 kg';
                deltaValue.className = 'weight-delta-value';
            }
            if (summaryWeight)      summaryWeight.textContent      = '-';
            if (summaryWeightDelta) summaryWeightDelta.textContent = '0 kg';
            if (summaryFat)         summaryFat.textContent         = '-';
            if (summaryFatDelta)    summaryFatDelta.textContent    = '0 puan';
            if (summaryWaist)       summaryWaist.textContent       = '-';
            if (summaryWaistDelta)  summaryWaistDelta.textContent  = '0 cm';
            if (summaryMuscle)      summaryMuscle.textContent      = '-';
            if (summaryMuscleDelta) summaryMuscleDelta.textContent = '0 kg';
        } else {
            const wDiff = (current.weight - initial.weight).toFixed(1);
            const wSign = wDiff < 0 ? '−' : '+';
            if (deltaFrom)  deltaFrom.textContent  = ${initial.weight} kg;
            if (deltaTo)    deltaTo.textContent    = ${current.weight} kg;
            if (deltaValue) {
                deltaValue.textContent = ${wSign} kg;
                deltaValue.className = weight-delta-value ;
            }

            if (summaryWeight)      summaryWeight.textContent      = ${initial.weight} kg →  kg;
            if (summaryWeightDelta) summaryWeightDelta.textContent = ${wSign} kg;
            if (summaryWeightDelta) summaryWeightDelta.className   = change-delta ;

            const fDiff = current.fat - initial.fat;
            if (summaryFat)         summaryFat.textContent         = % → %;
            if (summaryFatDelta) {
                summaryFatDelta.textContent = ${fDiff < 0 ? '−' : '+'} puan;
                summaryFatDelta.className   = change-delta ;
            }

            const bDiff = current.measurements.waist - initial.measurements.waist;
            if (summaryWaist)       summaryWaist.textContent       = ${initial.measurements.waist} cm →  cm;
            if (summaryWaistDelta) {
                summaryWaistDelta.textContent = ${bDiff < 0 ? '−' : '+'} cm;
                summaryWaistDelta.className   = change-delta ;
            }

            const mDiff = (current.muscle - initial.muscle).toFixed(1);
            if (summaryMuscle)      summaryMuscle.textContent      = ${initial.muscle} kg →  kg;
            if (summaryMuscleDelta) {
                summaryMuscleDelta.textContent = ${mDiff > 0 ? '+' : '−'} kg;
                summaryMuscleDelta.className   = change-delta ;
            }
        }

        // Body status bar
        if (statusLabel)   statusLabel.textContent        = bodyStatus.label;
        if (statusDesc)    statusDesc.textContent         = bodyStatus.desc;
        if (statusPercent) statusPercent.textContent      = ${bodyStatus.percent}%;
        if (statusBarFill) statusBarFill.style.width      = ${bodyStatus.percent}%;
    }

    // Initial render
    renderPeriod(activePeriod);

    /* =========================================================
       7.  PERIOD FILTER BUTTONS
       ========================================================= */

    periodBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            periodBtns.forEach(b => {
                b.classList.remove("active");
                b.setAttribute("aria-selected", "false");
            });
            btn.classList.add("active");
            btn.setAttribute("aria-selected", "true");

            activePeriod = btn.getAttribute("data-period");
            renderPeriod(activePeriod);
        });
    });

    /* =========================================================
       8.  TIMELINE INTERACTION
       ========================================================= */

    function renderTimelinePoint(pointIndex) {
        if (!progressData.timeline || progressData.timeline.length === 0) {
            if (tlDetailDate)   tlDetailDate.textContent   = '-';
            if (tlDetailWeight) tlDetailWeight.textContent = '- kg';
            if (tlDetailFat)    tlDetailFat.textContent    = '-';
            if (tlDetailWaist)  tlDetailWaist.textContent  = '- cm';
            if (tlDetailMuscle) tlDetailMuscle.textContent = '- kg';
            return;
        }

        const point = progressData.timeline[pointIndex];
        if (!point) return;
        if (!point) return;

        // Update detail card
        if (tlDetailDate)   tlDetailDate.textContent   = point.fullDate;
        if (tlDetailWeight) tlDetailWeight.textContent = `${point.weight} kg`;
        if (tlDetailFat)    tlDetailFat.textContent    = `%${point.fat}`;
        if (tlDetailWaist)  tlDetailWaist.textContent  = `${point.waist} cm`;
        if (tlDetailMuscle) tlDetailMuscle.textContent = `${point.muscle} kg`;

        // Highlight selected item
        timelineItems.forEach((item, idx) => {
            item.classList.toggle("active", idx === pointIndex);
        });
    }

    timelineItems.forEach((item, idx) => {
        item.addEventListener("click", () => {
            activeTimelinePoint = idx;
            renderTimelinePoint(idx);
        });

        item.addEventListener("keydown", e => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                activeTimelinePoint = idx;
                renderTimelinePoint(idx);
            }
        });
    });

    // Show initial timeline point
    renderTimelinePoint(activeTimelinePoint);

    /* =========================================================
       9.  HOTSPOT TOOLTIP
       ========================================================= */

    let tooltipActive = false;
    let tooltipTimer  = null;

    function getHotspotData(regionKey) {
        const region   = progressData.hotspots[regionKey];
        if (!region) return null;

        const data     = progressData.periods[activePeriod];
        if (!data || !data.initial || !data.current || !data.initial.measurements) return null;
        const initVal  = data.initial.measurements[region.field] || 0;
        const curVal   = data.current.measurements[region.field] || 0;
        if (initVal === 0 && curVal === 0) return null;
        const diff     = curVal - initVal;
        const sign     = diff > 0 ? "+" : "−";
        const isPositive = region.positiveIsGain ? diff > 0 : diff < 0;

        return {
            label:     region.label,
            initText:  `${initVal} ${region.unit}`,
            curText:   `${curVal} ${region.unit}`,
            deltaText: `${sign}${Math.abs(diff)} ${region.unit}`,
            isPositive
        };
    }

    function showTooltip(hotspotEl, regionKey) {
        const info = getHotspotData(regionKey);
        if (!info) return;

        if (tooltipRegion) tooltipRegion.textContent = info.label;
        if (tooltipInitVal) tooltipInitVal.textContent = info.initText;
        if (tooltipCurVal)  tooltipCurVal.textContent  = info.curText;
        if (tooltipDelta) {
            tooltipDelta.textContent = info.deltaText;
            tooltipDelta.style.color = info.isPositive ? "var(--primary)" : "var(--accent-red)";
        }

        // Position tooltip near the hotspot
        positionTooltip(hotspotEl);

        measureTooltip.classList.remove("hidden");
        tooltipActive = true;
    }

    function hideTooltip() {
        if (!tooltipActive) return;
        tooltipActive = false;
        measureTooltip.classList.add("hidden");
    }

    function positionTooltip(targetEl) {
        const rect   = targetEl.getBoundingClientRect();
        const tip    = measureTooltip;
        const margin = 12;

        // First make visible off-screen to measure size
        tip.style.visibility = "hidden";
        tip.classList.remove("hidden");
        const tipW = tip.offsetWidth  || 190;
        const tipH = tip.offsetHeight || 120;
        tip.style.visibility = "";

        let left = rect.right + margin;
        let top  = rect.top + rect.height / 2 - tipH / 2;

        // Flip to left if not enough room on right
        if (left + tipW + 10 > window.innerWidth) {
            left = rect.left - tipW - margin;
        }

        // Clamp vertically
        top = Math.max(10, Math.min(top, window.innerHeight - tipH - 10));

        tip.style.left = `${left}px`;
        tip.style.top  = `${top}px`;
    }

    hotspotGroups.forEach(group => {
        const regionKey = group.getAttribute("data-region");

        // Mouse hover
        group.addEventListener("mouseenter", () => {
            clearTimeout(tooltipTimer);
            showTooltip(group, regionKey);
        });

        group.addEventListener("mouseleave", () => {
            tooltipTimer = setTimeout(hideTooltip, 220);
        });

        // Click / touch
        group.addEventListener("click", (e) => {
            e.stopPropagation();
            if (tooltipActive && measureTooltip.getAttribute("data-current-region") === regionKey) {
                hideTooltip();
            } else {
                measureTooltip.setAttribute("data-current-region", regionKey);
                showTooltip(group, regionKey);
            }
        });

        // Keyboard
        group.addEventListener("keydown", e => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                if (tooltipActive) hideTooltip();
                else showTooltip(group, regionKey);
            }
            if (e.key === "Escape") hideTooltip();
        });
    });

    // Tooltip hover (keep open when cursor is on tooltip)
    if (measureTooltip) {
        measureTooltip.addEventListener("mouseenter", () => clearTimeout(tooltipTimer));
        measureTooltip.addEventListener("mouseleave", () => {
            tooltipTimer = setTimeout(hideTooltip, 180);
        });
    }

    // Click outside closes tooltip
    document.addEventListener("click", (e) => {
        if (!measureTooltip.contains(e.target) && !e.target.closest(".hotspot-group")) {
            hideTooltip();
        }
    });

    /* =========================================================
       10.  ESCAPE KEY — close tooltip & mobile sidebar
       ========================================================= */

    document.addEventListener("keydown", e => {
        if (e.key === "Escape") {
            hideTooltip();
            if (window.innerWidth <= 800) closeMobileSidebar();
        }
    });

    /* =========================================================
       FOTOĞRAF ÖNİZLEME (Frontend-only)
       Backend entegrasyonu beklenmediği için dosyalar sadece
       yerel olarak okunur ve <img> önizlemesinde gösterilir.
       ========================================================= */

    const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
    const ALLOWED_PHOTO_TYPES = /^image\/(png|jpeg|jpg|webp)$/i;

    function bindPhotoUpload(input) {
        if (!input) return;
        const targetId = input.getAttribute("data-preview-target");
        const preview = targetId ? document.getElementById(targetId) : null;
        if (!preview) return;

        input.addEventListener("change", event => {
            const file = event.target.files && event.target.files[0];
            if (!file) {
                preview.hidden = true;
                preview.removeAttribute("src");
                return;
            }

            if (!ALLOWED_PHOTO_TYPES.test(file.type)) {
                if (window.GlobalModal && typeof window.GlobalModal.alert === "function") {
                    window.GlobalModal.alert({
                        type: "error",
                        title: "Geçersiz dosya",
                        message: "Lütfen PNG, JPG veya WEBP formatında bir görsel seçin."
                    });
                }
                input.value = "";
                return;
            }

            if (file.size > MAX_PHOTO_SIZE_BYTES) {
                if (window.GlobalModal && typeof window.GlobalModal.alert === "function") {
                    window.GlobalModal.alert({
                        type: "error",
                        title: "Dosya çok büyük",
                        message: "Fotoğraf 5 MB sınırını aşmamalıdır."
                    });
                }
                input.value = "";
                return;
            }

            const reader = new FileReader();
            reader.onload = ev => {
                preview.src = String(ev.target.result || "");
                preview.hidden = false;
            };
            reader.onerror = () => {
                if (window.GlobalModal && typeof window.GlobalModal.alert === "function") {
                    window.GlobalModal.alert({
                        type: "error",
                        title: "Önizleme yüklenemedi",
                        message: "Dosya okunurken bir hata oluştu."
                    });
                }
            };
            reader.readAsDataURL(file);
        });
    }

    document.querySelectorAll(".ba-photo-input").forEach(bindPhotoUpload);


    /* =========================================================
       BOY, KİLO VE YAŞ GÜNCELLEME İKİ AŞAMALI MODAL
       ========================================================= */
    const btnOpenMeasureModal = document.getElementById("btnOpenMeasureModal");

    function getPhysicalStatsKey() {
        const user = window.Auth && typeof window.Auth.getUser === "function" ? window.Auth.getUser() : null;
        const uid = user && (user.id || user.userId || user.username) ? (user.id || user.userId || user.username) : "default";
        return `fitness_pro_physical_stats_${uid}`;
    }

    function loadSavedPhysicalStats() {
        try {
            const raw = localStorage.getItem(getPhysicalStatsKey());
            if (raw) return JSON.parse(raw);
        } catch (e) {}
        return null;
    }

    function savePhysicalStats(stats) {
        try {
            localStorage.setItem(getPhysicalStatsKey(), JSON.stringify(stats));
        } catch (e) {}
    }

    let tempPhysicalStats = loadSavedPhysicalStats() || {
        height: 178,
        weight: 75.0,
        age: 26,
        updatedAt: new Date().toISOString()
    };

    function applyPhysicalStatsToUI(stats) {
        if (!stats) return;
        const formattedDate = new Date(stats.updatedAt || new Date()).toLocaleDateString("tr-TR", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });

        if (panelCurrentWeight) panelCurrentWeight.textContent = String(stats.weight || "-");
        if (panelCurrentDate) panelCurrentDate.textContent = formattedDate;
        if (deltaTo) deltaTo.textContent = `${stats.weight} kg`;
        if (summaryWeight) summaryWeight.textContent = `${stats.weight} kg`;
        
        // Initial vs Current diff
        const initW = parseFloat(panelInitialWeight?.textContent) || (stats.weight - 2.5);
        if (panelInitialWeight && (!panelInitialWeight.textContent || panelInitialWeight.textContent === "-")) {
            panelInitialWeight.textContent = String(initW.toFixed(1));
        }
        if (panelInitialDate && (!panelInitialDate.textContent || panelInitialDate.textContent === "-")) {
            const initDateObj = new Date();
            initDateObj.setDate(initDateObj.getDate() - 30);
            panelInitialDate.textContent = initDateObj.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
        }
        const diff = (stats.weight - initW).toFixed(1);
        if (deltaValue) {
            deltaValue.textContent = `${diff > 0 ? "+" : ""}${diff} kg`;
            deltaValue.className = `weight-delta-value ${diff < 0 ? "loss" : "gain"}`;
        }
        if (summaryWeightDelta) {
            summaryWeightDelta.textContent = `${diff > 0 ? "+" : ""}${diff} kg`;
        }
    }

    // Apply saved stats on init
    applyPhysicalStatsToUI(tempPhysicalStats);

    // Open Two-Step Measure Modal
    function openMeasureModal() {
        if (!window.GlobalModal) return;

        let step1Data = {
            height: tempPhysicalStats.height || 178,
            weight: tempPhysicalStats.weight || 75.0,
            age: tempPhysicalStats.age || 26
        };

        function renderStep1() {
            const content = document.createElement("div");
            content.className = "measure-modal-step";
            content.innerHTML = `
                <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 8px;">
                    Adım 1/2: Güncel fiziksel değerlerinizi girin.
                </p>
                <div class="measure-input-group">
                    <label for="inputMeasureHeight">Boy</label>
                    <div class="measure-input-wrapper">
                        <input type="number" id="inputMeasureHeight" min="100" max="250" step="1" value="${step1Data.height}" placeholder="178" required>
                        <span class="measure-unit">cm</span>
                    </div>
                    <span class="measure-error-msg" id="errMeasureHeight">Lütfen 100 - 250 cm arası geçerli bir boy girin.</span>
                </div>

                <div class="measure-input-group">
                    <label for="inputMeasureWeight">Kilo</label>
                    <div class="measure-input-wrapper">
                        <input type="number" id="inputMeasureWeight" min="30" max="300" step="0.1" value="${step1Data.weight}" placeholder="75.0" required>
                        <span class="measure-unit">kg</span>
                    </div>
                    <span class="measure-error-msg" id="errMeasureWeight">Lütfen 30 - 300 kg arası geçerli bir kilo girin.</span>
                </div>

                <div class="measure-input-group">
                    <label for="inputMeasureAge">Yaş</label>
                    <div class="measure-input-wrapper">
                        <input type="number" id="inputMeasureAge" min="10" max="120" step="1" value="${step1Data.age}" placeholder="26" required>
                        <span class="measure-unit">yaş</span>
                    </div>
                    <span class="measure-error-msg" id="errMeasureAge">Lütfen 10 - 120 arası geçerli bir yaş girin.</span>
                </div>
            `;

            window.GlobalModal.open({
                type: "info",
                title: "Fiziksel Değerleri Güncelle",
                description: "Vücut gelişiminizi takip etmek için mevcut boy, kilo ve yaşınızı girin.",
                content,
                buttons: [
                    {
                        text: "İptal",
                        variant: "secondary",
                        closeOnClick: true
                    },
                    {
                        text: "İleri →",
                        variant: "primary",
                        closeOnClick: false,
                        callback: () => {
                            const hInput = document.getElementById("inputMeasureHeight");
                            const wInput = document.getElementById("inputMeasureWeight");
                            const aInput = document.getElementById("inputMeasureAge");

                            const errH = document.getElementById("errMeasureHeight");
                            const errW = document.getElementById("errMeasureWeight");
                            const errA = document.getElementById("errMeasureAge");

                            let isValid = true;

                            const heightVal = parseFloat(hInput?.value);
                            if (isNaN(heightVal) || heightVal < 100 || heightVal > 250) {
                                if (errH) errH.classList.add("visible");
                                isValid = false;
                            } else {
                                if (errH) errH.classList.remove("visible");
                            }

                            const weightVal = parseFloat(wInput?.value);
                            if (isNaN(weightVal) || weightVal < 30 || weightVal > 300) {
                                if (errW) errW.classList.add("visible");
                                isValid = false;
                            } else {
                                if (errW) errW.classList.remove("visible");
                            }

                            const ageVal = parseInt(aInput?.value, 10);
                            if (isNaN(ageVal) || ageVal < 10 || ageVal > 120) {
                                if (errA) errA.classList.add("visible");
                                isValid = false;
                            } else {
                                if (errA) errA.classList.remove("visible");
                            }

                            if (!isValid) return false;

                            step1Data = { height: heightVal, weight: weightVal, age: ageVal };
                            renderStep2(step1Data);
                            return false;
                        }
                    }
                ]
            });
        }

        function renderStep2(data) {
            const bmi = (data.weight / Math.pow(data.height / 100, 2)).toFixed(1);
            let bmiCategory = "Normal Kilolu";
            if (bmi < 18.5) bmiCategory = "Zayıf";
            else if (bmi >= 25 && bmi < 30) bmiCategory = "Fazla Kilolu";
            else if (bmi >= 30) bmiCategory = "Obez";

            const content = document.createElement("div");
            content.className = "measure-modal-step";
            content.innerHTML = `
                <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 8px;">
                    Adım 2/2: Bilgilerinizi kontrol edin ve onaylayın.
                </p>
                <div class="measure-summary-card">
                    <div class="measure-summary-item">
                        <span class="measure-summary-label">Boy:</span>
                        <strong class="measure-summary-val">${data.height} cm</strong>
                    </div>
                    <div class="measure-summary-item">
                        <span class="measure-summary-label">Kilo:</span>
                        <strong class="measure-summary-val">${data.weight} kg</strong>
                    </div>
                    <div class="measure-summary-item">
                        <span class="measure-summary-label">Yaş:</span>
                        <strong class="measure-summary-val">${data.age}</strong>
                    </div>
                    <div class="measure-summary-item">
                        <span class="measure-summary-label">Hesaplanan VKİ (BMI):</span>
                        <strong class="measure-summary-val" style="color: var(--primary);">${bmi} (${bmiCategory})</strong>
                    </div>
                </div>
                <p style="font-size: 12px; color: var(--text-muted); line-height: 1.4;">
                    Değerleri onayladığınızda fiziksel gelişim göstergeleriniz güncellenecektir.
                </p>
            `;

            window.GlobalModal.open({
                type: "confirmation",
                title: "Bilgileri Onayla",
                description: "Girilen fiziksel değerleri kontrol edin.",
                content,
                buttons: [
                    {
                        text: "← Geri Dön",
                        variant: "secondary",
                        closeOnClick: false,
                        callback: () => {
                            renderStep1();
                            return false;
                        }
                    },
                    {
                        text: "Onayla ve Kaydet",
                        variant: "primary",
                        closeOnClick: false,
                        callback: async ({ setLoading, close }) => {
                            setLoading(true);
                            try {
                                // Simulate API / persist user stats
                                await new Promise(r => setTimeout(r, 600));

                                tempPhysicalStats = {
                                    height: data.height,
                                    weight: data.weight,
                                    age: data.age,
                                    updatedAt: new Date().toISOString()
                                };
                                savePhysicalStats(tempPhysicalStats);
                                applyPhysicalStatsToUI(tempPhysicalStats);

                                close("action");

                                window.GlobalModal.alert({
                                    type: "success",
                                    title: "Başarılı",
                                    message: "Fiziksel değerleriniz başarıyla kaydedildi ve gelişim ekranı güncellendi."
                                });
                            } catch (err) {
                                setLoading(false);
                                window.GlobalModal.alert({
                                    type: "error",
                                    title: "Hata",
                                    message: "Değerler kaydedilirken bir hata oluştu. Lütfen tekrar deneyin."
                                });
                            }
                        }
                    }
                ]
            });
        }

        renderStep1();
    }

    if (btnOpenMeasureModal) {
        btnOpenMeasureModal.addEventListener("click", openMeasureModal);
    }

});
