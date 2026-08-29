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

    // Submit Event Listener
    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();
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
                // Success Handling
                const successMsg = result.message || "Kayıt başarılı! Giriş sayfasına yönlendiriliyorsunuz...";
                showAlert(successMsg, "success");
                registerForm.reset();

                // Redirect to Login Page
                setTimeout(() => {
                    window.location.href = "Login.html";
                }, 1500);
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
            // Restore Button State
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = originalBtnText;
            }
        }
    });
});