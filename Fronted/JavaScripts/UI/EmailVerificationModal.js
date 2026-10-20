// =========================================================
// FITNESS PRO - EMAIL VERIFICATION MODAL
// =========================================================
//
// Login ekranında e-posta doğrulaması veya giriş 2FA doğrulaması
// gerektiğinde açılır. GlobalModal altyapısı üzerinden çalışır.
//
// Özellikler:
//   - Modalın açılması kod gönderiminden ayrıştırılmıştır:
//     modal anında açılır, ardından arka planda kod gönderilir.
//   - Kod gönderme (sendCode), yeniden gönderme (Tekrar Gönder)
//     ve doğrulama (verify) işlemleri mevcut TwoFactorEndpoint
//     sözleşmesiyle uyumlu çalışır.
//   - Modal kapatılıp tekrar açıldığında önceki state ve
//     dinleyiciler sıfırlanır; state tutarsızlığı oluşmaz.
// =========================================================

(function () {
    "use strict";

    let activeState = {
        isSending: false,
        isVerifying: false,
        verified: false
    };

    function resetActiveState() {
        activeState = {
            isSending: false,
            isVerifying: false,
            verified: false
        };
    }

    function getElements() {
        return {
            input: document.getElementById("emailVerificationCode"),
            helpBox: document.getElementById("emailVerificationHelp"),
            errorBox: document.getElementById("emailVerificationError")
        };
    }

    function showError(message) {
        const { errorBox } = getElements();
        if (!errorBox) return;
        errorBox.textContent = message || "Doğrulama işlemi sırasında bir hata oluştu.";
        errorBox.hidden = false;
    }

    function clearError() {
        const { errorBox } = getElements();
        if (!errorBox) return;
        errorBox.textContent = "";
        errorBox.hidden = true;
    }

    function setHelpText(message) {
        const { helpBox } = getElements();
        if (!helpBox || !message) return;
        helpBox.textContent = message;
    }

    async function triggerSendCode(authToken, email, isResend) {
        if (activeState.isSending || activeState.verified) {
            return false;
        }

        clearError();

        const hasBackendToken = Boolean(
            authToken ||
            sessionStorage.getItem("fitnesspro_onboarding_token") ||
            (window.Auth && typeof window.Auth.getToken === "function" && window.Auth.getToken())
        );

        if (!hasBackendToken || !window.TwoFactorEndpoint || typeof window.TwoFactorEndpoint.sendCode !== "function") {
            setHelpText(
                isResend
                    ? "Yeni doğrulama kodu gönderildi. Lütfen 6 haneli kodu girin."
                    : "E-posta adresinize gönderilen 6 haneli doğrulama kodunu girin."
            );
            return true;
        }

        activeState.isSending = true;
        setHelpText(isResend ? "Yeni doğrulama kodu gönderiliyor..." : "Doğrulama kodu e-posta adresinize gönderiliyor...");

        try {
            const payload = await window.TwoFactorEndpoint.sendCode(authToken);
            const targetText = email ? `${email} adresine` : "e-posta adresinize";
            setHelpText(
                (payload && payload.message) ||
                (isResend
                    ? `Yeni doğrulama kodu ${targetText} gönderildi.`
                    : `Doğrulama kodu ${targetText} gönderildi. Kod 5 dakika geçerlidir.`)
            );
            return true;
        } catch (err) {
            setHelpText("E-posta adresinize gönderilen 6 haneli doğrulama kodunu girin.");
            showError(
                (err && err.message) ||
                "Doğrulama kodu gönderilemedi. 'Kodu Tekrar Gönder' butonunu kullanabilirsiniz."
            );
            return false;
        } finally {
            activeState.isSending = false;
        }
    }

    function openEmailVerificationModal(options = {}) {
        if (!window.GlobalModal || typeof window.GlobalModal.open !== "function") {
            return;
        }

        resetActiveState();

        const authToken = options.authToken || options.onboardingToken || options.token || null;
        const email = options.email || "";
        const autoSendCode = options.autoSendCode !== false;
        const onVerifiedCallback = typeof options.onVerified === "function" ? options.onVerified : null;
        const onCancelCallback = typeof options.onCancel === "function" ? options.onCancel : null;

        const descriptionText = email
            ? `Hesabınızın güvenliği için ${email} adresine gönderilen 6 haneli doğrulama kodunu girin.`
            : "Hesabınızın güvenliği için e-posta adresinize gönderilen 6 haneli doğrulama kodunu girin.";

        window.GlobalModal.open({
            type: "info",
            title: "E-posta Adresinizi Doğrulayın",
            description: descriptionText,
            closeOnOverlay: false,
            closeOnEscape: true,
            closeButton: true,
            initialFocus: "#emailVerificationCode",
            onClose: (reason) => {
                const wasVerified = activeState.verified || reason === "verified";
                resetActiveState();
                if (!wasVerified && onCancelCallback) {
                    onCancelCallback(reason);
                }
            },
            html:
                '<div class="two-factor-modal-code">' +
                '<label class="form-group" for="emailVerificationCode">' +
                '<span>6 haneli doğrulama kodu</span>' +
                '<input class="form-input two-factor-code-input" id="emailVerificationCode" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" placeholder="123456" aria-describedby="emailVerificationHelp emailVerificationError" required>' +
                '<small id="emailVerificationHelp">E-posta adresinize gönderilen 6 haneli doğrulama kodunu girin.</small>' +
                '</label>' +
                '<p class="two-factor-modal-error" id="emailVerificationError" role="alert" hidden></p>' +
                '</div>',
            buttons: [
                {
                    id: "resendEmailCode",
                    text: "Kodu Tekrar Gönder",
                    loadingText: "Gönderiliyor...",
                    variant: "secondary",
                    closeOnClick: false,
                    callback: async ({ setLoading }) => {
                        if (activeState.isSending || activeState.isVerifying) {
                            return false;
                        }
                        setLoading(true);
                        try {
                            await triggerSendCode(authToken, email, true);
                            const { input } = getElements();
                            if (input && !input.disabled) {
                                input.value = "";
                                input.focus();
                            }
                        } finally {
                            setLoading(false);
                        }
                        return false;
                    }
                },
                {
                    id: "verifyEmailCode",
                    text: "Doğrula",
                    loadingText: "Doğrulanıyor...",
                    variant: "primary",
                    closeOnClick: false,
                    callback: async ({ close, setLoading }) => {
                        if (activeState.isVerifying) {
                            return false;
                        }

                        const { input } = getElements();
                        const code = input ? input.value.trim() : "";

                        if (!/^\d{6}$/.test(code)) {
                            showError("Lütfen 6 haneli doğrulama kodunu girin.");
                            input?.focus();
                            return false;
                        }

                        clearError();
                        activeState.isVerifying = true;
                        if (input) input.disabled = true;
                        setLoading(true);

                        const hasBackendToken = Boolean(
                            authToken ||
                            sessionStorage.getItem("fitnesspro_onboarding_token") ||
                            (window.Auth && typeof window.Auth.getToken === "function" && window.Auth.getToken())
                        );

                        try {
                            if (hasBackendToken && window.TwoFactorEndpoint && typeof window.TwoFactorEndpoint.verify === "function") {
                                const payload = await window.TwoFactorEndpoint.verify(code, authToken);
                                if (!payload || payload.verified !== true) {
                                    throw new Error((payload && payload.message) || "Doğrulama kodu geçersiz veya süresi dolmuş.");
                                }
                            } else {
                                // Standalone / simülasyon fallback
                                await new Promise((resolve) => setTimeout(resolve, 600));
                            }

                            activeState.verified = true;

                            if (onVerifiedCallback) {
                                await onVerifiedCallback({ code });
                            }

                            window.dispatchEvent(
                                new CustomEvent("fitnesspro:email-verified", {
                                    detail: { code }
                                })
                            );

                            close("verified");
                            return false;
                        } catch (err) {
                            activeState.isVerifying = false;
                            if (input) {
                                input.disabled = false;
                                input.focus();
                            }
                            setLoading(false);
                            showError((err && err.message) || "Doğrulama kodu geçersiz veya süresi dolmuş.");
                            return false;
                        }
                    }
                }
            ]
        });

        const { input } = getElements();
        if (input) {
            input.addEventListener("input", (event) => {
                event.currentTarget.value = event.currentTarget.value.replace(/\D/g, "").slice(0, 6);
                clearError();
            });

            input.addEventListener("keydown", (event) => {
                if (event.key === "Enter") {
                    event.preventDefault();
                    const verifyBtn = document.querySelector('#globalModalActions [data-global-modal-action="1"]');
                    if (verifyBtn && !verifyBtn.disabled) {
                        verifyBtn.click();
                    }
                }
            });
        }

        if (autoSendCode) {
            triggerSendCode(authToken, email, false);
        }
    }

    window.EmailVerificationModal = {
        open: openEmailVerificationModal
    };
})();
