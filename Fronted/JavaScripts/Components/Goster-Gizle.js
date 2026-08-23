// ==========================================
// FITNESS PRO
// GÖSTER / GİZLE COMPONENT
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    const passwordToggles = document.querySelectorAll(
        "[data-password-target]"
    );


    passwordToggles.forEach((toggle) => {

        toggle.addEventListener("click", () => {

            const targetId =
                toggle.dataset.passwordTarget;

            const input =
                document.getElementById(targetId);


            // Input bulunamadıysa işlemi durdur

            if (!input) {

                console.warn(
                    `Şifre alanı bulunamadı: #${targetId}`
                );

                return;
            }


            // Mevcut durumu kontrol et

            const isHidden =
                input.type === "password";


            // Şifreyi göster / gizle

            input.type =
                isHidden
                    ? "text"
                    : "password";


            // Accessibility

            toggle.setAttribute(
                "aria-label",
                isHidden
                    ? "Şifreyi gizle"
                    : "Şifreyi göster"
            );


            // Aktif class

            toggle.classList.toggle(
                "active",
                isHidden
            );

        });

    });

});