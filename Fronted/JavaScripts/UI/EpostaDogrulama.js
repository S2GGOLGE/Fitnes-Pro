/**
 * =========================================================
 * FITNESS PRO - E-POSTA DOĞRULAMA SAYFASI JS
 * Tasarım ve Kapsam: Raporlar/Tasarım/Kayıt Ol Sonrası/Açıklama.txt & 2.png
 * =========================================================
 */

(function () {
    "use strict";

    // Configuration
    const TOTAL_SECONDS = 5 * 60; // 5 dakika (05:00)
    let remainingSeconds = TOTAL_SECONDS;
    let timerInterval = null;

    const ONBOARDING_TOKEN_KEY = "fitnesspro_onboarding_token";

    // State
    const state = {
        email: "",
        username: "",
        isVerified: false,
        isConfirming: false,
        isLoggingIn: false,
        initialCodeSent: false
    };

    // DOM Elements
    const elements = {
        codeInput: document.getElementById("verificationCodeInput"),
        btnConfirm: document.getElementById("btnConfirm"),
        timerDigits: document.getElementById("timerDigits"),
        btnResend: document.getElementById("btnResend"),
        alertBox: document.getElementById("verificationAlert"),
        emailDisplay: document.getElementById("userEmailDisplay")
    };

    /**
     * Kullanıcı Verilerini Oku
     */
    function initUserData() {
        // 1. Session Storage'dan oku
        try {
            const stored = sessionStorage.getItem("fitnesspro_register_user") || sessionStorage.getItem("registeredUser");
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.email) state.email = parsed.email;
                if (parsed.username) state.username = parsed.username;
            }
        } catch (e) {
            console.warn("Storage okunamadı:", e);
        }

        // 2. Query Parametreleri kontrolü (?email=...)
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("email")) {
            state.email = urlParams.get("email");
        }

        // E-posta gösterimini güncelle
        if (elements.emailDisplay) {
            elements.emailDisplay.textContent = state.email || "kullanıcı e-posta adresinize";
        }
    }

    /**
     * Zamanlayıcıyı Biçimlendir (MM:SS)
     */
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }

    /**
     * Geri Sayımı Başlat (05:00 -> 00:00)
     * Kural:
     * - E-posta gönderimi başarılı olduğunda 5 dakikalık geri sayım arayüzü gösterilecektir.
     * - Sayaç 05:00 değerinden 00:00 değerine inecektir.
     * - Tekrar Gönder butonu başlangıçta gizli olacaktır.
     * - Beş dakikalık süre dolduğunda buton görünür hâle gelecektir.
     */
    function startCountdown() {
        clearInterval(timerInterval);
        remainingSeconds = TOTAL_SECONDS;

        // Tekrar Gönder butonu başlangıçta gizli
        if (elements.btnResend) {
            elements.btnResend.classList.add("hidden");
        }

        updateTimerDisplay();

        timerInterval = setInterval(() => {
            remainingSeconds--;

            if (remainingSeconds <= 0) {
                remainingSeconds = 0;
                clearInterval(timerInterval);
                updateTimerDisplay();
                handleTimerExpired();
            } else {
                updateTimerDisplay();
            }
        }, 1000);
    }

    /**
     * Sayaç Arayüzünü Güncelle
     */
    function updateTimerDisplay() {
        if (elements.timerDigits) {
            elements.timerDigits.textContent = formatTime(remainingSeconds);
        }
    }

    /**
     * 5 Dakikalık Süre Dolduğunda
     * Kural: Beş dakikalık süre dolduğunda buton görünür hâle gelecektir.
     */
    function handleTimerExpired() {
        if (elements.btnResend) {
            elements.btnResend.classList.remove("hidden");
        }
        showAlert("Doğrulama kodunun süresi doldu. Yeni bir kod göndermek için 'Tekrar Gönder' butonuna basabilirsiniz.", "info", 6000);
    }

    /**
     * Tekrar Gönder Butonu İşlevi
     * Kural:
     * - Butona basıldığında frontend, mevcut sistemdeki e-posta gönderme işleviyle uyumlu şekilde yeni gönderim talebi oluşturacaktır.
     * - Yeniden gönderim başarılı olduğunda sayaç tekrar 5 dakikadan başlayacaktır.
     */
    async function handleResendCode() {
        if (elements.btnResend) {
            elements.btnResend.disabled = true;
            elements.btnResend.textContent = "Gönderiliyor...";
        }

        try {
            // Backend TwoFactorController /api/two-factor/send-code çağrısı
            if (!window.TwoFactorEndpoint || typeof window.TwoFactorEndpoint.sendCode !== "function") {
                showAlert("Doğrulama servisi yüklenemedi. Sayfayı yenileyip tekrar deneyiniz.", "error", 5000);
                return;
            }

            try {
                const sendResult = await window.TwoFactorEndpoint.sendCode();
                showAlert((sendResult && sendResult.message) || "Yeni doğrulama kodu başarıyla e-posta adresinize gönderildi!", "success", 4000);
            } catch (apiErr) {
                console.warn("[Backend 2FA SendCode API]:", apiErr.message);
                showAlert(`Kod gönderilemedi: ${apiErr.message}`, "error", 5000);
                return;
            }

            // Yeniden gönderim başarılı -> Sayaç tekrar 5 dakikadan başlar, buton gizlenir
            startCountdown();
        } catch (err) {
            showAlert("Kod gönderilirken bir hata oluştu. Lütfen tekrar deneyiniz.", "error");
        } finally {
            if (elements.btnResend) {
                elements.btnResend.disabled = false;
                elements.btnResend.textContent = "Tekrar Gönder";
            }
        }
    }

    /**
     * Bildirim Göster
     */
    function showAlert(message, type = "error", duration = 4000) {
        if (!elements.alertBox) return;
        elements.alertBox.textContent = message;
        elements.alertBox.className = `verification-alert show ${type}`;

        if (duration > 0) {
            setTimeout(() => {
                if (elements.alertBox && elements.alertBox.textContent === message) {
                    elements.alertBox.className = "verification-alert";
                    elements.alertBox.textContent = "";
                }
            }, duration);
        }
    }

    /**
     * Doğrulama Kodu Onaylama
     * Kural: Otomatik giriş YALNIZCA backend doğrulamayı başarılı bildirdikten sonra başlar.
     */
    async function handleConfirm() {
        if (state.isConfirming || state.isVerified) return;

        const code = elements.codeInput ? elements.codeInput.value.trim() : "";

        if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
            showAlert("Lütfen 6 haneli doğrulama kodunu eksiksiz giriniz.", "error");
            if (elements.codeInput) elements.codeInput.focus();
            return;
        }

        if (!window.TwoFactorEndpoint || typeof window.TwoFactorEndpoint.verify !== "function") {
            showAlert("Doğrulama servisi yüklenemedi. Sayfayı yenileyip tekrar deneyiniz.", "error", 6000);
            return;
        }

        state.isConfirming = true;
        if (elements.btnConfirm) {
            elements.btnConfirm.disabled = true;
            elements.btnConfirm.textContent = "Doğrulanıyor...";
        }

        let verifyResult = null;
        try {
            verifyResult = await window.TwoFactorEndpoint.verify(code);
        } catch (verifyErr) {
            // Hatalı/süresi dolmuş kod, yetki hatası veya bağlantı hatası: otomatik giriş YAPILMAZ.
            console.warn("[Backend Verify API]:", verifyErr.message);
            showAlert(verifyErr.message, "error", 5000);
            resetConfirmButton();
            return;
        }

        if (!verifyResult || verifyResult.verified !== true) {
            showAlert("Doğrulama backend tarafından onaylanmadı. Lütfen tekrar deneyiniz.", "error", 5000);
            resetConfirmButton();
            return;
        }

        state.isVerified = true;
        showAlert("E-posta adresiniz başarıyla doğrulandı! Giriş yapılıyor...", "success", 0);
        await performAutoLogin();
    }

    function resetConfirmButton() {
        state.isConfirming = false;
        if (elements.btnConfirm) {
            elements.btnConfirm.disabled = false;
            elements.btnConfirm.textContent = "Onayla";
        }
    }

    /**
     * Onboarding token'ını (yoksa normal oturum token'ını) döndürür.
     */
    function getOnboardingToken() {
        try {
            return sessionStorage.getItem(ONBOARDING_TOKEN_KEY);
        } catch (e) {
            return null;
        }
    }

    function getApiBaseUrl() {
        return (window.Auth && typeof window.Auth.getBaseUrl === "function")
            ? window.Auth.getBaseUrl()
            : (window.API_BASE_URL || "http://localhost:8081");
    }

    function clearOnboardingStorage() {
        try {
            sessionStorage.removeItem(ONBOARDING_TOKEN_KEY);
            sessionStorage.removeItem("fitnesspro_register_user");
            sessionStorage.removeItem("fitnesspro_location");
            sessionStorage.removeItem("fitnesspro_email_verified");
        } catch (e) {
            // Sessizce geç
        }
    }

    /**
     * Backend'den onboarding durumunu getirir (GET /api/locations/status).
     */
    async function fetchOnboardingStatus() {
        const token = getOnboardingToken() || (window.Auth && window.Auth.getToken ? window.Auth.getToken() : null);
        if (!token) {
            throw new Error("AUTH:Oturum bilgisi bulunamadı.");
        }

        let response;
        try {
            response = await fetch(`${getApiBaseUrl()}/api/locations/status`, {
                method: "GET",
                headers: { Accept: "application/json", Authorization: `Bearer ${token}` }
            });
        } catch (e) {
            throw new Error("Sunucuya bağlanılamadı.");
        }

        if (response.status === 401) {
            throw new Error("AUTH:Oturum süresi dolmuş veya kimlik doğrulanamadı.");
        }

        let result = null;
        try { result = await response.json(); } catch (e) { result = null; }

        if (!response.ok || !result || result.success !== true || !result.data) {
            throw new Error((result && result.message) || `Durum alınamadı (HTTP ${response.status}).`);
        }
        return result.data;
    }

    /**
     * Otomatik giriş: backend'de konum + e-posta doğrulaması tamamlandıysa
     * POST /api/login/complete-onboarding normal JWT üretir (parola saklanmaz / gerekmez).
     */
    async function performAutoLogin() {
        if (state.isLoggingIn) return;
        state.isLoggingIn = true;

        if (elements.btnConfirm) {
            elements.btnConfirm.disabled = true;
            elements.btnConfirm.textContent = "Giriş yapılıyor...";
        }

        let failureMessage = "";
        try {
            const onboardingToken = getOnboardingToken();
            if (!onboardingToken) {
                throw new Error("Oturum bilgisi bulunamadı.");
            }

            let response;
            try {
                response = await fetch(`${getApiBaseUrl()}/api/login/complete-onboarding`, {
                    method: "POST",
                    headers: { Accept: "application/json", Authorization: `Bearer ${onboardingToken}` }
                });
            } catch (netErr) {
                throw new Error("Giriş servisine bağlanılamadı.");
            }

            let result = null;
            try { result = await response.json(); } catch (e) { result = null; }

            const data = result && result.data;
            if (!response.ok || !result || result.success !== true || !data || typeof data.token !== "string" || !data.token) {
                throw new Error((result && result.message) || "Otomatik giriş başarısız oldu: oturum anahtarı üretilemedi.");
            }

            // /api/login yanıt yapısı: { token, userId, username, email, role, level, roles, emailVerified }
            const userData = {
                userId: data.userId,
                username: data.username || state.username,
                email: data.email || state.email,
                role: data.role || "User",
                level: data.level || null,
                roles: Array.isArray(data.roles) ? data.roles : [data.role || "User"],
                emailVerified: true
            };

            if (window.Auth && typeof window.Auth.saveSession === "function") {
                window.Auth.saveSession(data.token, userData);
            } else {
                localStorage.setItem("fitness_pro_token", data.token);
                localStorage.setItem("fitness_pro_user", JSON.stringify(userData));
            }

            // Oturumun gerçekten kaydedildiğini doğrula
            const saved = (window.Auth && typeof window.Auth.getToken === "function")
                ? window.Auth.getToken()
                : localStorage.getItem("fitness_pro_token");
            if (!saved) {
                throw new Error("Oturum kaydedilemedi.");
            }

            clearOnboardingStorage();
            showAlert("Giriş başarılı! Ana sayfaya yönlendiriliyorsunuz...", "success", 0);
            setTimeout(() => {
                window.location.href = "index.html";
            }, 800);
            return;
        } catch (err) {
            failureMessage = err.message || "Otomatik giriş başarısız oldu.";
        }

        // Otomatik giriş başarısız: hatayı açıkça göster, kullanıcıyı giriş ekranına yönlendir.
        // (E-posta doğrulaması backend'de tamamlandığı için normal girişle devam edebilir.)
        console.warn("[Auto Login]:", failureMessage);
        showAlert(`E-posta doğrulandı ancak otomatik giriş yapılamadı: ${failureMessage} Giriş ekranına yönlendiriliyorsunuz...`, "error", 0);
        clearOnboardingStorage();
        setTimeout(() => {
            window.location.href = "Login.html";
        }, 4000);
    }

    /**
     * Sayfa açılışı: backend durumuna göre adım kontrolü.
     * - Oturum/token yoksa Login'e
     * - Konum kaydı yoksa KonumBelirleme'ye
     * - E-posta zaten doğrulanmışsa doğrudan otomatik giriş
     * - Aksi halde doğrulama kodunu gönder ve sayacı başlat
     */
    async function initOnboardingState() {
        let status;
        try {
            status = await fetchOnboardingStatus();
        } catch (err) {
            if (err.message.startsWith("AUTH:")) {
                showAlert(`${err.message.slice(5)} Giriş ekranına yönlendiriliyorsunuz...`, "error", 0);
                setTimeout(() => { window.location.href = "Login.html"; }, 3000);
                return;
            }
            // Geçici hata: sayfa kullanılabilir kalsın, doğrulama backend'de yapılacak.
            showAlert(err.message, "warning", 5000);
            startCountdown();
            return;
        }

        if (status.locationSet !== true) {
            showAlert("Önce konum belirlemeniz gerekiyor. Yönlendiriliyorsunuz...", "warning", 0);
            setTimeout(() => { window.location.href = "KonumBelirleme.html"; }, 1500);
            return;
        }

        if (status.emailVerified === true) {
            state.isVerified = true;
            showAlert("E-posta adresiniz zaten doğrulanmış. Giriş yapılıyor...", "success", 0);
            await performAutoLogin();
            return;
        }

        startCountdown();
        await sendInitialCode();
    }

    /**
     * Sayfa açıldığında doğrulama kodunu bir kez gönder.
     */
    async function sendInitialCode() {
        if (state.initialCodeSent) return;
        state.initialCodeSent = true;
        try {
            const sendResult = await window.TwoFactorEndpoint.sendCode();
            showAlert((sendResult && sendResult.message) || "Doğrulama kodu e-posta adresinize gönderildi.", "success", 4000);
        } catch (err) {
            console.warn("[Backend 2FA SendCode API]:", err.message);
            showAlert(`Doğrulama kodu gönderilemedi: ${err.message} 'Tekrar Gönder' ile yeniden deneyebilirsiniz.`, "error", 6000);
            if (elements.btnResend) {
                elements.btnResend.classList.remove("hidden");
            }
        }
    }

    /**
     * Event Listeners & Initialize
     */
    document.addEventListener("DOMContentLoaded", () => {
        initUserData();
        initOnboardingState();

        // Sadece rakam girişine izin ver
        if (elements.codeInput) {
            elements.codeInput.focus();
            elements.codeInput.addEventListener("input", (e) => {
                e.target.value = e.target.value.replace(/\D/g, "").slice(0, 6);
                if (e.target.value.length === 6) {
                    // Otomatik buton odağı
                    if (elements.btnConfirm) elements.btnConfirm.focus();
                }
            });

            // Enter tuşu ile onayla
            elements.codeInput.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    handleConfirm();
                }
            });
        }

        if (elements.btnConfirm) {
            elements.btnConfirm.addEventListener("click", handleConfirm);
        }

        if (elements.btnResend) {
            elements.btnResend.addEventListener("click", handleResendCode);
        }

        // Test Kolaylığı: Sayaç üzerine çift tıklandığında süreyi sıfıra indirerek Tekrar Gönder butonunu test edebilme
        if (elements.timerDigits) {
            elements.timerDigits.style.cursor = "pointer";
            elements.timerDigits.title = "Test: Süreyi bitirip 'Tekrar Gönder' butonunu görmek için çift tıklayın";
            elements.timerDigits.addEventListener("dblclick", () => {
                remainingSeconds = 0;
                clearInterval(timerInterval);
                updateTimerDisplay();
                handleTimerExpired();
            });
        }
    });

})();
