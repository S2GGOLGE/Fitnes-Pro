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
            const icon = notification.querySelector(".notification-icon")?.textContent?.trim() || "";

            window.GlobalModal.open({
                type: "info",
                title,
                icon: icon ? `<span class="global-modal-feature-icon">${escapeHtml(icon)}</span>` : undefined,
                content: `<p>${escapeHtml(text)}</p>${time ? `<p class="global-modal-meta">${escapeHtml(time)}</p>` : ""}`,
                buttons: [{ text: "Kapat", variant: "primary" }]
            });
        });
    });

    function escapeHtml(value) {
        const element = document.createElement("div");
        element.textContent = value;
        return element.innerHTML;
    }
})();
