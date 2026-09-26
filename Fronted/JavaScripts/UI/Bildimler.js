/* =========================================================
   FITNESS PRO - NOTIFICATIONS
   Modal sistemi HARİCİDİR.
   Bu dosya modal açma/kapatma işlemi yapmaz.
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    /* =========================================================
       LUCIDE YARDIMCISI
       Lucide ikonları DOM'a eklendikten sonra yeniden
       çalıştırılmalıdır; aksi halde yeni ikonlar görünmez.
       ========================================================= */

    function refreshIcons(root = document) {
        if (window.lucide && typeof window.lucide.createIcons === "function") {
            window.lucide.createIcons({ root });
        }
    }


    /* =========================================================
       ELEMENTLER
       ========================================================= */

    const notificationList = document.getElementById("notificationList");
    const emptyState = document.getElementById("emptyState");

    // Sayfa istatistik sayaçları (Bildirimler.html)
    const totalCount = document.getElementById("totalCount");
    const unreadCount = document.getElementById("unreadCount");

    const searchInput = document.getElementById("searchInput");
    const markAllBtn = document.getElementById("markAllBtn");
    const themeBtn = document.getElementById("themeBtn");

    // Filtre butonları (.filter class'ı HTML ile eşleşir)
    const filterButtons = document.querySelectorAll(".filter");


    /* =========================================================
       BOŞ DURUM KONTROLÜ
       Bildirim varsa: gizle, yoksa: göster.
       Boş durumda "Tümünü Okundu Yap" butonu da gizlenir
       (okunacak bir şey yok).
       ========================================================= */

    function checkEmpty() {
        if (!notificationList || !emptyState) return;

        const visibleNotifications = Array.from(
            notificationList.querySelectorAll(".notification")
        ).filter(item => item.style.display !== "none");

        const isEmpty = visibleNotifications.length === 0;
        emptyState.style.display = isEmpty ? "flex" : "none";

        // Okunacak bildirim yokken "Tümünü Okundu Yap" butonu anlamsız.
        if (markAllBtn) {
            markAllBtn.hidden = isEmpty;
            markAllBtn.setAttribute("aria-hidden", String(isEmpty));
            markAllBtn.disabled = isEmpty;
        }
    }


    /* =========================================================
       BİLDİRİM SAYILARINI GÜNCELLE
       ========================================================= */

    function updateCounts() {
        const notifications = document.querySelectorAll(".notification");
        const unread = document.querySelectorAll(".notification.unread");

        if (totalCount) totalCount.textContent = notifications.length;
        if (unreadCount) unreadCount.textContent = unread.length;
    }


    /* =========================================================
       BİLDİRİME TIKLAMA (okundu yap)
       ========================================================= */

    if (notificationList) {

        notificationList.addEventListener("click", event => {

            const deleteButton = event.target.closest(".delete");
            if (deleteButton) {
                event.stopPropagation();
                const notification = deleteButton.closest(".notification");
                if (!notification) return;
                notification.remove();
                updateCounts();
                checkEmpty();
                return;
            }

            const detailButton = event.target.closest(".detail");
            if (detailButton) {
                // Detay modalı NotificationModalBridge tarafından açılır.
                return;
            }

            const notification = event.target.closest(".notification");
            if (!notification) return;

            if (notification.classList.contains("unread")) {
                notification.classList.remove("unread");
                updateCounts();
            }
        });
    }


    /* =========================================================
       TÜMÜNÜ OKUNDU YAP
       ========================================================= */

    if (markAllBtn) {
        markAllBtn.addEventListener("click", () => {
            document.querySelectorAll(".notification.unread").forEach(item => {
                item.classList.remove("unread");
            });
            updateCounts();
        });
    }


    /* =========================================================
       FİLTRELEME
       ========================================================= */

    filterButtons.forEach(button => {
        button.addEventListener("click", () => {

            filterButtons.forEach(btn => btn.classList.remove("active"));
            button.classList.add("active");

            const filter = button.dataset.filter || "all";

            document.querySelectorAll(".notification").forEach(notification => {

                let show = true;

                if (filter === "all") {
                    show = true;
                } else if (filter === "unread") {
                    show = notification.classList.contains("unread");
                } else {
                    // Bildirim tipi (data-type) filtre ile eşleşmeli
                    show = notification.dataset.type === filter;
                }

                notification.style.display = show ? "" : "none";
            });

            checkEmpty();
        });
    });


    /* =========================================================
       ARAMA
       ========================================================= */

    if (searchInput) {

        searchInput.addEventListener("input", () => {

            const search = searchInput.value.trim().toLowerCase();

            document.querySelectorAll(".notification").forEach(notification => {

                const text = notification.textContent.toLowerCase();

                notification.style.display = text.includes(search) ? "" : "none";

            });

            checkEmpty();
        });
    }


    /* =========================================================
       TEMA
       ========================================================= */

    if (themeBtn) {
        themeBtn.addEventListener("click", () => {
            document.body.classList.toggle("light-theme");
        });
    }


    /* =========================================================
       BAŞLANGIÇ
       ========================================================= */

    updateCounts();
    checkEmpty();

    // Lucide kütüphanesi yüklendikten sonra ikonları render et.
    // Eğer lucide daha yüklenmediyse, kütüphane geldiğinde
    // otomatik olarak ikonların render edilmesini sağla.
    if (window.lucide) {
        refreshIcons();
    } else {
        const lucideInterval = setInterval(() => {
            if (window.lucide) {
                clearInterval(lucideInterval);
                refreshIcons();
            }
        }, 50);

        // 5 saniye sonra vazgeç, sonsuz interval oluşmasın
        setTimeout(() => clearInterval(lucideInterval), 5000);
    }

});