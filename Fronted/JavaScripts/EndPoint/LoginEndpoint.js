// =========================================================
// FITNESS PRO - LOGIN ENDPOINT INTEGRATION
// =========================================================

document.addEventListener("DOMContentLoaded", () => {
    // If already logged in, redirect to index
    if (window.Auth && window.Auth.redirectIfLoggedIn()) {
        return;
    }

    // API Configuration
    const API_BASE_URL = (window.Auth && window.Auth.getBaseUrl()) || window.API_BASE_URL || "http://localhost:8081";
    const LOGIN_ENDPOINT = `${API_BASE_URL}/api/login`;

    // Form and Element Selectors
    const loginForm = document.querySelector(".form");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const submitButton = loginForm ? loginForm.querySelector(".login-btn") : null;
    const alertBox = document.getElementById("formAlert");

    if (!loginForm) {
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
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        clearAlert();

        // Form Values
        const username = usernameInput ? usernameInput.value.trim() : "";
        const password = passwordInput ? passwordInput.value : "";

        // Client-side Validation
        if (!username || !password) {
            showAlert("Lütfen kullanıcı adı ve şifrenizi giriniz.", "error");
            return;
        }

        // Backend LoginModel Payload
        const payload = {
            username: username,
            password: password
        };

        // Loading State & Prevent Double Submit
        const originalBtnText = submitButton ? submitButton.textContent : "Giriş";
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "Giriş yapılıyor...";
        }

        try {
            const response = await fetch(LOGIN_ENDPOINT, {
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
                const successMsg = (result.message && !result.message.startsWith("ey")) ? result.message : "Giriş başarılı!";
                showAlert(successMsg, "success");

                // Extract JWT token and user info from backend response
                const data = result.data;
                let token = null;
                let userData = null;

                if (typeof data === "string") {
                    token = data;
                } else if (data && typeof data === "object") {
                    token = data.token;
                    userData = {
                        userId: data.userId,
                        username: data.username || username,
                        role: data.role || "User"
                    };
                } else if (result.token) {
                    token = result.token;
                } else if (typeof result.message === "string" && result.message.startsWith("ey")) {
                    token = result.message;
                }

                // Save JWT Session
                if (token && window.Auth) {
                    window.Auth.saveSession(token, userData || { username });
                }

                loginForm.reset();

                // Redirect to Dashboard
                setTimeout(() => {
                    window.location.href = "index.html";
                }, 1000);
            } else {
                // Error Handling (Backend ApiResponseModel or HTTP Status errors)
                let errorMsg = "Giriş işlemi sırasında bir hata oluştu.";

                if (result && result.message && !result.message.startsWith("ey")) {
                    errorMsg = result.message;
                } else if (response.status === 400 || response.status === 401) {
                    errorMsg = "Kullanıcı adı veya şifre hatalı.";
                } else if (response.status === 404) {
                    errorMsg = "Giriş servisine ulaşılamadı (404).";
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