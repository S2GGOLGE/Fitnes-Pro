document.addEventListener("DOMContentLoaded", () => {

    const sidebar = document.getElementById("sidebar");
    const sidebarToggle = document.getElementById("sidebarToggle");

    const mobileMenuBtn = document.getElementById("mobileMenuBtn");
    const sidebarOverlay = document.getElementById("sidebarOverlay");

    const logoutBtn = document.getElementById("logoutBtn");
    const startWorkoutBtn = document.getElementById("startWorkoutBtn");

    const currentDate = document.getElementById("currentDate");


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

    if (logoutBtn) {

        logoutBtn.addEventListener(
            "click",
            () => {

                const confirmed =
                    confirm(
                        "Çıkış yapmak istediğine emin misin?"
                    );


                if (!confirmed) {
                    return;
                }


                /*
                    Backend/JWT entegrasyonu geldiğinde
                    burada token temizlenecek.

                    Örnek:

                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    window.location.href =
                        "Pages/Login.html";
                */

                console.log(
                    "Logout event hazır. Backend entegrasyonu bekleniyor."
                );

            }
        );

    }


    /* ==========================================
       MOCK EXERCISE INTERACTION
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