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
    const forgotPasswordLink = document.getElementById("forgotPasswordLink");

    if (!loginForm) {
        return;
    }

    // =========================================================
    // RATE LIMIT (Backend 429 yönetimi - frontend UI only)
    // =========================================================
    //
    // Backend rate limit güvenliğinin yerine geçmez.
    // Sadece backend'in 429 döndüğü durumda UI feedback sağlar.
    //

    const RATE_LIMIT_STORAGE_KEY = "fitnesspro_login_rate_limit_until";
    const RATE_LIMIT_DEFAULT_DURATION = 300; // saniye (5 dakika)
    const RATE_LIMIT_FALLBACK_MESSAGE = "Çok fazla başarısız giriş denemesi. Lütfen 5 dakika sonra tekrar deneyiniz.";

    let rateLimitIntervalId = null;

    // localStorage'dan bitiş timestamp'ini (ms) al
    function getRateLimitUntil() {
        const raw = localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
        if (!raw) return 0;
        const value = parseInt(raw, 10);
        return Number.isFinite(value) && value > 0 ? value : 0;
    }

    // Kalan süreyi saniye cinsinden hesapla
    function getRateLimitRemainingSeconds() {
        const until = getRateLimitUntil();
        if (!until) return 0;
        const remainingMs = until - Date.now();
        return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
    }

    // Rate-limit aktif mi?
    function isLoginRateLimitActive() {
        return getRateLimitRemainingSeconds() > 0;
    }

    // Saniyeyi MM:SS formatına çevir
    function formatRateLimitTimer(totalSeconds) {
        const safe = Math.max(0, Math.floor(totalSeconds));
        const minutes = Math.floor(safe / 60);
        const seconds = safe % 60;
        return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    // Rate-limit UI elemanlarını al
    function getRateLimitElements() {
        return {
            container: document.getElementById("loginRateLimit"),
            timer: document.getElementById("loginRateLimitTimer")
        };
    }

    // Login formunun alanlarını kilitle / aç
    function setLoginFormDisabled(disabled) {
        const targets = [
            usernameInput,
            passwordInput,
            forgotPasswordLink
        ];

        targets.forEach((el) => {
            if (!el) return;
            if (disabled) {
                el.setAttribute("disabled", "true");
                el.setAttribute("aria-disabled", "true");
            } else {
                el.removeAttribute("disabled");
                el.removeAttribute("aria-disabled");
            }
        });

        // Şifre göster / gizle toggle'ları da kilitlenir
        const toggleButtons = loginForm.querySelectorAll(".password-toggle");
        toggleButtons.forEach((btn) => {
            if (disabled) {
                btn.setAttribute("disabled", "true");
                btn.setAttribute("aria-disabled", "true");
            } else {
                btn.removeAttribute("disabled");
                btn.removeAttribute("aria-disabled");
            }
        });

        if (submitButton) {
            submitButton.disabled = !!disabled;
        }

        // Rate-limit aktifken form'a özel görsel state class'ı
        if (loginForm) {
            loginForm.classList.toggle("rate-limited", !!disabled);
        }
    }

    // Response'tan rate-limit süresini belirle
    // Öncelik: Retry-After header > response body > varsayılan 300
    function getRateLimitDuration(response, result) {
        // 1) Retry-After header
        if (response && response.headers && typeof response.headers.get === "function") {
            const retryAfter = response.headers.get("Retry-After");
            if (retryAfter) {
                const parsed = parseInt(retryAfter, 10);
                if (Number.isFinite(parsed) && parsed > 0) {
                    return parsed;
                }
                // HTTP-date formatı da olabilir
                const dateMs = Date.parse(retryAfter);
                if (Number.isFinite(dateMs)) {
                    const diff = Math.ceil((dateMs - Date.now()) / 1000);
                    if (diff > 0) return diff;
                }
            }
        }

        // 2) Backend response body içindeki süre bilgisi
        if (result && typeof result === "object") {
            const candidates = [
                result.retryAfter,
                result.retryAfterSeconds,
                result.retry_after,
                result.data && result.data.retryAfter,
                result.data && result.data.retryAfterSeconds,
                result.data && result.data.retry_after
            ];
            for (const candidate of candidates) {
                if (candidate === undefined || candidate === null) continue;
                const num = Number(candidate);
                if (Number.isFinite(num) && num > 0) return num;
            }
        }

        // 3) Varsayılan
        return RATE_LIMIT_DEFAULT_DURATION;
    }

    // Rate-limit geri sayımını başlat
    function startLoginRateLimit(durationSeconds) {
        const safeDuration = Math.max(1, Math.floor(durationSeconds || RATE_LIMIT_DEFAULT_DURATION));
        const until = Date.now() + safeDuration * 1000;
        localStorage.setItem(RATE_LIMIT_STORAGE_KEY, String(until));

        const { container, timer } = getRateLimitElements();
        if (container) {
            container.hidden = false;
        }

        // Form kilitlenir
        setLoginFormDisabled(true);

        // İlk frame'i hemen yaz
        updateLoginRateLimit();

        if (rateLimitIntervalId) {
            clearInterval(rateLimitIntervalId);
        }

        rateLimitIntervalId = setInterval(() => {
            updateLoginRateLimit();
        }, 1000);
    }

    // Her saniye çalışır, kalan süreyi yazar, 0 olunca durdurur
    function updateLoginRateLimit() {
        const { timer } = getRateLimitElements();
        const remaining = getRateLimitRemainingSeconds();

        if (timer) {
            timer.textContent = formatRateLimitTimer(remaining);
        }

        if (remaining <= 0) {
            stopLoginRateLimit();
        }
    }

    // Rate-limit'i temizler, UI gizler, formu açar
    function stopLoginRateLimit() {
        if (rateLimitIntervalId) {
            clearInterval(rateLimitIntervalId);
            rateLimitIntervalId = null;
        }
        localStorage.removeItem(RATE_LIMIT_STORAGE_KEY);

        const { container, timer } = getRateLimitElements();
        if (container) {
            container.hidden = true;
        }
        if (timer) {
            timer.textContent = formatRateLimitTimer(RATE_LIMIT_DEFAULT_DURATION);
        }

        setLoginFormDisabled(false);
        clearAlert();
    }

    // Sayfa yüklendiğinde localStorage'dan rate-limit durumunu geri yükle
    function restoreLoginRateLimit() {
        const until = getRateLimitUntil();
        if (!until) return;

        const remaining = getRateLimitRemainingSeconds();
        if (remaining <= 0) {
            stopLoginRateLimit();
            return;
        }

        const { container, timer } = getRateLimitElements();
        if (container) container.hidden = false;
        if (timer) timer.textContent = formatRateLimitTimer(remaining);

        setLoginFormDisabled(true);

        if (rateLimitIntervalId) {
            clearInterval(rateLimitIntervalId);
        }

        rateLimitIntervalId = setInterval(() => {
            updateLoginRateLimit();
        }, 1000);
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

        // Rate-limit aktifken submit'i engelle
        if (isLoginRateLimitActive()) {
            return;
        }

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

            // 429 Too Many Requests — Rate limit aktif
            if (response.status === 429) {
                const duration = getRateLimitDuration(response, result);
                startLoginRateLimit(duration);

                const backendMessage = result && typeof result.message === "string" && result.message.trim()
                    ? result.message
                    : RATE_LIMIT_FALLBACK_MESSAGE;

                showAlert(backendMessage, "error");
                return;
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

                // Başarılı login sonrası rate-limit kaydı temizlenir
                if (getRateLimitUntil() > 0) {
                    localStorage.removeItem(RATE_LIMIT_STORAGE_KEY);
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
            // Restore Button State — rate-limit aktifken buton kilitli kalır
            if (submitButton) {
                if (isLoginRateLimitActive()) {
                    submitButton.textContent = originalBtnText;
                } else {
                    submitButton.disabled = false;
                    submitButton.textContent = originalBtnText;
                }
            }
        }
    });

    // Sayfa açıldığında aktif rate-limit varsa geri yükle
    restoreLoginRateLimit();
});