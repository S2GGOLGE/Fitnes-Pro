/**
 * =========================================================
 * FITNESS PRO - WORKOUTS (İDMANLAR) CONTROLLER
 * =========================================================
 * Frontend-only modular controller for workout dashboard:
 * - Data management (ready for API integration)
 * - Realtime filtering, search, and sorting
 * - Dynamic workout cards & empty state rendering
 * - Workout detail modal & new workout modal interactions
 * - Sidebar and mobile menu controller
 */

document.addEventListener("DOMContentLoaded", () => {
    // Auth Guard
    if (window.Auth && !window.Auth.requireAuth()) {
        return;
    }

    if (window.Auth) {
        window.Auth.syncAuthUI();
    }

    const DEFAULT_WORKOUTS = [
        {
            id: "w-1",
            title: "Göğüs & Triceps Güç Odaklı",
            category: "chest",
            categoryLabel: "Göğüs",
            date: "28 Ağustos 2026",
            timestamp: new Date(2026, 7, 28).getTime(),
            durationText: "55 dk",
            durationMinutes: 55,
            exercisesCount: 6,
            setsCount: 18,
            calories: 420,
            level: "Orta",
            status: "Tamamlandı",
            notes: "Bench press ve dips hareketlerinde ağırlık artışı sağlandı.",
            exercises: [
                { name: "Barbell Bench Press", sets: 4, reps: "8-10", weight: "85 kg" },
                { name: "Incline Dumbbell Press", sets: 4, reps: "10-12", weight: "28 kg" },
                { name: "Dips (Ağırlıklı)", sets: 3, reps: "10", weight: "+15 kg" },
                { name: "Cable Fly", sets: 3, reps: "15", weight: "20 kg" },
                { name: "Triceps Pushdown", sets: 4, reps: "12", weight: "35 kg" }
            ]
        },
        {
            id: "w-2",
            title: "Sırt & Biceps Çekiş Seansı",
            category: "back",
            categoryLabel: "Sırt",
            date: "26 Ağustos 2026",
            timestamp: new Date(2026, 7, 26).getTime(),
            durationText: "60 dk",
            durationMinutes: 60,
            exercisesCount: 5,
            setsCount: 17,
            calories: 450,
            level: "İleri",
            status: "Tamamlandı",
            notes: "Deadlift formu korundu, lat pull-down kontrollü negatif.",
            exercises: [
                { name: "Conventional Deadlift", sets: 4, reps: "6", weight: "140 kg" },
                { name: "Pull-ups (Barfiks)", sets: 4, reps: "10", weight: "Vücut Ağırlığı" },
                { name: "Barbell Row", sets: 3, reps: "10", weight: "70 kg" },
                { name: "Barbell Curl", sets: 3, reps: "10-12", weight: "35 kg" },
                { name: "Hammer Curl", sets: 3, reps: "12", weight: "16 kg" }
            ]
        },
        {
            id: "w-3",
            title: "Bacak & Kalf Hipertrofi",
            category: "leg",
            categoryLabel: "Bacak",
            date: "24 Ağustos 2026",
            timestamp: new Date(2026, 7, 24).getTime(),
            durationText: "65 dk",
            durationMinutes: 65,
            exercisesCount: 6,
            setsCount: 20,
            calories: 520,
            level: "İleri",
            status: "Tamamlandı",
            notes: "Squat derinliği tam paralel, son sette drop set.",
            exercises: [
                { name: "Barbell Back Squat", sets: 4, reps: "8", weight: "110 kg" },
                { name: "Romanian Deadlift", sets: 4, reps: "10", weight: "90 kg" },
                { name: "Leg Press", sets: 4, reps: "12", weight: "200 kg" },
                { name: "Leg Extension", sets: 3, reps: "15", weight: "60 kg" },
                { name: "Standing Calf Raise", sets: 5, reps: "15", weight: "80 kg" }
            ]
        },
        {
            id: "w-4",
            title: "Omuz & Trapez Gelişimi",
            category: "shoulder",
            categoryLabel: "Omuz",
            date: "22 Ağustos 2026",
            timestamp: new Date(2026, 7, 22).getTime(),
            durationText: "50 dk",
            durationMinutes: 50,
            exercisesCount: 5,
            setsCount: 16,
            calories: 380,
            level: "Orta",
            status: "Tamamlandı",
            notes: "Lateral raise kontrollü tempo, omuz başları iyi izole edildi.",
            exercises: [
                { name: "Overhead Military Press", sets: 4, reps: "8-10", weight: "55 kg" },
                { name: "Dumbbell Lateral Raise", sets: 4, reps: "15", weight: "12 kg" },
                { name: "Face Pull", sets: 4, reps: "15", weight: "30 kg" },
                { name: "Reverse Pec Deck", sets: 4, reps: "12", weight: "40 kg" }
            ]
        },
        {
            id: "w-5",
            title: "Tüm Vücut Fonksiyonel Kuvvet",
            category: "full-body",
            categoryLabel: "Tüm Vücut",
            date: "20 Ağustos 2026",
            timestamp: new Date(2026, 7, 20).getTime(),
            durationText: "55 dk",
            durationMinutes: 55,
            exercisesCount: 6,
            setsCount: 18,
            calories: 460,
            level: "Orta",
            status: "Tamamlandı",
            notes: "Kombine hareketler ile yüksek kalp ritmi sağlandı.",
            exercises: [
                { name: "Kettlebell Swing", sets: 4, reps: "20", weight: "24 kg" },
                { name: "Front Squat", sets: 4, reps: "8", weight: "75 kg" },
                { name: "Push Press", sets: 3, reps: "10", weight: "50 kg" },
                { name: "Farmer's Walk", sets: 4, reps: "40m", weight: "32 kg x 2" }
            ]
        },
        {
            id: "w-6",
            title: "Core & Kardiyo Dayanıklılık",
            category: "core",
            categoryLabel: "Core & Kardiyo",
            date: "18 Ağustos 2026",
            timestamp: new Date(2026, 7, 18).getTime(),
            durationText: "45 dk",
            durationMinutes: 45,
            exercisesCount: 5,
            setsCount: 15,
            calories: 390,
            level: "Başlangıç",
            status: "Tamamlandı",
            notes: "HIIT aralıkları 40 sn çalışma, 20 sn dinlenme.",
            exercises: [
                { name: "Hanging Leg Raise", sets: 4, reps: "15", weight: "Vücut Ağırlığı" },
                { name: "Plank", sets: 4, reps: "60 sn", weight: "-" },
                { name: "Ab Wheel Rollout", sets: 3, reps: "12", weight: "-" },
                { name: "Rowing Machine HIIT", sets: 5, reps: "250m", weight: "Direnç 8" }
            ]
        },
        {
            id: "w-7",
            title: "Kollar Süperset Seansı",
            category: "arm",
            categoryLabel: "Kol",
            date: "16 Ağustos 2026",
            timestamp: new Date(2026, 7, 16).getTime(),
            durationText: "48 dk",
            durationMinutes: 48,
            exercisesCount: 6,
            setsCount: 18,
            calories: 360,
            level: "Orta",
            status: "Tamamlandı",
            notes: "Biceps/Triceps antagonist süpersetler uygulandı.",
            exercises: [
                { name: "Incline DB Curl + Skull Crusher", sets: 4, reps: "12", weight: "14 kg / 30 kg" },
                { name: "Preacher Curl + Rope Extension", sets: 4, reps: "12", weight: "25 kg / 25 kg" },
                { name: "Concentration Curl", sets: 3, reps: "12", weight: "12 kg" }
            ]
        },
        {
            id: "w-8",
            title: "Üst Vücut Patlayıcı Güç",
            category: "chest",
            categoryLabel: "Göğüs",
            date: "14 Ağustos 2026",
            timestamp: new Date(2026, 7, 14).getTime(),
            durationText: "50 dk",
            durationMinutes: 50,
            exercisesCount: 5,
            setsCount: 16,
            calories: 410,
            level: "İleri",
            status: "Tamamlandı",
            notes: "Patlayıcı itiş gücü ve hız antrenmanı.",
            exercises: [
                { name: "Speed Bench Press", sets: 5, reps: "3", weight: "65 kg" },
                { name: "Plyometric Push-ups", sets: 4, reps: "8", weight: "Vücut Ağırlığı" },
                { name: "Overhead Medball Slam", sets: 4, reps: "12", weight: "10 kg" }
            ]
        }
    ];

    function getStoredWorkouts() {
        try {
            const data = localStorage.getItem('fitness_pro_workouts');
            if (data) {
                const parsed = JSON.parse(data);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
            // Initialize with default 8 workouts
            saveWorkouts(DEFAULT_WORKOUTS);
            return DEFAULT_WORKOUTS.slice();
        } catch (e) {
            return DEFAULT_WORKOUTS.slice();
        }
    }

    function saveWorkouts(items) {
        try {
            localStorage.setItem('fitness_pro_workouts', JSON.stringify(items));
        } catch (e) {}
    }

    // Local mutable state
    let workouts = getStoredWorkouts();
    let currentFilter = "all";
    let currentSort = "newest";
    let searchQuery = "";

    /* =========================================================
       2. DOM ELEMENTS
       ========================================================= */

    // Sidebar & Navigation
    const sidebar = document.getElementById("sidebar");
    const sidebarToggle = document.getElementById("sidebarToggle");
    const mobileMenuBtn = document.getElementById("mobileMenuBtn");
    const sidebarOverlay = document.getElementById("sidebarOverlay");
    const logoutBtn = document.getElementById("logoutBtn");
    const currentDateEl = document.getElementById("currentDate");

    // Stat counters
    const statTotalWorkouts = document.getElementById("statTotalWorkouts");
    const statWeeklyWorkouts = document.getElementById("statWeeklyWorkouts");
    const statCompletedWorkouts = document.getElementById("statCompletedWorkouts");
    const statTotalDuration = document.getElementById("statTotalDuration");
    const statTotalBadge = document.getElementById("statTotalBadge");
    const statWeeklyBadge = document.getElementById("statWeeklyBadge");
    const statCompletedBadge = document.getElementById("statCompletedBadge");
    const statAvgBadge = document.getElementById("statAvgBadge");

    // Filters, Search & Sort
    const filterPills = document.querySelectorAll(".filter-pill");
    const workoutSearchInput = document.getElementById("workoutSearchInput");
    const btnClearSearch = document.getElementById("btnClearSearch");
    const workoutSortSelect = document.getElementById("workoutSortSelect");
    const workoutsResultCount = document.getElementById("workoutsResultCount");
    const filterToggle = document.getElementById("workoutFilterToggle");
    const filterPanel = document.getElementById("workoutFilterPanel");
    const filterReset = document.getElementById("workoutFilterReset");

    function closeFilterPanel() {
        if (!filterPanel || !filterToggle) return;
        filterPanel.hidden = true;
        filterToggle.setAttribute("aria-expanded", "false");
        filterToggle.setAttribute("aria-label", "Filtreleri aç");
    }
    filterToggle?.addEventListener("click", () => {
        const opening = filterPanel.hidden;
        filterPanel.hidden = !opening;
        filterToggle.setAttribute("aria-expanded", String(opening));
        filterToggle.setAttribute("aria-label", opening ? "Filtreleri kapat" : "Filtreleri aç");
        if (opening) filterPanel.querySelector("button, input, select")?.focus();
    });
    document.addEventListener("click", event => {
        if (filterPanel && !event.target.closest(".workout-filter-section")) closeFilterPanel();
    });
    document.addEventListener("keydown", event => { if (event.key === "Escape") closeFilterPanel(); });
    filterReset?.addEventListener("click", () => btnResetFilters?.click());

    // Grid & Empty state
    const workoutsGrid = document.getElementById("workoutsGrid");
    const workoutEmptyState = document.getElementById("workoutEmptyState");
    const btnResetFilters = document.getElementById("btnResetFilters");

    // Detail Modal
    const workoutDetailModal = document.getElementById("workoutDetailModal");
    const modalWorkoutTag = document.getElementById("modalWorkoutTag");
    const modalWorkoutTitle = document.getElementById("modalWorkoutTitle");
    const modalWorkoutBody = document.getElementById("modalWorkoutBody");
    const btnCloseDetailModal = document.getElementById("btnCloseDetailModal");
    const btnCloseDetailModalBtn = document.getElementById("btnCloseDetailModalBtn");
    const btnRepeatWorkout = document.getElementById("btnRepeatWorkout");

    // New Workout Modal
    const btnNewWorkout = document.getElementById("btnNewWorkout");
    const newWorkoutModal = document.getElementById("newWorkoutModal");
    const btnCloseNewModal = document.getElementById("btnCloseNewModal");
    const btnCancelNewModal = document.getElementById("btnCancelNewModal");
    const newWorkoutForm = document.getElementById("newWorkoutForm");

    // Toast
    const toastContainer = document.getElementById("toastContainer");

    /* =========================================================
       3. INITIALIZATION & DATE
       ========================================================= */

    function initDate() {
        const now = new Date();
        const formattedDate = now.toLocaleDateString("tr-TR", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });
        if (currentDateEl) {
            currentDateEl.textContent = formattedDate;
        }
    }

    initDate();

    /* =========================================================
       4. SIDEBAR CONTROLLER (IDENTICAL TO INDEX)
       ========================================================= */

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener("click", () => {
            if (window.innerWidth <= 800) return;
            sidebar.classList.toggle("collapsed");
        });
    }

    function openMobileSidebar() {
        if (!sidebar || !sidebarOverlay) return;
        sidebar.classList.add("mobile-open");
        sidebarOverlay.classList.add("active");
        document.body.style.overflow = "hidden";
    }

    function closeMobileSidebar() {
        if (!sidebar || !sidebarOverlay) return;
        sidebar.classList.remove("mobile-open");
        sidebarOverlay.classList.remove("active");
        document.body.style.overflow = "";
    }

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener("click", openMobileSidebar);
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener("click", closeMobileSidebar);
    }

    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach(item => {
        item.addEventListener("click", () => {
            if (window.innerWidth <= 800) {
                closeMobileSidebar();
            }
        });
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 800) {
            closeMobileSidebar();
        }
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
       5. STATS CALCULATION
       ========================================================= */

    function updateStats() {
        const total = workouts.length;
        const completed = workouts.filter(w => w.status === "Tamamlandı").length;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        const monthly = workouts.filter(w => (w.timestamp || 0) >= startOfMonth).length;
        const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
        const weekly = workouts.filter(w => (w.timestamp || 0) >= sevenDaysAgo).length;
        const totalMinutes = workouts.reduce((sum, w) => sum + (Number(w.durationMinutes) || 0), 0);
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        const durationText = hours > 0 ? (hours + "s " + mins + "dk") : (mins + "dk");
        const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;
        const avgMinutes = total > 0 ? Math.round(totalMinutes / total) : 0;

        if (statTotalWorkouts) statTotalWorkouts.textContent = String(total);
        if (statTotalBadge) statTotalBadge.textContent = monthly + " bu ay";
        if (statWeeklyWorkouts) statWeeklyWorkouts.textContent = String(weekly);
        if (statWeeklyBadge) statWeeklyBadge.textContent = weekly + " idman";
        if (statCompletedWorkouts) statCompletedWorkouts.textContent = String(completed);
        if (statCompletedBadge) statCompletedBadge.textContent = "%" + successRate + " Başarı";
        if (statTotalDuration) statTotalDuration.textContent = durationText;
        if (statAvgBadge) statAvgBadge.textContent = "Ort. " + avgMinutes + " dk";
    }

    updateStats();

    /* =========================================================
       6. FILTERING & SORTING LOGIC
       ========================================================= */

    function getFilteredWorkouts() {
        return workouts.filter(item => {
            // Category / Period Filter
            let matchCategory = true;
            if (currentFilter === "all") {
                matchCategory = true;
            } else if (currentFilter === "this-week") {
                const now = new Date();
                const weekThreshold = now.getTime() - 7 * 24 * 60 * 60 * 1000;
                matchCategory = item.timestamp >= weekThreshold;
            } else if (currentFilter === "this-month") {
                const now = new Date();
                const monthThreshold = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
                matchCategory = item.timestamp >= monthThreshold;
            } else {
                matchCategory = item.category === currentFilter;
            }

            // Search query filter
            let matchSearch = true;
            if (searchQuery.trim() !== "") {
                const query = searchQuery.trim().toLowerCase();
                const inTitle = item.title.toLowerCase().includes(query);
                const inCategory = item.categoryLabel.toLowerCase().includes(query);
                const inExercises = item.exercises.some(ex => ex.name.toLowerCase().includes(query));
                const inLevel = item.level.toLowerCase().includes(query);
                matchSearch = inTitle || inCategory || inExercises || inLevel;
            }

            return matchCategory && matchSearch;
        }).sort((a, b) => {
            // Sort
            if (currentSort === "newest") {
                return b.timestamp - a.timestamp;
            } else if (currentSort === "oldest") {
                return a.timestamp - b.timestamp;
            } else if (currentSort === "longest") {
                return b.durationMinutes - a.durationMinutes;
            } else if (currentSort === "shortest") {
                return a.durationMinutes - b.durationMinutes;
            }
            return 0;
        });
    }

    /* =========================================================
       7. WORKOUT CARDS RENDERER
       ========================================================= */

    function renderWorkouts() {
        const filtered = getFilteredWorkouts();

        // Update count badge
        if (workoutsResultCount) {
            workoutsResultCount.textContent = `${filtered.length} İdman`;
        }

        if (filtered.length === 0) {
            workoutsGrid.innerHTML = "";
            workoutsGrid.classList.add("hidden");
            workoutEmptyState.classList.remove("hidden");
            return;
        }

        workoutEmptyState.classList.add("hidden");
        workoutsGrid.classList.remove("hidden");

        const cardsHTML = filtered.map(workout => {
            const badgeClass = `badge-${workout.category || 'chest'}`;

            // 2-3 exercise previews
            const previewExercises = workout.exercises.slice(0, 3).map(ex => `
                <div class="exercise-preview-item">
                    <span>${escapeHTML(ex.name)}</span>
                    <span class="exercise-tag">${ex.sets} × ${ex.reps}</span>
                </div>
            `).join("");

            return `
                <article class="workout-card-item" data-workout-id="${workout.id}" tabindex="0" role="button" aria-label="${escapeHTML(workout.title)} detaylarını görüntüle">
                    <div>
                        <!-- Top Badges & Three-dot Menu -->
                        <div class="card-top">
                            <span class="card-category-badge ${badgeClass}">
                                ${escapeHTML(workout.categoryLabel || workout.category)}
                            </span>
                            <div class="card-top-right">
                                <span class="card-status-badge">
                                    <span class="card-status-dot"></span>
                                    ${escapeHTML(workout.status)}
                                </span>
                                <div class="workout-card-menu-wrap">
                                    <button type="button" class="workout-card-menu-btn" data-workout-id="${workout.id}" aria-label="İşlem menüsü" title="İşlemler">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                            <circle cx="12" cy="12" r="1.5"></circle>
                                            <circle cx="19" cy="12" r="1.5"></circle>
                                            <circle cx="5" cy="12" r="1.5"></circle>
                                        </svg>
                                    </button>
                                    <div class="workout-card-dropdown" id="dropdown-${workout.id}" role="menu" hidden>
                                        <button type="button" class="workout-dropdown-item btn-action-view" data-workout-id="${workout.id}" role="menuitem">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                                            <span>Detayları Görüntüle</span>
                                        </button>
                                        <button type="button" class="workout-dropdown-item btn-action-repeat" data-workout-id="${workout.id}" role="menuitem">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 2v6h6"/><path d="M21 12A9 9 0 0 0 6 5.3L3 8"/><path d="M21 22v-6h-6"/><path d="M3 12a9 9 0 0 0 15 6.7l3-2.7"/></svg>
                                            <span>Tekrar Başlat</span>
                                        </button>
                                        <button type="button" class="workout-dropdown-item btn-action-delete" data-workout-id="${workout.id}" role="menuitem">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                                            <span>İdmanı Sil</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Title & Date -->
                        <h3 class="workout-card-title">${escapeHTML(workout.title)}</h3>
                        <div class="workout-card-date">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            <span>${escapeHTML(workout.date)}</span>
                        </div>

                        <!-- 4 Meta Boxes -->
                        <div class="workout-meta-grid">
                            <div class="meta-box">
                                <span class="meta-box-val">${escapeHTML(workout.durationText)}</span>
                                <span class="meta-box-lbl">Süre</span>
                            </div>
                            <div class="meta-box">
                                <span class="meta-box-val">${workout.calories}</span>
                                <span class="meta-box-lbl">kcal</span>
                            </div>
                            <div class="meta-box">
                                <span class="meta-box-val">${workout.exercisesCount}</span>
                                <span class="meta-box-lbl">Hareket</span>
                            </div>
                            <div class="meta-box">
                                <span class="meta-box-val">${workout.setsCount}</span>
                                <span class="meta-box-lbl">Set</span>
                            </div>
                        </div>

                        <!-- Exercise Preview -->
                        <div class="exercise-preview-list">
                            ${previewExercises}
                        </div>
                    </div>

                    <!-- Footer -->
                    <div class="workout-card-footer">
                        <span class="workout-level-tag">
                            Seviye: <strong>${escapeHTML(workout.level)}</strong>
                        </span>
                        <button type="button" class="view-detail-btn" tabindex="-1">
                            <span>Detayları İncele</span>
                            <span>→</span>
                        </button>
                    </div>
                </article>
            `;
        }).join("");

        workoutsGrid.innerHTML = cardsHTML;

        // Attach click listeners to cards

        // Close all card dropdowns
        function closeAllDropdowns() {
            document.querySelectorAll(".workout-card-dropdown").forEach(d => d.hidden = true);
        }

        // Three-dot button toggles
        document.querySelectorAll(".workout-card-menu-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const id = btn.dataset.workoutId;
                const dropdown = document.getElementById(`dropdown-${id}`);
                const isCurrentlyOpen = dropdown && !dropdown.hidden;
                closeAllDropdowns();
                if (dropdown && !isCurrentlyOpen) {
                    dropdown.hidden = false;
                }
            });
        });

        // Dropdown actions: Detay
        document.querySelectorAll(".workout-dropdown-item.btn-action-view").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                closeAllDropdowns();
                const id = btn.dataset.workoutId;
                openDetailModal(id);
            });
        });

        // Dropdown actions: Tekrar Başlat
        document.querySelectorAll(".workout-dropdown-item.btn-action-repeat").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                closeAllDropdowns();
                const id = btn.dataset.workoutId;
                const item = workouts.find(w => w.id === id);
                if (item) {
                    showToast(`"${item.title}" idmanı aktif seansa yüklendi!`, "success");
                }
            });
        });

        // Dropdown actions: Sil
        document.querySelectorAll(".workout-dropdown-item.btn-action-delete").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                closeAllDropdowns();
                const id = btn.dataset.workoutId;
                const item = workouts.find(w => w.id === id);
                if (!item) return;

                if (window.GlobalModal && typeof window.GlobalModal.confirm === "function") {
                    window.GlobalModal.confirm({
                        title: "İdmanı Sil",
                        description: `"${item.title}" idmanını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
                        buttons: [
                            { text: "Vazgeç", variant: "secondary" },
                            {
                                text: "Sil",
                                variant: "danger",
                                callback: () => {
                                    workouts = workouts.filter(w => w.id !== id);
                                    saveWorkouts(workouts);
                                    updateStats();
                                    renderWorkouts();
                                    showToast(`"${item.title}" silindi.`, "success");
                                }
                            }
                        ]
                    });
                } else if (confirm(`"${item.title}" silinsin mi?`)) {
                    workouts = workouts.filter(w => w.id !== id);
                    saveWorkouts(workouts);
                    updateStats();
                    renderWorkouts();
                    showToast(`"${item.title}" silindi.`, "success");
                }
            });
        });

        // Close dropdowns on click outside
        document.addEventListener("click", (e) => {
            if (!e.target.closest(".workout-card-menu-wrap")) {
                closeAllDropdowns();
            }
        });

                document.querySelectorAll(".workout-card-item").forEach(card => {
            const id = card.getAttribute("data-workout-id");
            card.addEventListener("click", () => openDetailModal(id));
            card.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openDetailModal(id);
                }
            });
        });
    }

    // Initial render
    renderWorkouts();

    /* =========================================================
       8. FILTER PILLS & SEARCH & SORT EVENTS
       ========================================================= */

    filterPills.forEach(pill => {
        pill.addEventListener("click", () => {
            filterPills.forEach(p => {
                p.classList.remove("active");
                p.setAttribute("aria-selected", "false");
            });
            pill.classList.add("active");
            pill.setAttribute("aria-selected", "true");
            currentFilter = pill.getAttribute("data-filter");
            renderWorkouts();
        });
    });

    if (workoutSearchInput) {
        workoutSearchInput.addEventListener("input", (e) => {
            searchQuery = e.target.value;
            if (searchQuery.trim().length > 0) {
                btnClearSearch.classList.remove("hidden");
            } else {
                btnClearSearch.classList.add("hidden");
            }
            renderWorkouts();
        });
    }

    if (btnClearSearch) {
        btnClearSearch.addEventListener("click", () => {
            workoutSearchInput.value = "";
            searchQuery = "";
            btnClearSearch.classList.add("hidden");
            workoutSearchInput.focus();
            renderWorkouts();
        });
    }

    if (workoutSortSelect) {
        workoutSortSelect.addEventListener("change", (e) => {
            currentSort = e.target.value;
            renderWorkouts();
        });
    }

    if (btnResetFilters) {
        btnResetFilters.addEventListener("click", () => {
            currentFilter = "all";
            searchQuery = "";
            if (workoutSearchInput) workoutSearchInput.value = "";
            if (btnClearSearch) btnClearSearch.classList.add("hidden");

            filterPills.forEach(p => {
                if (p.getAttribute("data-filter") === "all") {
                    p.classList.add("active");
                    p.setAttribute("aria-selected", "true");
                } else {
                    p.classList.remove("active");
                    p.setAttribute("aria-selected", "false");
                }
            });

            renderWorkouts();
        });
    }

    /* =========================================================
       9. WORKOUT DETAIL MODAL
       ========================================================= */

    let activeModalWorkout = null;

    function openDetailModal(workoutId) {
        const workout = workouts.find(w => w.id === workoutId);
        if (!workout) return;

        activeModalWorkout = workout;

        if (modalWorkoutTag) {
            modalWorkoutTag.textContent = `${workout.categoryLabel || workout.category} • ${workout.level} Seviye`;
        }
        if (modalWorkoutTitle) {
            modalWorkoutTitle.textContent = workout.title;
        }

        // Generate Exercise Rows
        const exerciseRows = workout.exercises.map((ex, idx) => `
            <div class="exercise-detail-row">
                <div class="exercise-main-name">
                    <span class="exercise-index-circle">${idx + 1}</span>
                    <span class="exercise-name-text">${escapeHTML(ex.name)}</span>
                </div>
                <div class="exercise-specs">
                    <span class="spec-pill">${ex.sets} Set</span>
                    <span class="spec-pill">${ex.reps} Tekrar</span>
                    <span class="spec-pill weight">${escapeHTML(ex.weight)}</span>
                </div>
            </div>
        `).join("");

        modalWorkoutBody.innerHTML = `
            <!-- Summary Metrics -->
            <div class="modal-metrics-grid">
                <div class="modal-metric-card">
                    <strong>${escapeHTML(workout.date)}</strong>
                    <span>Tarih</span>
                </div>
                <div class="modal-metric-card">
                    <strong>${escapeHTML(workout.durationText)}</strong>
                    <span>Süre</span>
                </div>
                <div class="modal-metric-card">
                    <strong>${workout.calories} kcal</strong>
                    <span>Kalori</span>
                </div>
                <div class="modal-metric-card">
                    <strong>${workout.setsCount} Set</strong>
                    <span>${workout.exercisesCount} Hareket</span>
                </div>
            </div>

            <!-- Exercises Table -->
            <div>
                <h4 class="detail-section-title">Egzersizler ve Set Detayları</h4>
                <div class="exercise-detail-table">
                    ${exerciseRows}
                </div>
            </div>

            <!-- Notes -->
            <div class="modal-notes-box">
                <strong>İdman Notu & Gözlemler:</strong>
                <p>${escapeHTML(workout.notes || "Özel bir not belirtilmedi.")}</p>
            </div>
        `;

        workoutDetailModal.classList.add("active");
        workoutDetailModal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
    }

    function closeDetailModal() {
        if (!workoutDetailModal) return;
        workoutDetailModal.classList.remove("active");
        workoutDetailModal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
        activeModalWorkout = null;
    }

    if (btnCloseDetailModal) btnCloseDetailModal.addEventListener("click", closeDetailModal);
    if (btnCloseDetailModalBtn) btnCloseDetailModalBtn.addEventListener("click", closeDetailModal);

    if (workoutDetailModal) {
        workoutDetailModal.addEventListener("click", (e) => {
            if (e.target === workoutDetailModal) {
                closeDetailModal();
            }
        });
    }

    if (btnRepeatWorkout) {
        btnRepeatWorkout.addEventListener("click", () => {
            if (activeModalWorkout) {
                showToast(`"${activeModalWorkout.title}" idmanı aktif seansa yüklendi!`, "success");
                closeDetailModal();
            }
        });
    }

    /* =========================================================
       10. NEW WORKOUT MODAL (FRONTEND LOCAL CREATION)
       ========================================================= */

    function openNewWorkoutModal() {
        if (!newWorkoutModal) return;
        newWorkoutModal.classList.add("active");
        newWorkoutModal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
        setTimeout(() => {
            const input = document.getElementById("inputWorkoutName");
            if (input) input.focus();
        }, 150);
    }

    function closeNewWorkoutModal() {
        if (!newWorkoutModal) return;
        newWorkoutModal.classList.remove("active");
        newWorkoutModal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
        if (newWorkoutForm) newWorkoutForm.reset();
    }

    if (btnNewWorkout) btnNewWorkout.addEventListener("click", openNewWorkoutModal);
    if (btnCloseNewModal) btnCloseNewModal.addEventListener("click", closeNewWorkoutModal);
    if (btnCancelNewModal) btnCancelNewModal.addEventListener("click", closeNewWorkoutModal);

    if (newWorkoutModal) {
        newWorkoutModal.addEventListener("click", (e) => {
            if (e.target === newWorkoutModal) {
                closeNewWorkoutModal();
            }
        });
    }

    if (newWorkoutForm) {
        newWorkoutForm.addEventListener("submit", (e) => {
            e.preventDefault();

            const name = document.getElementById("inputWorkoutName").value.trim();
            const category = document.getElementById("inputCategory").value;
            const duration = parseInt(document.getElementById("inputDuration").value, 10) || 45;
            const calories = parseInt(document.getElementById("inputCalories").value, 10) || 350;
            const level = document.getElementById("inputLevel").value;
            const notes = document.getElementById("inputNotes").value.trim();

            if (!name) {
                showToast("Lütfen bir idman adı girin.", "error");
                return;
            }

            const categoryLabels = {
                chest: "Göğüs",
                back: "Sırt",
                leg: "Bacak",
                shoulder: "Omuz",
                arm: "Kol",
                "full-body": "Tüm Vücut",
                core: "Core & Kardiyo"
            };

            const newId = "w-" + (workouts.length + 1);
            const now = new Date();
            const formattedDate = now.toLocaleDateString("tr-TR", {
                day: "numeric",
                month: "long",
                year: "numeric"
            });

            const newWorkoutItem = {
                id: newId,
                title: name,
                category: category,
                categoryLabel: categoryLabels[category] || category,
                date: formattedDate,
                timestamp: now.getTime(),
                durationText: `${duration} dk`,
                durationMinutes: duration,
                exercisesCount: 5,
                setsCount: 16,
                calories: calories,
                level: level,
                status: "Tamamlandı",
                notes: notes || "Yeni oluşturulmuş idman.",
                exercises: [
                    { name: `${name} Ana Hareket 1`, sets: 4, reps: "10", weight: "Kademeli" },
                    { name: `${name} Destek Egzersiz 2`, sets: 3, reps: "12", weight: "Orta" },
                    { name: `${name} İzolasyon 3`, sets: 3, reps: "15", weight: "Hafif-Orta" },
                    { name: `${name} Güç Seti 4`, sets: 3, reps: "8", weight: "Ağır" },
                    { name: `${name} Soğuma / Pump 5`, sets: 3, reps: "15", weight: "Hafif" }
                ]
            };

            workouts.unshift(newWorkoutItem);
            saveWorkouts(workouts);
            updateStats();
            closeNewWorkoutModal();
            renderWorkouts();
            showToast(`"${name}" başarıyla eklendi!`, "success");
        });
    }

    /* =========================================================
       11. GLOBAL ESCAPE KEY HANDLER
       ========================================================= */

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            closeDetailModal();
            closeNewWorkoutModal();
            if (window.innerWidth <= 800) {
                closeMobileSidebar();
            }
        }
    });

    /* =========================================================
       12. TOAST NOTIFICATION UTILITY
       ========================================================= */

    function showToast(message, type = "success") {
        if (!toastContainer) return;

        const toast = document.createElement("div");
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span class="toast-icon">✓</span>
            <span>${escapeHTML(message)}</span>
        `;

        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.transform = "translateY(10px)";
            toast.style.transition = "all 0.3s ease";
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3200);
    }

    /* =========================================================
       13. HELPER UTILS
       ========================================================= */

    function escapeHTML(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

});
