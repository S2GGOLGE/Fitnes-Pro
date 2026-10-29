document.addEventListener("DOMContentLoaded", () => {
    // Auth Guard
    if (window.Auth && !window.Auth.requireAuth()) {
        return;
    }

    const sidebar = document.getElementById("sidebar");
    const sidebarToggle = document.getElementById("sidebarToggle");

    const mobileMenuBtn = document.getElementById("mobileMenuBtn");
    const sidebarOverlay = document.getElementById("sidebarOverlay");

    const logoutBtn = document.getElementById("logoutBtn");
    const startWorkoutBtn = document.getElementById("startWorkoutBtn");

    const currentDate = document.getElementById("currentDate");

    // Sync logged in user data to DOM
    if (window.Auth) {
        window.Auth.syncAuthUI();
        const user = window.Auth.getUser();
        if (user && user.username) {
            const welcomeHeading = document.querySelector(".welcome-section h1 span");
            if (welcomeHeading) {
                welcomeHeading.textContent = `${user.username}.`;
            }
        }
    }


    /* ==========================================
       DATE
       ========================================== */

    function updateDate() {

        const now = new Date();

        const formattedDate = now.toLocaleDateString(
            "tr-TR",
            {
                day: "numeric",
                month: "long",
                year: "numeric"
            }
        );

        if (currentDate) {
            currentDate.textContent = formattedDate;
        }

    }

    updateDate();


    /* ==========================================
       DESKTOP SIDEBAR
       ========================================== */

    if (sidebarToggle) {

        sidebarToggle.addEventListener("click", () => {

            if (window.innerWidth <= 800) {
                return;
            }

            sidebar.classList.toggle("collapsed");

        });

    }


    /* ==========================================
       MOBILE SIDEBAR
       ========================================== */

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


    if (mobileMenuBtn) {

        mobileMenuBtn.addEventListener(
            "click",
            openMobileSidebar
        );

    }


    if (sidebarOverlay) {

        sidebarOverlay.addEventListener(
            "click",
            closeMobileSidebar
        );

    }


    /* ==========================================
       MOBILE NAVIGATION
       ========================================== */

    const navItems =
        document.querySelectorAll(".nav-item");


    navItems.forEach(item => {

        item.addEventListener("click", () => {

            if (window.innerWidth <= 800) {
                closeMobileSidebar();
            }

        });

    });


    /* ==========================================
       ESCAPE
       ========================================== */

    document.addEventListener("keydown", event => {

        if (event.key === "Escape") {

            if (window.innerWidth <= 800) {
                closeMobileSidebar();
            }

        }

    });


    /* ==========================================
       RESIZE
       ========================================== */

    window.addEventListener("resize", () => {

        if (window.innerWidth > 800) {

            closeMobileSidebar();

        }

    });


    /* ==========================================
       START WORKOUT
       ========================================== */

    if (startWorkoutBtn) {

        startWorkoutBtn.addEventListener(
            "click",
            () => {

                startWorkoutBtn.disabled = true;

                startWorkoutBtn.innerHTML = `
                    ANTRENMAN BAŞLATILIYOR...
                    <span>✓</span>
                `;

                setTimeout(() => {

                    startWorkoutBtn.disabled = false;

                    startWorkoutBtn.innerHTML = `
                        İDMANI BAŞLAT
                        <span>→</span>
                    `;

                    console.log(
                        "Workout start event hazır. Backend entegrasyonu bekleniyor."
                    );

                }, 1200);

            }
        );

    }


    /* ==========================================
       LOGOUT
       ========================================== */

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


    /* ==========================================
       EXERCISE INTERACTION
       ========================================== */

    const exerciseItems =
        document.querySelectorAll(".exercise-item");


    exerciseItems.forEach(item => {

        item.addEventListener("click", () => {

            if (
                item.classList.contains("completed")
            ) {
                return;
            }

            exerciseItems.forEach(
                exercise => {
                    exercise.classList.remove("current");
                }
            );

            item.classList.add("current");

        });

    });

});