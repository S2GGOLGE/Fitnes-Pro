/* =========================================================
   FITNESS PRO - NOTIFICATIONS
   Modal sistemi HARİCİDİR.
   Bu dosya modal açma/kapatma işlemi yapmaz.
   ========================================================= */


/* =========================================================
   ELEMENTLER
   ========================================================= */

const notificationList = document.getElementById("notificationList");
const emptyState = document.getElementById("emptyState");

const totalNotifications = document.getElementById("totalNotifications");
const unreadNotifications = document.getElementById("unreadNotifications");
const weekNotifications = document.getElementById("weekNotifications");

const searchInput = document.getElementById("notificationSearch");

const filterButtons = document.querySelectorAll(".notification-filter");


/* =========================================================
   BİLDİRİM SAYILARINI GÜNCELLE
   ========================================================= */

function updateCounts() {

    const notifications =
        document.querySelectorAll(".notification-item");

    const unread =
        document.querySelectorAll(
            ".notification-item.unread"
        );

    if (totalNotifications) {
        totalNotifications.textContent =
            notifications.length;
    }

    if (unreadNotifications) {
        unreadNotifications.textContent =
            unread.length;
    }

    /*
     * Bu hafta bildirimi.
     * Eğer backend tarafında gerçek tarih kullanılacaksa
     * burada data-date üzerinden hesaplama yapılabilir.
     */

    if (weekNotifications) {

        const now = new Date();

        const startOfWeek = new Date(now);

        const day = now.getDay();

        const diff = day === 0 ? 6 : day - 1;

        startOfWeek.setDate(
            now.getDate() - diff
        );

        startOfWeek.setHours(
            0,
            0,
            0,
            0
        );

        let count = 0;

        notifications.forEach(notification => {

            const dateValue =
                notification.dataset.date;

            if (!dateValue) {
                return;
            }

            const notificationDate =
                new Date(dateValue);

            if (
                !isNaN(notificationDate) &&
                notificationDate >= startOfWeek
            ) {
                count++;
            }

        });

        weekNotifications.textContent = count;
    }
}


/* =========================================================
   BOŞ DURUM KONTROLÜ
   ========================================================= */

function checkEmpty() {

    if (!notificationList || !emptyState) {
        return;
    }

    const visibleNotifications =
        [...notificationList.querySelectorAll(
            ".notification-item"
        )].filter(item => {

            return item.style.display !== "none";

        });

    if (visibleNotifications.length === 0) {

        emptyState.style.display = "flex";

    } else {

        emptyState.style.display = "none";
    }
}


/* =========================================================
   BİLDİRİME TIKLAMA
   ========================================================= */

if (notificationList) {

    notificationList.addEventListener(
        "click",
        function (event) {

            const notification =
                event.target.closest(
                    ".notification-item"
                );

            if (!notification) {
                return;
            }


            /*
             * Silme butonuna basıldıysa
             * bildirim okunmuş yapılmaz.
             */

            if (
                event.target.closest(
                    ".delete-notification"
                )
            ) {
                return;
            }


            /*
             * Detay butonuna basıldıysa
             * HARİCİ MODAL sistemi çalışacak.
             *
             * Burada modal açmıyoruz.
             */

            if (
                event.target.closest(
                    ".detail"
                )
            ) {
                return;
            }


            /*
             * Bildirimi okundu yap
             */

            if (
                notification.classList.contains(
                    "unread"
                )
            ) {

                notification.classList.remove(
                    "unread"
                );

                updateCounts();
            }

        }
    );
}


/* =========================================================
   TÜMÜNÜ OKUNDU YAP
   ========================================================= */

const markAllRead =
    document.getElementById(
        "markAllRead"
    );

if (markAllRead) {

    markAllRead.addEventListener(
        "click",
        function () {

            const unread =
                document.querySelectorAll(
                    ".notification-item.unread"
                );

            unread.forEach(notification => {

                notification.classList.remove(
                    "unread"
                );

            });

            updateCounts();
        }
    );
}


/* =========================================================
   BİLDİRİM SİL
   ========================================================= */

if (notificationList) {

    notificationList.addEventListener(
        "click",
        function (event) {

            const deleteButton =
                event.target.closest(
                    ".delete-notification"
                );

            if (!deleteButton) {
                return;
            }

            event.stopPropagation();

            const notification =
                deleteButton.closest(
                    ".notification-item"
                );

            if (!notification) {
                return;
            }

            notification.remove();

            updateCounts();
            checkEmpty();
        }
    );
}


/* =========================================================
   FİLTRELEME
   ========================================================= */

filterButtons.forEach(button => {

    button.addEventListener(
        "click",
        function () {

            /*
             * Aktif filtre
             */

            filterButtons.forEach(btn => {

                btn.classList.remove(
                    "active"
                );

            });

            button.classList.add(
                "active"
            );


            const filter =
                button.dataset.filter ||
                "all";


            const notifications =
                document.querySelectorAll(
                    ".notification-item"
                );


            notifications.forEach(
                notification => {

                    let show = true;


                    /* -------------------------
                       TÜMÜ
                       ------------------------- */

                    if (filter === "all") {

                        show = true;

                    }


                    /* -------------------------
                       OKUNMAMIŞ
                       ------------------------- */

                    else if (
                        filter === "unread"
                    ) {

                        show =
                            notification.classList
                                .contains(
                                    "unread"
                                );

                    }


                    /* -------------------------
                       KATEGORİ
                       ------------------------- */

                    else {

                        const category =
                            notification.dataset.category;

                        show =
                            category === filter;
                    }


                    notification.style.display =
                        show ? "" : "none";

                }
            );


            checkEmpty();
        }
    );
});


/* =========================================================
   ARAMA
   ========================================================= */

if (searchInput) {

    searchInput.addEventListener(
        "input",
        function () {

            const search =
                searchInput.value
                    .trim()
                    .toLowerCase();


            const notifications =
                document.querySelectorAll(
                    ".notification-item"
                );


            notifications.forEach(
                notification => {

                    const text =
                        notification.textContent
                            .toLowerCase();

                    if (
                        text.includes(search)
                    ) {

                        notification.style.display =
                            "";

                    } else {

                        notification.style.display =
                            "none";
                    }

                }
            );


            checkEmpty();
        }
    );
}


/* =========================================================
   TEMA
   ========================================================= */

const themeToggle =
    document.getElementById(
        "themeToggle"
    );

if (themeToggle) {

    themeToggle.addEventListener(
        "click",
        function () {

            document.body.classList.toggle(
                "light-theme"
            );

        }
    );
}


/* =========================================================
   BAŞLANGIÇ
   ========================================================= */

updateCounts();
checkEmpty();