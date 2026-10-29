/**
 * =========================================================
 * FITNESS PRO - PROFILE PAGE CONTROLLER
 * =========================================================
 * Integrates with standard Fitness Pro dashboard layout,
 * sidebar & topbar controls, avatar management, edit profile modal,
 * workout details modal, coach info, and progress analytics.
 */

document.addEventListener("DOMContentLoaded", () => {
    // Auth Guard
    if (window.Auth && !window.Auth.requireAuth()) {
        return;
    }

    const authUser = window.Auth ? window.Auth.getUser() : null;

    /* =========================================================
       1. CENTRAL DATA MODEL (API READY)
       ========================================================= */

    function getStoredWorkouts() {
        try {
            const data = localStorage.getItem('fitness_pro_workouts');
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    }

    function getStoredGoals() {
        try {
            const data = localStorage.getItem('fitness_pro_goals');
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    }

    const storedWorkouts = getStoredWorkouts();
    const storedGoals = getStoredGoals();

    const profileState = {
        user: {
            firstName: (authUser && authUser.username) ? authUser.username : '',
            lastName: '',
            username: (authUser && authUser.username) ? authUser.username : '',
            email: (authUser && authUser.email) ? authUser.email : '',
            bio: '',
            level: (authUser && authUser.role === 'Admin') ? 'Admin' : 'Başlangıç',
            levelNumber: 1,
            maxLevel: 5,
            levelProgressPercent: 0,
            xpCurrent: 0,
            xpNext: 1000,
            membershipDate: 'Aktif',
            membershipStatus: 'Aktif',
            photoUrl: null
        },
        stats: {
            totalWorkouts: storedWorkouts.length,
            streak: 0,
            calories: '0',
            level: (authUser && authUser.role === 'Admin') ? 'Admin' : 'Başlangıç'
        },
        workouts: storedWorkouts,
        coach: {
            assigned: false,
            name: '',
            specialty: '',
            experience: '',
            level: '',
            channel: '',
            initials: '',
            status: 'Pasif'
        },
        progress: {
            overall: 0,
            weightGoal: 0,
            strengthGoal: 0,
            workoutGoal: 0,
            monthlyGrowth: '0%'
        },
        goals: storedGoals
    };

    /* =========================================================
       2. API INTEGRATION LAYER
       ========================================================= */

    const ProfileAPI = {
        async getProfile() {
            return Promise.resolve({ success: true, data: profileState.user });
        },
        async updateProfile(payload) {
            Object.assign(profileState.user, payload);
            return Promise.resolve({ success: true, message: "Profil başarıyla güncellendi." });
        },
        async uploadPhoto(fileDataUrl) {
            profileState.user.photoUrl = fileDataUrl;
            return Promise.resolve({ success: true, message: "Profil fotoğrafı yüklendi." });
        },
        async deletePhoto() {
            profileState.user.photoUrl = null;
            return Promise.resolve({ success: true, message: "Profil fotoğrafı kaldırıldı." });
        },
        async getWorkouts() {
            return Promise.resolve({ success: true, data: profileState.workouts });
        },
        async getCoach() {
            return Promise.resolve({ success: true, data: profileState.coach });
        },
        async getProgress() {
            return Promise.resolve({ success: true, data: profileState.progress });
        },
        async getGoals() {
            return Promise.resolve({ success: true, data: profileState.goals });
        }
    };

    /* =========================================================
       3. DOM ELEMENTS SELECTORS
       ========================================================= */

    // Sidebar & Topbar (Matching index.html)
    const sidebar = document.getElementById("sidebar");
    const sidebarToggle = document.getElementById("sidebarToggle");
    const mobileMenuBtn = document.getElementById("mobileMenuBtn");
    const sidebarOverlay = document.getElementById("sidebarOverlay");
    const logoutBtn = document.getElementById("logoutBtn");
    const currentDate = document.getElementById("currentDate");
    const topbarAvatar = document.getElementById("topbarAvatar");
    const topbarUsername = document.getElementById("topbarUsername");
    const sidebarAvatar = document.getElementById("sidebarAvatar");
    const sidebarUsername = document.getElementById("sidebarUsername");

    // Profile Header & Avatar
    const displayFullName = document.getElementById("displayFullName");
    const displayUsername = document.getElementById("displayUsername");
    const displayBio = document.getElementById("displayBio");
    const displayLevelBadge = document.getElementById("displayLevelBadge");
    const avatarInitials = document.getElementById("avatarInitials");
    const profileAvatarImg = document.getElementById("profileAvatarImg");
    const avatarInput = document.getElementById("avatarInput");
    const avatarQuickActions = document.getElementById("avatarQuickActions");
    const btnRemovePhoto = document.getElementById("btnRemovePhoto");

    // Stats Elements
    const statTotalWorkouts = document.getElementById("statTotalWorkouts");
    const statStreak = document.getElementById("statStreak");
    const statCalories = document.getElementById("statCalories");
    const statLevel = document.getElementById("statLevel");

    // Workouts Section
    const workoutsList = document.getElementById("workoutsList");
    const workoutsCounter = document.getElementById("workoutsCounter");
    const workoutsEmptyState = document.getElementById("workoutsEmptyState");

    // Coach Section
    const coachDetails = document.getElementById("coachDetails");
    const coachEmptyState = document.getElementById("coachEmptyState");
    const coachName = document.getElementById("coachName");
    const coachSpecialty = document.getElementById("coachSpecialty");
    const coachExp = document.getElementById("coachExp");
    const coachLevel = document.getElementById("coachLevel");
    const coachChannel = document.getElementById("coachChannel");
    const btnContactCoach = document.getElementById("btnContactCoach");
    const btnAssignCoach = document.getElementById("btnAssignCoach");

    // Goals Section
    const goalsList = document.getElementById("goalsList");
    const goalsCount = document.getElementById("goalsCount");

    // Edit Profile Modal
    const editProfileModal = document.getElementById("editProfileModal");
    const btnOpenEditModal = document.getElementById("btnOpenEditModal");
    const btnCloseEditModal = document.getElementById("btnCloseEditModal");
    const btnCancelEditModal = document.getElementById("btnCancelEditModal");
    const editProfileForm = document.getElementById("editProfileForm");
    const inputFirstName = document.getElementById("inputFirstName");
    const inputLastName = document.getElementById("inputLastName");
    const inputUsername = document.getElementById("inputUsername");
    const inputEmail = document.getElementById("inputEmail");
    const inputBio = document.getElementById("inputBio");
    const modalAlertBox = document.getElementById("modalAlertBox");

    // Workout Detail Modal
    const workoutDetailModal = document.getElementById("workoutDetailModal");
    const workoutModalTitle = document.getElementById("workoutModalTitle");
    const workoutModalBody = document.getElementById("workoutModalBody");
    const btnCloseWorkoutModal = document.getElementById("btnCloseWorkoutModal");
    const btnCloseWorkoutDetail = document.getElementById("btnCloseWorkoutDetail");

    // Toast Container
    const toastContainer = document.getElementById("toastContainer");

    /* =========================================================
       4. TOPBAR DATE
       ========================================================= */

    function updateDate() {
        const now = new Date();
        const formattedDate = now.toLocaleDateString("tr-TR", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });
        if (currentDate) {
            currentDate.textContent = formattedDate;
        }
    }
    updateDate();

    /* =========================================================
       5. SIDEBAR CONTROLS (DESKTOP & MOBILE - MATCHING index.js)
       ========================================================= */

    if (sidebarToggle) {
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
    navItems.forEach((item) => {
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
       6. HELPER: TOAST NOTIFICATIONS
       ========================================================= */

    function showToast(message, type = "success") {
        if (!toastContainer) return;

        const toast = document.createElement("div");
        toast.className = `toast ${type === "error" ? "toast-error" : ""}`;
        
        const iconSvg = type === "success"
            ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22C55E" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
            : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;

        toast.innerHTML = `<span>${iconSvg}</span> <span>${message}</span>`;

        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.transform = "translateY(20px)";
            toast.style.transition = "all 0.3s ease";
            setTimeout(() => toast.remove(), 300);
        }, 3200);
    }

    /* =========================================================
       7. HELPER: MODAL ALERT
       ========================================================= */

    function showModalAlert(message, type = "error") {
        if (!modalAlertBox) return;
        modalAlertBox.textContent = message;
        modalAlertBox.className = `form-alert show ${type}`;
    }

    function clearModalAlert() {
        if (!modalAlertBox) return;
        modalAlertBox.textContent = "";
        modalAlertBox.className = "form-alert";
    }

    /* =========================================================
       8. RENDER FUNCTIONS
       ========================================================= */

    // Render Profile Header & Sync Topbar/Sidebar
    function renderProfileHeader() {
        const u = profileState.user;
        const fullName = `${u.firstName} ${u.lastName}`.trim();

        if (displayFullName) displayFullName.textContent = fullName;
        if (displayUsername) displayUsername.textContent = `@${u.username}`;
        if (displayBio) displayBio.textContent = u.bio;
        
        if (displayLevelBadge) {
            displayLevelBadge.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="8" r="7"></circle>
                    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
                </svg>
                <span>Seviye: ${u.level}</span>
            `;
        }

        // Compute initials
        const firstLetter = u.firstName ? u.firstName.charAt(0).toUpperCase() : "E";
        const lastLetter = u.lastName ? u.lastName.charAt(0).toUpperCase() : "Ç";
        const initials = `${firstLetter}${lastLetter}`;

        if (avatarInitials) avatarInitials.textContent = initials;
        if (topbarAvatar) topbarAvatar.textContent = firstLetter;
        if (topbarUsername) topbarUsername.textContent = u.firstName.split(" ")[0] || "Emre";
        if (sidebarAvatar) sidebarAvatar.textContent = firstLetter;
        if (sidebarUsername) sidebarUsername.textContent = u.firstName.split(" ")[0] || "Emre";

        // Photo State
        if (u.photoUrl) {
            if (profileAvatarImg) {
                profileAvatarImg.src = u.photoUrl;
                profileAvatarImg.classList.remove("hidden");
            }
            if (avatarInitials) avatarInitials.classList.add("hidden");
            if (avatarQuickActions) avatarQuickActions.classList.add("show");
        } else {
            if (profileAvatarImg) {
                profileAvatarImg.src = "";
                profileAvatarImg.classList.add("hidden");
            }
            if (avatarInitials) avatarInitials.classList.remove("hidden");
            if (avatarQuickActions) avatarQuickActions.classList.remove("show");
        }
    }

    // Render Stats
    function renderStats() {
        const s = profileState.stats;
        if (statTotalWorkouts) statTotalWorkouts.textContent = s.totalWorkouts;
        if (statStreak) statStreak.textContent = `${s.streak} Gün`;
        if (statCalories) statCalories.textContent = s.calories;
        if (statLevel) statLevel.textContent = s.level;
    }

    // Render Workouts List
    function renderWorkouts() {
        if (!workoutsList) return;

        const workouts = profileState.workouts;

        if (!workouts || workouts.length === 0) {
            workoutsList.classList.add("hidden");
            if (workoutsEmptyState) workoutsEmptyState.classList.remove("hidden");
            if (workoutsCounter) workoutsCounter.textContent = "0 İdman";
            return;
        }

        workoutsList.classList.remove("hidden");
        if (workoutsEmptyState) workoutsEmptyState.classList.add("hidden");
        if (workoutsCounter) workoutsCounter.textContent = `${workouts.length} İdman`;

        workoutsList.innerHTML = "";

        // Display up to 5 items on the main profile dashboard
        const displayItems = workouts.slice(0, 5);

        displayItems.forEach((workout) => {
            const item = document.createElement("div");
            item.className = "workout-item";

            item.innerHTML = `
                <div class="workout-main-info">
                    <div class="workout-title-row">
                        <strong class="workout-name">${workout.name}</strong>
                        <span class="workout-status-tag ${workout.status}">${workout.statusText}</span>
                    </div>
                    <p class="workout-muscles">${workout.muscles}</p>
                    <div class="workout-meta-row">
                        <span class="workout-meta-item">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            ${workout.duration}
                        </span>
                        <span class="workout-meta-item">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                            </svg>
                            ${workout.sets} Set
                        </span>
                        <span class="workout-meta-item">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            ${workout.lastDate}
                        </span>
                    </div>
                </div>
                <button type="button" class="btn-workout-detail" data-workout-id="${workout.id}" aria-label="${workout.name} detaylarını gör">
                    Detayları Gör
                </button>
            `;

            workoutsList.appendChild(item);
        });

        // Add event listeners for workout detail buttons
        workoutsList.querySelectorAll(".btn-workout-detail").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                const id = e.currentTarget.dataset.workoutId;
                openWorkoutDetailModal(id);
            });
        });
    }

    // Render Coach Info
    function renderCoach() {
        const c = profileState.coach;

        if (!c || !c.assigned) {
            if (coachDetails) coachDetails.classList.add("hidden");
            if (coachEmptyState) coachEmptyState.classList.remove("hidden");
            return;
        }

        if (coachDetails) coachDetails.classList.remove("hidden");
        if (coachEmptyState) coachEmptyState.classList.add("hidden");

        if (coachName) coachName.textContent = c.name;
        if (coachSpecialty) coachSpecialty.textContent = c.specialty;
        if (coachExp) coachExp.textContent = c.experience;
        if (coachLevel) coachLevel.textContent = c.level;
        if (coachChannel) coachChannel.textContent = c.channel;
    }

    // Render Active Goals
    function renderGoals() {
        if (!goalsList) return;

        const goals = profileState.goals;

        if (!goals || goals.length === 0) {
            goalsList.innerHTML = `<p class="empty-hint">Henüz aktif bir hedefin bulunmuyor.</p>`;
            if (goalsCount) goalsCount.textContent = "0 Hedef";
            return;
        }

        if (goalsCount) goalsCount.textContent = `${goals.length} Hedef`;
        goalsList.innerHTML = "";

        goals.forEach((goal) => {
            const goalEl = document.createElement("div");
            goalEl.className = "goal-item";

            const isCompleted = goal.percent >= 100;

            goalEl.innerHTML = `
                <div class="goal-header">
                    <span class="goal-title">${goal.title}</span>
                    <span class="goal-percent-badge">${goal.percent}%</span>
                </div>
                <div class="goal-progress-bar">
                    <div class="goal-progress-fill ${isCompleted ? 'completed' : ''}" style="width: ${Math.min(goal.percent, 100)}%;"></div>
                </div>
            `;

            goalsList.appendChild(goalEl);
        });
    }

    /* =========================================================
       9. AVATAR / PROFILE PHOTO MANAGEMENT
       ========================================================= */

    if (avatarInput) {
        avatarInput.addEventListener("change", async (event) => {
            const file = event.target.files && event.target.files[0];
            if (!file) return;

            // 1. File Type Validation
            const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
            if (!validTypes.includes(file.type.toLowerCase())) {
                showToast("Lütfen JPG, PNG veya WebP formatında bir resim seçiniz.", "error");
                avatarInput.value = "";
                return;
            }

            // 2. File Size Validation (Max 5MB)
            const maxSize = 5 * 1024 * 1024;
            if (file.size > maxSize) {
                showToast("Fotoğraf boyutu en fazla 5 MB olabilir.", "error");
                avatarInput.value = "";
                return;
            }

            // 3. Read and Preview
            const reader = new FileReader();
            reader.onload = async (e) => {
                const dataUrl = e.target.result;
                await ProfileAPI.uploadPhoto(dataUrl);
                renderProfileHeader();
                showToast("Profil fotoğrafı başarıyla güncellendi!");
            };

            reader.onerror = () => {
                showToast("Fotoğraf yüklenirken bir hata oluştu.", "error");
            };

            reader.readAsDataURL(file);
        });
    }

    if (btnRemovePhoto) {
        btnRemovePhoto.addEventListener("click", () => {
            const performDelete = async () => {
                await ProfileAPI.deletePhoto();
                if (avatarInput) avatarInput.value = "";
                renderProfileHeader();
                showToast("Profil fotoğrafı kaldırıldı.");
            };

            if (!window.GlobalModal || typeof window.GlobalModal.confirm !== "function") {
                performDelete();
                return;
            }

            window.GlobalModal.confirm({
                title: "Profil Fotoğrafını Kaldır",
                description: "Profil fotoğrafın kaldırılacak. Bu işlem geri alınamaz. Devam etmek istiyor musun?",
                buttons: [
                    { text: "İptal", variant: "secondary" },
                    {
                        text: "Kaldır",
                        variant: "danger",
                        callback: async ({ setLoading }) => {
                            setLoading(true);
                            try {
                                await performDelete();
                            } catch (err) {
                                showToast("Fotoğraf kaldırılamadı.", "error");
                                throw err;
                            } finally {
                                setLoading(false);
                            }
                        }
                    }
                ]
            });
        });
    }

    /* =========================================================
       10. EDIT PROFILE MODAL
       ========================================================= */

    function openEditModal() {
        if (!editProfileModal) return;

        const u = profileState.user;

        // Prepopulate form values
        if (inputFirstName) inputFirstName.value = u.firstName;
        if (inputLastName) inputLastName.value = u.lastName;
        if (inputUsername) inputUsername.value = u.username;
        if (inputEmail) inputEmail.value = u.email;
        if (inputBio) inputBio.value = u.bio;

        clearModalAlert();

        editProfileModal.classList.add("active");
        editProfileModal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";

        if (inputFirstName) inputFirstName.focus();
    }

    function closeEditModal() {
        if (!editProfileModal) return;

        editProfileModal.classList.remove("active");
        editProfileModal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
        clearModalAlert();
    }

    if (btnOpenEditModal) {
        btnOpenEditModal.addEventListener("click", openEditModal);
    }

    if (btnCloseEditModal) {
        btnCloseEditModal.addEventListener("click", closeEditModal);
    }

    if (btnCancelEditModal) {
        btnCancelEditModal.addEventListener("click", closeEditModal);
    }

    // Close on backdrop click
    if (editProfileModal) {
        editProfileModal.addEventListener("click", (e) => {
            if (e.target === editProfileModal) {
                closeEditModal();
            }
        });
    }

    // Form Submit & Validation
    if (editProfileForm) {
        editProfileForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            clearModalAlert();

            const firstName = inputFirstName ? inputFirstName.value.trim() : "";
            const lastName = inputLastName ? inputLastName.value.trim() : "";
            const username = inputUsername ? inputUsername.value.trim().replace(/^@/, "") : "";
            const email = inputEmail ? inputEmail.value.trim() : "";
            const bio = inputBio ? inputBio.value.trim() : "";

            // Validation: Required fields
            if (!firstName || !lastName || !username || !email) {
                showModalAlert("Lütfen gerekli tüm alanları (*) doldurunuz.", "error");
                return;
            }

            // Validation: Email format regex
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showModalAlert("Lütfen geçerli bir e-posta adresi giriniz.", "error");
                return;
            }

            // Validation: Username format
            if (username.length < 3) {
                showModalAlert("Kullanıcı adı en az 3 karakter olmalıdır.", "error");
                return;
            }

            // Prepare Payload
            const payload = {
                firstName,
                lastName,
                username,
                email,
                bio
            };

            const submitBtn = document.getElementById("btnSaveProfile");
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = "Kaydediliyor...";
            }

            try {
                const res = await ProfileAPI.updateProfile(payload);
                if (res.success) {
                    renderProfileHeader();
                    showToast("Profil bilgileriniz başarıyla güncellendi!");
                    closeEditModal();
                } else {
                    showModalAlert(res.message || "Güncelleme başarısız oldu.", "error");
                }
            } catch {
                showModalAlert("Bir hata oluştu. Lütfen tekrar deneyiniz.", "error");
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = "Değişiklikleri Kaydet";
                }
            }
        });
    }

    /* =========================================================
       11. WORKOUT DETAIL MODAL
       ========================================================= */

    function openWorkoutDetailModal(workoutId) {
        if (!workoutDetailModal || !workoutModalBody) return;

        const workout = profileState.workouts.find((w) => w.id === workoutId);
        if (!workout) return;

        if (workoutModalTitle) workoutModalTitle.textContent = workout.name;

        let exercisesHtml = "";
        if (workout.exercises && workout.exercises.length > 0) {
            exercisesHtml = workout.exercises
                .map(
                    (ex) => `
                <div class="workout-detail-row">
                    <span>${ex.name}</span>
                    <strong>${ex.sets}</strong>
                </div>`
                )
                .join("");
        }

        workoutModalBody.innerHTML = `
            <div class="workout-detail-row">
                <span>Hedef Kas Grubu</span>
                <strong>${workout.muscles}</strong>
            </div>
            <div class="workout-detail-row">
                <span>Süre & Set</span>
                <strong>${workout.duration} / ${workout.sets} Set</strong>
            </div>
            <div class="workout-detail-row">
                <span>Durum</span>
                <strong class="workout-status-tag ${workout.status}">${workout.statusText}</strong>
            </div>
            <div style="margin-top: 10px;">
                <h4 style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 8px; text-transform: uppercase; font-weight: 700;">Egzersiz Programı</h4>
                ${exercisesHtml}
            </div>
        `;

        workoutDetailModal.classList.add("active");
        workoutDetailModal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
    }

    function closeWorkoutDetailModal() {
        if (!workoutDetailModal) return;
        workoutDetailModal.classList.remove("active");
        workoutDetailModal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
    }

    if (btnCloseWorkoutModal) btnCloseWorkoutModal.addEventListener("click", closeWorkoutDetailModal);
    if (btnCloseWorkoutDetail) btnCloseWorkoutDetail.addEventListener("click", closeWorkoutDetailModal);

    if (workoutDetailModal) {
        workoutDetailModal.addEventListener("click", (e) => {
            if (e.target === workoutDetailModal) {
                closeWorkoutDetailModal();
            }
        });
    }

    /* =========================================================
       12. GLOBAL KEYBOARD ACCESSIBILITY (ESC)
       ========================================================= */

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            if (editProfileModal && editProfileModal.classList.contains("active")) {
                closeEditModal();
            }
            if (workoutDetailModal && workoutDetailModal.classList.contains("active")) {
                closeWorkoutDetailModal();
            }
            if (window.innerWidth <= 800) {
                closeMobileSidebar();
            }
        }
    });

    /* =========================================================
       13. COACH INTERACTION HANDLERS
       ========================================================= */

    if (btnContactCoach) {
        btnContactCoach.addEventListener("click", () => {
            showToast("Eğitmen sohbet modülü açılıyor...");
        });
    }

    if (btnAssignCoach) {
        btnAssignCoach.addEventListener("click", () => {
            showToast("Eğitmen havuzuna yönlendiriliyorsunuz...");
        });
    }

    /* =========================================================
       14. REVEAL ANIMATION OBSERVER
       ========================================================= */

    const revealObserver = new IntersectionObserver(
        (entries, observer) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("visible");
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.1 }
    );

    document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

    /* =========================================================
       15. INITIALIZE RENDERING
       ========================================================= */

    renderProfileHeader();
    renderStats();
    renderWorkouts();
    renderCoach();
    renderGoals();

});
