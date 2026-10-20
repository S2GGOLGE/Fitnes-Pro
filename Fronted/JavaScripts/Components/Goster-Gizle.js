// ==========================================
// FITNESS PRO
// GÖSTER / GİZLE COMPONENT
// ==========================================

(function () {
    "use strict";

    const EYE_ICON_SVG =
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
        '<path d="M2 12C2 12 5.5 5 12 5C18.5 5 22 12 22 12C22 12 18.5 19 12 19C5.5 19 2 12 2 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />' +
        '<circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" />' +
        '</svg>';

    const EYE_OFF_ICON_SVG =
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
        '<path d="M17.94 17.94C16.23 19.24 14.15 20 12 20C5.5 20 2 12 2 12C3.24 9.68 5.06 7.69 7.3 6.32M9.9 4.24C10.59 4.08 11.29 4 12 4C18.5 4 22 12 22 12C21.39 13.14 20.67 14.2 19.84 15.16M14.12 14.12C13.56 14.68 12.8 15 12 15C10.34 15 9 13.66 9 12C9 11.2 9.32 10.44 9.88 9.88" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />' +
        '<path d="M3 3L21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />' +
        '</svg>';

    function syncToggleState(toggle, input) {
        const isVisible = input.type === "text";

        toggle.innerHTML = isVisible ? EYE_OFF_ICON_SVG : EYE_ICON_SVG;
        toggle.setAttribute("aria-label", isVisible ? "Şifreyi gizle" : "Şifreyi göster");
        toggle.setAttribute("aria-pressed", isVisible ? "true" : "false");
        toggle.classList.toggle("active", isVisible);
    }

    function initPasswordToggles() {
        const passwordToggles = document.querySelectorAll("[data-password-target]");
        const boundForms = new Set();

        passwordToggles.forEach((toggle) => {
            if (toggle.dataset.passwordToggleBound === "true") {
                return;
            }
            toggle.dataset.passwordToggleBound = "true";

            if (toggle.tagName === "BUTTON" && (!toggle.getAttribute("type") || toggle.getAttribute("type") !== "button")) {
                toggle.setAttribute("type", "button");
            }

            const targetId = toggle.dataset.passwordTarget;
            const input = targetId ? document.getElementById(targetId) : null;

            if (input) {
                syncToggleState(toggle, input);

                const parentForm = input.closest("form");
                if (parentForm && !boundForms.has(parentForm)) {
                    boundForms.add(parentForm);
                    parentForm.addEventListener("reset", () => {
                        const formToggles = parentForm.querySelectorAll("[data-password-target]");
                        formToggles.forEach((btn) => {
                            const id = btn.dataset.passwordTarget;
                            const targetInput = id ? document.getElementById(id) : null;
                            if (targetInput) {
                                targetInput.type = "password";
                                syncToggleState(btn, targetInput);
                            }
                        });
                    });
                }
            }

            toggle.addEventListener("click", (event) => {
                event.preventDefault();

                const currentTargetId = toggle.dataset.passwordTarget;
                const currentInput = currentTargetId ? document.getElementById(currentTargetId) : null;

                if (!currentInput) {
                    console.warn(`Şifre alanı bulunamadı: #${currentTargetId}`);
                    return;
                }

                if (currentInput.disabled || toggle.disabled) {
                    return;
                }

                const isHidden = currentInput.type === "password";
                currentInput.type = isHidden ? "text" : "password";

                syncToggleState(toggle, currentInput);
            });
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initPasswordToggles);
    } else {
        initPasswordToggles();
    }
})();
