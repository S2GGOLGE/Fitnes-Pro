/* =========================================================
   FITNESS PRO
   INDEX PAGE
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    /* ==================== ELEMENTS ==================== */

    const navbar = document.getElementById("navbar");
    const mobileMenuBtn = document.getElementById("mobileMenuBtn");
    const navMenu = document.getElementById("navMenu");

    const revealElements = document.querySelectorAll(".reveal");
    const navLinks = document.querySelectorAll(".nav-link");

    const statNumbers = document.querySelectorAll("[data-target]");


    /* ==================== NAVBAR SCROLL ==================== */

    function handleNavbarScroll() {

        if (window.scrollY > 30) {
            navbar.classList.add("scrolled");
        } else {
            navbar.classList.remove("scrolled");
        }

    }

    window.addEventListener("scroll", handleNavbarScroll);

    handleNavbarScroll();


    /* ==================== MOBILE MENU ==================== */

    if (mobileMenuBtn) {

        mobileMenuBtn.addEventListener("click", () => {

            navbar.classList.toggle("menu-open");

        });

    }


    /* ==================== CLOSE MOBILE MENU ==================== */

    navLinks.forEach(link => {

        link.addEventListener("click", () => {

            navbar.classList.remove("menu-open");

        });

    });


    /* ==================== REVEAL ANIMATION ==================== */

    const revealObserver = new IntersectionObserver(
        (entries, observer) => {

            entries.forEach(entry => {

                if (!entry.isIntersecting) {
                    return;
                }

                entry.target.classList.add("visible");

                observer.unobserve(entry.target);

            });

        },
        {
            threshold: 0.12
        }
    );


    revealElements.forEach(element => {

        revealObserver.observe(element);

    });


    /* ==================== STAT COUNTER ==================== */

    let statsAnimated = false;


    function animateStats() {

        if (statsAnimated) {
            return;
        }

        statsAnimated = true;

        statNumbers.forEach(element => {

            const target = Number(element.dataset.target);

            let current = 0;

            const duration = 1400;
            const startTime = performance.now();


            function updateCounter(currentTime) {

                const elapsed = currentTime - startTime;

                const progress = Math.min(elapsed / duration, 1);

                const easedProgress =
                    1 - Math.pow(1 - progress, 3);

                current = Math.floor(
                    target * easedProgress
                );

                element.textContent =
                    current.toLocaleString("tr-TR");


                if (progress < 1) {

                    requestAnimationFrame(updateCounter);

                } else {

                    element.textContent =
                        target.toLocaleString("tr-TR");

                }

            }


            requestAnimationFrame(updateCounter);

        });

    }


    /* ==================== STATS OBSERVER ==================== */

    const statsSection = document.getElementById("stats");


    if (statsSection) {

        const statsObserver = new IntersectionObserver(
            (entries, observer) => {

                entries.forEach(entry => {

                    if (!entry.isIntersecting) {
                        return;
                    }

                    animateStats();

                    observer.unobserve(entry.target);

                });

            },
            {
                threshold: 0.35
            }
        );


        statsObserver.observe(statsSection);

    }


    /* ==================== ACTIVE NAV ==================== */

    const sections = document.querySelectorAll("main section[id]");


    function updateActiveNav() {

        const scrollPosition =
            window.scrollY + 180;


        sections.forEach(section => {

            const sectionTop = section.offsetTop;

            const sectionHeight = section.offsetHeight;

            const sectionId = section.getAttribute("id");


            if (
                scrollPosition >= sectionTop &&
                scrollPosition < sectionTop + sectionHeight
            ) {

                navLinks.forEach(link => {

                    link.classList.remove("active");

                });


                const activeLink =
                    document.querySelector(
                        `.nav-link[href="#${sectionId}"]`
                    );


                if (activeLink) {
                    activeLink.classList.add("active");
                }

            }

        });

    }


    window.addEventListener(
        "scroll",
        updateActiveNav
    );


    updateActiveNav();


    /* ==================== SMOOTH ANCHOR ==================== */

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {

        anchor.addEventListener("click", event => {

            const targetId =
                anchor.getAttribute("href");


            if (
                !targetId ||
                targetId === "#"
            ) {
                return;
            }


            const target =
                document.querySelector(targetId);


            if (!target) {
                return;
            }


            event.preventDefault();


            const navbarHeight =
                navbar.offsetHeight;


            const targetPosition =
                target.getBoundingClientRect().top +
                window.scrollY -
                navbarHeight;


            window.scrollTo({
                top: targetPosition,
                behavior: "smooth"
            });

        });

    });


    /* ==================== REDUCED MOTION ==================== */

    const prefersReducedMotion =
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;


    if (prefersReducedMotion) {

        document.documentElement.style.scrollBehavior =
            "auto";

        revealElements.forEach(element => {

            element.classList.add("visible");

        });

    }

});