// FITNESS PRO - NOTIFICATION MODAL BRIDGE
// Notification data/behaviour stays in its own feature; this file only maps
// the detail UI to the centralized GlobalModal API.
(function () {
    "use strict";

    document.addEventListener("DOMContentLoaded", () => {
        const list = document.getElementById("notificationList");
        if (!list || !window.GlobalModal) return;

        list.addEventListener("click", (event) => {
            const detailButton = event.target.closest(".detail");
            if (!detailButton) return;

            const notification = detailButton.closest(".notification, .notification-item");
            if (!notification) return;

            event.preventDefault();
            event.stopPropagation();

            const title = notification.querySelector(".notification-title")?.textContent?.trim() || "Bildirim";
            const text = notification.querySelector(".notification-text")?.textContent?.trim() || "";
            const time = notification.querySelector(".notification-time")?.textContent?.trim() || "";
            const icons = { workout: "dumbbell", goal: "target", achievement: "award", system: "bell" };
            const icon = icons[notification.dataset.type] || "bell";

            window.GlobalModal.open({
                type: notification.dataset.type === "achievement" ? "success" : notification.dataset.type === "system" ? "warning" : "info",
                title,
                icon: `<i data-lucide="${icon}" aria-hidden="true"></i>`,
                content: `<p>${escapeHtml(text)}</p>${time ? `<p class="global-modal-meta">${escapeHtml(time)}</p>` : ""}`,
                buttons: [{ text: "Kapat", variant: "primary" }]
            });
            if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
        });
    });

    function escapeHtml(value) {
        const element = document.createElement("div");
        element.textContent = value;
        return element.innerHTML;
    }
})();
