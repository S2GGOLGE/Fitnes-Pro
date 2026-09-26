// =========================================================
// FITNESS PRO - EMAIL VERIFICATION MODAL (FRONTEND-ONLY)
// =========================================================
//
// Login sonrası kullanıcının e-posta adresi doğrulanmamışsa
// bu modal açılır. Kullanıcı 6 haneli kodu girer ve
// "Doğrula" butonuna basar.
//
// Backend entegrasyonu YOKTUR — sadece frontend simülasyonudur.
// Tüm akış GlobalModal altyapısı üzerinden yürür; yeni bir
// toast / alert mimarisi oluşturmaz.
//
// Akış:
//   1) Login başarılı olduğunda çağrılır.
//   2) Kullanıcı 6 haneli kod girer.
//   3) "Doğrula" basılınca 1.2 sn gecikmeyle başarılı sayılır
//      ve window.Auth içinde emailVerified=true yapılır.
//   4) Modal kapanır ve yönlendirme tetiklenir (login sayfası
//      kendi redirect akışını yürütür).
// =========================================================

(function () {
    "use strict";

    function openEmailVerificationModal() {
        if (!window.GlobalModal || typeof window.GlobalModal.open !== "function") {
            // Modal altyapısı yoksa sessizce geç — login akışı
            // zaten kendi yönlendirmesini yapıyor.
            return;
        }

        window.GlobalModal.open({
            type: "info",
            title: "E-posta Adresinizi Doğrulayın",
            description:
                "Hesabınızın güvenliği için e-posta adresinize gönderilen 6 haneli doğrulama kodunu girin.",
            closeOnOverlay: false,
            closeOnEscape: false,
            closeButton: false,
            initialFocus: "#emailVerificationCode",
            html: '<div class="two-factor-modal-code">' +
                '<label class="form-group">' +
                '<span>6 haneli doğrulama kodu</span>' +
                '<input class="form-input two-factor-code-input" id="emailVerificationCode" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" placeholder="123456" aria-describedby="emailVerificationHelp emailVerificationError" required>' +
                '<small id="emailVerificationHelp">Demo amaçlı herhangi 6 haneli kod kabul edilir.</small>' +
                '</label>' +
                '<p class="two-factor-modal-error" id="emailVerificationError" role="alert" hidden></p>' +
                '</div>',
            buttons: [
                {
                    text: "Doğrula",
                    loadingText: "Doğrulanıyor...",
                    variant: "primary",
                    closeOnClick: false,
                    callback: ({ close, setLoading }) => {
                        const input = document.getElementById("emailVerificationCode");
                        const errorBox = document.getElementById("emailVerificationError");
                        const code = input ? input.value.trim() : "";

                        if (!/^\d{6}$/.test(code)) {
                            if (errorBox) {
                                errorBox.textContent = "Lütfen 6 haneli doğrulama kodunu girin.";
                                errorBox.hidden = false;
                            }
                            input?.focus();
                            return false;
                        }

                        if (input) input.disabled = true;

                        // Frontend simülasyonu — backend çağrısı yok.
                        setTimeout(() => {
                            try {
                                if (window.Auth && typeof window.Auth.saveSession === "function") {
                                    const current = window.Auth.getUser ? window.Auth.getUser() : null;
                                    if (current) {
                                        current.emailVerified = true;
                                        const token = window.Auth.getToken && window.Auth.getToken();
                                        if (token) {
                                            window.Auth.saveSession(token, current);
                                        }
                                    }
                                }
                            } catch (err) {
                                // Auth yardımcısı yoksa sessizce geç.
                            }

                            // Login akışı bu olayı dinleyerek yönlendirme yapıyor.
                            window.dispatchEvent(
                                new CustomEvent("fitnesspro:email-verified", {
                                    detail: { code }
                                })
                            );

                            close("verified");
                        }, 1200);

                        return false;
                    }
                }
            ]
        });

        const input = document.getElementById("emailVerificationCode");
        if (input) {
            input.addEventListener("input", event => {
                event.currentTarget.value = event.currentTarget.value.replace(/\D/g, "").slice(0, 6);
                const errorBox = document.getElementById("emailVerificationError");
                if (errorBox) errorBox.hidden = true;
            });
        }
    }

    window.EmailVerificationModal = {
        open: openEmailVerificationModal
    };
})();
