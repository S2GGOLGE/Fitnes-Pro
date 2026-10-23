// =========================================================
// FITNESS PRO - REGISTER ENDPOINT INTEGRATION
// =========================================================

document.addEventListener("DOMContentLoaded", () => {
    // API Configuration
    const API_BASE_URL = window.API_BASE_URL || "http://localhost:8081";
    const REGISTER_ENDPOINT = `${API_BASE_URL}/api/register`;

    // Form and Element Selectors
    const registerForm = document.querySelector(".form");
    const firstNameInput = document.getElementById("firstName");
    const lastNameInput = document.getElementById("lastName");
    const emailInput = document.getElementById("email");
    const usernameInput = document.getElementById("username");
    const levelInput = document.getElementById("level");
    const passwordInput = document.getElementById("password");
    const confirmPasswordInput = document.getElementById("confirmPassword");
    const submitButton = registerForm ? registerForm.querySelector(".kayıt-btn") : null;
    const alertBox = document.getElementById("formAlert");

    // İzin verilen fitness seviyeleri (backend ile aynı küme).
    const ALLOWED_LEVELS = ["Acemi", "Orta", "Uzman"];

    if (!registerForm) {
        return;
    }

    // Helper: Show Alert Message (Success / Error)
    function showAlert(message, type = "error") {
        if (!alertBox) return;

        alertBox.textContent = message;
        alertBox.className = `form-alert show ${type}`;
    }

    // Helper: Clear Alert Message
    function clearAlert() {
        if (!alertBox) return;

        alertBox.textContent = "";
        alertBox.className = "form-alert";
    }

    let isSubmitting = false;

    // Submit Event Listener
    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (isSubmitting) return;

        clearAlert();

        // Form Values
        const name = firstNameInput ? firstNameInput.value.trim() : "";
        const surname = lastNameInput ? lastNameInput.value.trim() : "";
        const email = emailInput ? emailInput.value.trim() : "";
        const username = usernameInput ? usernameInput.value.trim() : "";
        const level = levelInput ? levelInput.value.trim() : "";
        const password = passwordInput ? passwordInput.value : "";
        const passwordRepeat = confirmPasswordInput ? confirmPasswordInput.value : "";

        // Client-side Validation
        if (!name || !surname || !email || !username || !password || !passwordRepeat) {
            showAlert("Lütfen tüm alanları doldurunuz.", "error");
            return;
        }

        if (!ALLOWED_LEVELS.includes(level)) {
            showAlert("Geçersiz seviye. Acemi, Orta veya Uzman seçiniz.", "error");
            return;
        }

        if (password !== passwordRepeat) {
            showAlert("Şifreler eşleşmiyor. Lütfen kontrol ediniz.", "error");
            return;
        }

        // Backend RegisterModel Payload
        const payload = {
            name: name,
            surname: surname,
            username: username,
            email: email,
            password: password,
            passwordRepeat: passwordRepeat,
            level: level
        };

        // Loading State
        const originalBtnText = submitButton ? submitButton.textContent : "Kayıt Ol";
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "Kayıt yapılıyor...";
        }
        isSubmitting = true;
        let isRedirecting = false;

        try {
            const response = await fetch(REGISTER_ENDPOINT, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            let result = null;
            try {
                result = await response.json();
            } catch {
                result = null;
            }

            if (response.ok && result && result.success) {
                // Backend, yalnızca konum ve e-posta doğrulama adımlarında geçerli olan
                // sınırlı yetkili/kısa ömürlü onboarding token'ı döner (normal oturum DEĞİL).
                const onboardingToken =
                    result.data && typeof result.data.onboardingToken === "string"
                        ? result.data.onboardingToken
                        : "";

                if (!onboardingToken) {
                    showAlert("Kayıt tamamlandı ancak devam adımı başlatılamadı. Lütfen giriş ekranından giriş yapınız.", "warning");
                    return;
                }

                // Kayıt sonrası adımlar (Konum & E-posta Doğrulama) için gerekli bilgiler.
                // Parola ASLA saklanmaz.
                try {
                    sessionStorage.removeItem("fitnesspro_email_verified");
                    sessionStorage.removeItem("fitnesspro_location");
                    sessionStorage.removeItem("fitnesspro_location_skipped");
                    sessionStorage.setItem("fitnesspro_register_user", JSON.stringify({
                        email: email,
                        username: username,
                        level: level,
                        name: name,
                        surname: surname,
                        emailVerified: false,
                        locationSet: false,
                        locationSkipped: false
                    }));
                    sessionStorage.setItem("fitnesspro_onboarding_token", onboardingToken);
                } catch (e) {
                    console.warn("Session saklama hatası:", e);
                    showAlert("Kayıt tamamlandı ancak tarayıcı depolaması kullanılamıyor. Lütfen giriş ekranından giriş yapınız.", "warning");
                    return;
                }

                registerForm.reset();
                isRedirecting = true;

                showAlert("Kayıt başarılı! Konum belirleme adımına yönlendiriliyorsunuz...", "success");
                setTimeout(() => {
                    window.location.href = "KonumBelirleme.html";
                }, 1000);
            } else {
                // Error Handling (Backend ApiResponseModel or HTTP Status errors)
                let errorMsg = "Kayıt işlemi sırasında bir hata oluştu.";

                if (result && result.message) {
                    errorMsg = result.message;
                } else if (response.status === 400) {
                    errorMsg = "Geçersiz form bilgileri. Lütfen alanları kontrol ediniz.";
                } else if (response.status === 404) {
                    errorMsg = "Kayıt servisine ulaşılamadı (404).";
                } else if (response.status >= 500) {
                    errorMsg = "Sunucu hatası oluştu (500). Lütfen daha sonra tekrar deneyiniz.";
                }

                showAlert(errorMsg, "error");
            }
        } catch (error) {
            // Network / Connection Error Handling
            showAlert("Sunucuya bağlanılamadı. Lütfen backend servisinin çalıştığından emin olunuz.", "error");
        } finally {
            // Restore Button State only if not redirecting to next page
            if (!isRedirecting && submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = originalBtnText;
                isSubmitting = false;
            }
        }
    });
});