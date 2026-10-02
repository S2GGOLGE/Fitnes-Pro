/**
 * =========================================================
 * FITNESS PRO — PROGRESS (İLERLEMEM) PAGE CONTROLLER
 * =========================================================
 * Frontend-only controller:
 * - Mock progress data (API-ready structure)
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

    const progressData = {

        /** Measurement snapshots keyed by period filter */
        periods: {
            /** Son 30 Gün — July 30 → Aug 28 */
            "30d": {
                initial: {
                    date: "30 Temmuz 2026",
                    weight: 75.8,
                    fat: 21,
                    muscle: 57.0,
                    measurements: { chest: 100, waist: 87, arm: 34, leg: 56, shoulder: 114 }
                },
                current: {
                    date: "28 Ağustos 2026",
                    weight: 74.2,
                    fat: 19,
                    muscle: 57.8,
                    measurements: { chest: 103, waist: 84, arm: 36, leg: 58, shoulder: 116 }
                },
                bodyStatus: { label: "Hızlı İlerleme", percent: 72,
                    desc: "Son 30 günde yağ kaybı ve kas gelişimi açısından iyi bir ivme yakaladın." }
            },
            /** Son 3 Ay — June 1 → Aug 28  (using earliest data as proxy) */
            "3m": {
                initial: {
                    date: "01 Haziran 2026",
                    weight: 80.2,
                    fat: 26,
                    muscle: 55.4,
                    measurements: { chest: 96, waist: 94, arm: 31, leg: 53, shoulder: 110 }
                },
                current: {
                    date: "28 Ağustos 2026",
                    weight: 74.2,
                    fat: 19,
                    muscle: 57.8,
                    measurements: { chest: 103, waist: 84, arm: 36, leg: 58, shoulder: 116 }
                },
                bodyStatus: { label: "Çok İyi Gelişim", percent: 88,
                    desc: "3 aylık süreçte belirgin fiziksel dönüşüm gerçekleşti." }
            },
            /** Son 6 Ay — March 1 → Aug 28 */
            "6m": {
                initial: {
                    date: "01 Mart 2026",
                    weight: 84.0,
                    fat: 29,
                    muscle: 54.0,
                    measurements: { chest: 94, waist: 98, arm: 30, leg: 52, shoulder: 108 }
                },
                current: {
                    date: "28 Ağustos 2026",
                    weight: 74.2,
                    fat: 19,
                    muscle: 57.8,
                    measurements: { chest: 103, waist: 84, arm: 36, leg: 58, shoulder: 116 }
                },
                bodyStatus: { label: "Mükemmel Dönüşüm", percent: 96,
                    desc: "6 aylık süreçte hedefine büyük oranda ulaştın. Harika bir performans!" }
            },
            /** Tümü — July 1 → Aug 28 */
            "all": {
                initial: {
                    date: "01 Temmuz 2026",
                    weight: 78.5,
                    fat: 24,
                    muscle: 56.2,
                    measurements: { chest: 98, waist: 91, arm: 32, leg: 54, shoulder: 112 }
                },
                current: {
                    date: "28 Ağustos 2026",
                    weight: 74.2,
                    fat: 19,
                    muscle: 57.8,
                    measurements: { chest: 103, waist: 84, arm: 36, leg: 58, shoulder: 116 }
                },
                bodyStatus: { label: "İyi Gelişim", percent: 84,
                    desc: "Başlangıç ölçümüne göre fiziksel gelişimin hedeflerine doğru ilerliyor." }
            }
        },

        /** Timeline snapshots (for "all" period — July 1 to Aug 28) */
        timeline: [
            {
                id: 0,
                label: "01 Tem",
                fullDate: "01 Temmuz 2026",
                weight: 78.5,
                fat: 24,
                waist: 91,
                muscle: 56.2
            },
            {
                id: 1,
                label: "15 Tem",
                fullDate: "15 Temmuz 2026",
                weight: 77.1,
                fat: 23,
                waist: 89,
                muscle: 56.5
            },
            {
                id: 2,
                label: "01 Ağu",
                fullDate: "01 Ağustos 2026",
                weight: 75.8,
                fat: 21,
                waist: 87,
                muscle: 57.0
            },
            {
                id: 3,
                label: "15 Ağu",
                fullDate: "15 Ağustos 2026",
                weight: 74.8,
                fat: 20,
                waist: 85,
                muscle: 57.5
            },
            {
                id: 4,
                label: "28 Ağu",
                fullDate: "28 Ağustos 2026",
                weight: 74.2,
                fat: 19,
                waist: 84,
                muscle: 57.8
            }
        ],

        /** Hotspot region definitions */
        hotspots: {
            chest: {
                label: "Göğüs",
                field: "chest",
                unit: "cm",
                positiveIsGain: true   // bigger chest = improvement
            },
            waist: {
                label: "Bel",
                field: "waist",
                unit: "cm",
                positiveIsGain: false  // smaller waist = improvement
            },
            arm: {
                label: "Kol",
                field: "arm",
                unit: "cm",
                positiveIsGain: true
            },
            leg: {
                label: "Bacak",
                field: "leg",
                unit: "cm",
                positiveIsGain: true
            },
            shoulder: {
                label: "Omuz",
                field: "shoulder",
                unit: "cm",
                positiveIsGain: true
            }
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
        if (panelInitialDate)   panelInitialDate.textContent   = initial.date;
        if (panelInitialWeight) panelInitialWeight.textContent = initial.weight;
        if (initFat)            initFat.textContent            = `%${initial.fat}`;
        if (initMuscle)         initMuscle.textContent         = `${initial.muscle} kg`;
        if (initChest)          initChest.textContent          = `${initial.measurements.chest} cm`;
        if (initWaist)          initWaist.textContent          = `${initial.measurements.waist} cm`;
        if (initArm)            initArm.textContent            = `${initial.measurements.arm} cm`;
        if (initLeg)            initLeg.textContent            = `${initial.measurements.leg} cm`;
        if (initShoulder)       initShoulder.textContent       = `${initial.measurements.shoulder} cm`;

        // Right panel
        if (panelCurrentDate)   panelCurrentDate.textContent   = current.date;
        if (panelCurrentWeight) panelCurrentWeight.textContent = current.weight;
        if (curFat)             curFat.textContent             = `%${current.fat}`;
        if (curMuscle)          curMuscle.textContent          = `${current.muscle} kg`;
        if (curChest)           curChest.textContent           = `${current.measurements.chest} cm`;
        if (curWaist)           curWaist.textContent           = `${current.measurements.waist} cm`;
        if (curArm)             curArm.textContent             = `${current.measurements.arm} cm`;
        if (curLeg)             curLeg.textContent             = `${current.measurements.leg} cm`;
        if (curShoulder)        curShoulder.textContent        = `${current.measurements.shoulder} cm`;

        // Weight delta banner
        const wDiff = (current.weight - initial.weight).toFixed(1);
        const wSign = wDiff < 0 ? "−" : "+";
        if (deltaFrom)  deltaFrom.textContent  = `${initial.weight} kg`;
        if (deltaTo)    deltaTo.textContent    = `${current.weight} kg`;
        if (deltaValue) {
            deltaValue.textContent = `${wSign}${Math.abs(wDiff)} kg`;
            deltaValue.className = `weight-delta-value ${wDiff < 0 ? "negative" : "positive"}`;
        }

        // Change summary cards
        if (summaryWeight)      summaryWeight.textContent      = `${initial.weight} kg → ${current.weight} kg`;
        if (summaryWeightDelta) summaryWeightDelta.textContent = `${wSign}${Math.abs(wDiff)} kg`;
        if (summaryWeightDelta) summaryWeightDelta.className   = `change-delta ${wDiff < 0 ? "negative-delta" : "positive-delta"}`;

        const fDiff = current.fat - initial.fat;
        if (summaryFat)         summaryFat.textContent         = `%${initial.fat} → %${current.fat}`;
        if (summaryFatDelta) {
            summaryFatDelta.textContent = `${fDiff < 0 ? "−" : "+"}${Math.abs(fDiff)} puan`;
            summaryFatDelta.className   = `change-delta ${fDiff < 0 ? "negative-delta" : "positive-delta"}`;
        }

        const bDiff = current.measurements.waist - initial.measurements.waist;
        if (summaryWaist)       summaryWaist.textContent       = `${initial.measurements.waist} cm → ${current.measurements.waist} cm`;
        if (summaryWaistDelta) {
            summaryWaistDelta.textContent = `${bDiff < 0 ? "−" : "+"}${Math.abs(bDiff)} cm`;
            summaryWaistDelta.className   = `change-delta ${bDiff < 0 ? "negative-delta" : "positive-delta"}`;
        }

        const mDiff = (current.muscle - initial.muscle).toFixed(1);
        if (summaryMuscle)      summaryMuscle.textContent      = `${initial.muscle} kg → ${current.muscle} kg`;
        if (summaryMuscleDelta) {
            summaryMuscleDelta.textContent = `${mDiff > 0 ? "+" : "−"}${Math.abs(mDiff)} kg`;
            summaryMuscleDelta.className   = `change-delta ${mDiff > 0 ? "positive-delta" : "negative-delta"}`;
        }

        // Body status bar
        if (statusLabel)   statusLabel.textContent        = bodyStatus.label;
        if (statusDesc)    statusDesc.textContent         = bodyStatus.desc;
        if (statusPercent) statusPercent.textContent      = `${bodyStatus.percent}%`;
        if (statusBarFill) statusBarFill.style.width      = `${bodyStatus.percent}%`;
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
        const point = progressData.timeline[pointIndex];
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
        const initVal  = data.initial.measurements[region.field];
        const curVal   = data.current.measurements[region.field];
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

});
