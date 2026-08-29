// =========================================================
// FITNESS PRO - PASSWORD UPDATE ENDPOINT INTEGRATION
// =========================================================

document.addEventListener("DOMContentLoaded", () => {
    // API Configuration
    const API_BASE_URL = (window.Auth && window.Auth.getBaseUrl()) || window.API_BASE_URL || "http://localhost:8081";
    const PASSWORD_UPDATE_ENDPOINT = `${API_BASE_URL}/api/passupdate`;

    // Modal and Form Elements
    const modal = document.getElementById("passwordUpdateModal");
    const modalOverlay = document.getElementById("modalOverlay");
    const forgotPasswordLink = document.getElementById("forgotPasswordLink");
    const cancelButton = document.getElementById("cancelPasswordUpdate");
    const passwordUpdateForm = document.getElementById("passwordUpdateForm");
    const updateUsernameInput = document.getElementById("updateUsername");
    const oldPasswordInput = document.getElementById("oldPassword");
    const newPasswordInput = document.getElementById("newPassword");
    const submitButton = document.getElementById("submitPasswordUpdate");
    const modalAlert = document.getElementById("modalAlert");
    const loginPasswordInput = document.querySelector(".form input[name='password']");
    const loginUsernameInput = document.querySelector(".form input[name='username']");

    if (!modal || !passwordUpdateForm) {
        return;
    }

    // Helper: Show Modal Alert Message
    function showModalAlert(message, type = "error") {
        if (!modalAlert) return;

        modalAlert.textContent = message;
        modalAlert.className = `form-alert show ${type}`;
    }

    // Helper: Clear Modal Alert
    function clearModalAlert() {
        if (!modalAlert) return;

        modalAlert.textContent = "";
        modalAlert.className = "form-alert";
    }

    // Helper: Open Modal
    function openModal() {
        modal.classList.add("show");
        modal.setAttribute("aria-hidden", "false");

        // Pre-fill username if already entered in login form
        if (loginUsernameInput && loginUsernameInput.value) {
            updateUsernameInput.value = loginUsernameInput.value;
        }

        // Focus on first input
        setTimeout(() => {
            updateUsernameInput.focus();
        }, 100);

        // Prevent body scroll
        document.body.style.overflow = "hidden";
    }

    // Helper: Close Modal
    function closeModal() {
        modal.classList.remove("show");
        modal.setAttribute("aria-hidden", "true");

        // Clear form and alerts
        passwordUpdateForm.reset();
        clearModalAlert();

        // Restore body scroll
        document.body.style.overflow = "";
    }

    // Event: Open Modal on Link Click
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener("click", (event) => {
            event.preventDefault();
            openModal();
        });
    }

    // Event: Close Modal on Cancel Button
    if (cancelButton) {
        cancelButton.addEventListener("click", closeModal);
    }

    // Event: Close Modal on Overlay Click
    if (modalOverlay) {
        modalOverlay.addEventListener("click", closeModal);
    }

    // Event: Close Modal on ESC Key
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && modal.classList.contains("show")) {
            closeModal();
        }
    });

    // Submit Event Listener for Password Update Form
    passwordUpdateForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        clearModalAlert();

        // Form Values
        const username = updateUsernameInput ? updateUsernameInput.value.trim() : "";
        const oldPassword = oldPasswordInput ? oldPasswordInput.value : "";
        const password = newPasswordInput ? newPasswordInput.value : "";

        // Client-side Validation
        if (!username) {
            showModalAlert("Kullanıcı adı boş olamaz.", "error");
            return;
        }

        if (!oldPassword) {
            showModalAlert("Mevcut şifre boş olamaz.", "error");
            return;
        }

        if (!password) {
            showModalAlert("Yeni şifre boş olamaz.", "error");
            return;
        }

        if (password.length < 6) {
            showModalAlert("Yeni şifre en az 6 karakter olmalıdır.", "error");
            return;
        }

        if (oldPassword === password) {
            showModalAlert("Yeni şifre mevcut şifre ile aynı olamaz.", "error");
            return;
        }

        // Backend Payload
        const payload = {
            username: username,
            oldPassword: oldPassword,
            password: password
        };

        // Loading State & Prevent Double Submit
        const originalBtnText = submitButton ? submitButton.textContent : "Şifreyi Güncelle";
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "Güncelleniyor...";
        }

        try {
            const response = await fetch(PASSWORD_UPDATE_ENDPOINT, {
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

            if (result && result.success) {
                // Success Handling - use backend message
                const successMessage = result.message || "Şifreniz başarıyla güncellendi.";
                showModalAlert(successMessage, "success");

                // Close modal after short delay
                setTimeout(() => {
                    closeModal();

                    // Clear login password field
                    if (loginPasswordInput) {
                        loginPasswordInput.value = "";
                    }

                    // Show message on login form
                    const loginAlert = document.getElementById("formAlert");
                    if (loginAlert) {
                        loginAlert.textContent = "Şifreniz güncellendi. Lütfen yeni şifrenizle giriş yapın.";
                        loginAlert.className = "form-alert show success";
                    }
                }, 1500);
            } else {
                // Error Handling - use backend message
                let errorMsg = "Şifre güncelleme sırasında bir hata oluştu.";

                if (result && result.message) {
                    errorMsg = result.message;
                }

                showModalAlert(errorMsg, "error");
            }
        } catch (error) {
            // Network / Connection Error Handling
            showModalAlert("Sunucuya bağlanılamadı. Lütfen backend servisinin çalıştığından emin olunuz.", "error");
        } finally {
            // Restore Button State
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = originalBtnText;
            }
        }
    });
});
