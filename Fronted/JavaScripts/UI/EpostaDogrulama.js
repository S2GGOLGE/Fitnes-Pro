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

    // State
    const state = {
        email: "",
        username: "",
        isVerified: false
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
            // Frontend simülasyonu (Açıklama.txt kurallarına uygun olarak backend çağrısı yok / mock)
            await new Promise((resolve) => setTimeout(resolve, 800));

            showAlert("Yeni doğrulama kodu başarıyla e-posta adresinize gönderildi!", "success", 4000);
            
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
     * Kural: Doğrulama başarılı olduğunda kullanıcı Login ekranına yönlendirilecektir.
     */
    async function handleConfirm() {
        const code = elements.codeInput ? elements.codeInput.value.trim() : "";

        if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
            showAlert("Lütfen 6 haneli doğrulama kodunu eksiksiz giriniz.", "error");
            if (elements.codeInput) elements.codeInput.focus();
            return;
        }

        if (elements.btnConfirm) {
            elements.btnConfirm.disabled = true;
            elements.btnConfirm.textContent = "Doğrulanıyor...";
        }

        // Simülasyon gecikmesi
        setTimeout(() => {
            state.isVerified = true;
            showAlert("E-posta adresiniz başarıyla doğrulandı! Giriş ekranına yönlendiriliyorsunuz...", "success", 3000);

            // Auth ve session durumu güncelle
            try {
                sessionStorage.setItem("fitnesspro_email_verified", "true");
                const stored = sessionStorage.getItem("fitnesspro_register_user");
                if (stored) {
                    const parsed = JSON.parse(stored);
                    parsed.emailVerified = true;
                    sessionStorage.setItem("fitnesspro_register_user", JSON.stringify(parsed));
                }
            } catch (e) {
                // Sessizce geç
            }

            // Kural: Doğrulama başarılı olduğunda kullanıcı Login ekranına yönlendirilecektir.
            setTimeout(() => {
                window.location.href = "Login.html";
            }, 1200);
        }, 800);
    }

    /**
     * Event Listeners & Initialize
     */
    document.addEventListener("DOMContentLoaded", () => {
        initUserData();
        startCountdown();

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
