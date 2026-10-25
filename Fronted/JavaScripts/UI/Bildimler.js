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
    const settingsButton = document.getElementById("notificationSettingsBtn");
    const menuButton = document.getElementById("notificationMenuBtn");
    const sidebar = document.getElementById("notificationSidebar");
    const sidebarOverlay = document.getElementById("notificationSidebarOverlay");

    const closeSidebar = () => {
        sidebar?.classList.remove("mobile-open");
        sidebarOverlay?.classList.remove("active");
        menuButton?.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
    };
    menuButton?.addEventListener("click", () => {
        const open = sidebar?.classList.toggle("mobile-open");
        sidebarOverlay?.classList.toggle("active", Boolean(open));
        menuButton.setAttribute("aria-expanded", String(Boolean(open)));
        menuButton.setAttribute("aria-label", open ? "Menüyü kapat" : "Menüyü aç");
        document.body.style.overflow = open ? "hidden" : "";
        if (open) sidebar?.querySelector("a")?.focus();
    });
    sidebarOverlay?.addEventListener("click", closeSidebar);
    document.addEventListener("keydown", event => { if (event.key === "Escape") closeSidebar(); });
    sidebar?.querySelectorAll("a").forEach(link => link.addEventListener("click", closeSidebar));
    window.addEventListener("resize", () => { if (window.innerWidth > 900) closeSidebar(); });

    // Filtre butonları (.filter class'ı HTML ile eşleşir)
    const filterButtons = document.querySelectorAll(".filter");
    let activeFilter = "all";
    let activeSearch = "";

    function applyNotificationFilters() {
        document.querySelectorAll(".notification").forEach(notification => {
            const typeMatch = activeFilter === "all" ||
                (activeFilter === "unread" ? notification.classList.contains("unread") : notification.dataset.type === activeFilter);
            const textMatch = !activeSearch || notification.textContent.toLowerCase().includes(activeSearch);
            notification.style.display = typeMatch && textMatch ? "" : "none";
        });
        checkEmpty();
    }

    if (settingsButton) {
        settingsButton.addEventListener("click", async () => {
            if (!window.GlobalModal || !window.NotificationSettingsAPI) {
                window.GlobalModal?.alert({ type: "error", title: "Hata", message: "Bildirim ayarları servisi kullanılamıyor." });
                return;
            }
            settingsButton.disabled = true;
            try {
                const settings = await window.NotificationSettingsAPI.get();
                window.GlobalModal.open({
                    type: "info",
                    title: "Bildirim Ayarları",
                    description: "Tercihleriniz hesabınıza özel olarak kaydedilir. E-posta gönderimi ve önem sınıflandırması mevcut bildirim akışında henüz desteklenmiyor.",
                    html: `<div class="notification-settings-form">
                        <label for="notificationChannel">Bildirim kanalı</label>
                        <select id="notificationChannel"><option value="InApp">Uygulama içi bildirim</option><option value="Email" ${settings.canUseEmail ? "" : "disabled"}>E-posta ${settings.canUseEmail ? "" : "(doğrulanmış e-posta gerekli)"}</option></select>
                        <label for="notificationPriority">Öncelik</label>
                        <select id="notificationPriority"><option value="All">Tüm bildirimler</option><option value="Important">Önemli bildirimler</option><option value="Critical">Kritik bildirimler</option></select>
                    </div>`,
                    buttons: [
                        { text: "Kapat", variant: "secondary" },
                        { text: "Kaydet", variant: "primary", callback: async ({ close, setLoading }) => {
                            const channel = document.getElementById("notificationChannel")?.value || "InApp";
                            const priority = document.getElementById("notificationPriority")?.value || "All";
                            setLoading(true);
                            try {
                                await window.NotificationSettingsAPI.save({ channel, priority });
                                close();
                                window.GlobalModal.alert({ type: "success", title: "Kaydedildi", message: "Bildirim tercihleriniz kaydedildi." });
                            } catch (error) {
                                window.GlobalModal.alert({ type: "error", title: "Kaydedilemedi", message: error.message });
                            } finally { setLoading(false); }
                            return false;
                        } }
                    ]
                });
                const channel = document.getElementById("notificationChannel");
                const priority = document.getElementById("notificationPriority");
                if (channel) channel.value = settings.channel;
                if (priority) priority.value = settings.priority;
            } catch (error) {
                window.GlobalModal.alert({ type: "error", title: "Ayarlar yüklenemedi", message: error.message });
            } finally { settingsButton.disabled = false; }
        });
    }


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

            activeFilter = button.dataset.filter || "all";
            applyNotificationFilters();
        });
    });


    /* =========================================================
       ARAMA
       ========================================================= */

    if (searchInput) {

        searchInput.addEventListener("input", () => {

            activeSearch = searchInput.value.trim().toLowerCase();
            applyNotificationFilters();
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
