// =========================================================
// FITNESS PRO - APPLICATION MODAL
// =========================================================
//
// Hesap blokesi kaldırma, yeniden açma, şifre sıfırlama
// talebi ve diğer başvurular için kullanılan modal.
//
// Mevcut sistemlerle etkileşim:
//   - window.Auth.getUser()     → oturum açmış kullanıcının
//                                 username'i otomatik doldurulur
//                                 (kullanıcı değiştirebilir)
//   - .form-alert / .show      → mevcut Fitness Pro alert
//                                 sistemi (success / error)
//   - .modal / .modal-content  → mevcut modal pattern'i
//                                 (PasswordUpdateModal ile aynı)
//
// Backend entegrasyonu:
//   Endpoint   : POST /api/application
//   Request    : { username, purpose, email, description }
//   Response   : ApiResponseModel
//                { success, message, data, rateLimited,
//                  remainingSeconds, accountLocked }
//
//   Endpoint henüz backend tarafında mevcut değildir. URL
//   burada tanımlıdır; backend hazır olduğunda otomatik
//   çalışır. Backend hata dönerse veya bağlantı kurulamazsa
//   mevcut alert sistemi üzerinden kullanıcı bilgilendirilir.
// =========================================================

(function () {
    "use strict";

    document.addEventListener("DOMContentLoaded", () => {

        // =========================================================
        // API CONFIG
        // =========================================================
        //
        // Mevcut Auth.getBaseUrl() mimarisine bağlı kalınır.
        // Yeni bir base URL sistemi kurulmaz.
        // =========================================================

        const API_BASE_URL =
            (window.Auth && window.Auth.getBaseUrl()) ||
            window.API_BASE_URL ||
            "http://localhost:8081";

        const APPLICATION_ENDPOINT =
            `${API_BASE_URL}/api/application`;

        // =========================================================
        // DOM REFS
        // =========================================================

        const modal = document.getElementById("applicationModal");
        const overlay = document.getElementById("applicationModalOverlay");
        const closeButton = document.getElementById("applicationModalClose");
        const cancelButton = document.getElementById("cancelApplication");

        // =========================================================
        // TRIGGER ELEMENTLERİ
        //
        // Başvuru modalını açabilecek birden fazla giriş
        // noktası olabilir. Hepsi bağımsız olarak dinlenir:
        //
        //   - #openApplicationModal   → footer / genel link
        //   - #loginRateLimitPermanentBtn → kalıcı kilit UI'ında
        //                                  "Hesap Açtırma Başvurusu"
        //                                  butonu
        //
        // LoginRateLimitUI.js kendi listener'ını butona zaten
        // ekliyor (preventDefault + console.warn). ApplicationModal
        // listener'ı ayrıca eklenir; iki listener paralel
        // çalışır. LoginRateLimitUI listener'ı { once: true }
        // olduğu için yalnızca ilk tıklamada console.warn
        // basılır, sonraki tıklamalarda sessizce çalışır.
        // =========================================================

        const TRIGGER_IDS = [
            "openApplicationModal",
            "loginRateLimitPermanentBtn"
        ];

        const triggerElements = TRIGGER_IDS
            .map((id) => document.getElementById(id))
            .filter((el) => el !== null);

        const form = document.getElementById("applicationForm");
        const usernameInput = document.getElementById("applicationUsername");
        const purposeInput = document.getElementById("applicationPurpose");
        const emailInput = document.getElementById("applicationEmail");
        const descriptionInput =
            document.getElementById("applicationDescription");
        const descriptionCount =
            document.getElementById("applicationDescriptionCount");
        const submitButton = document.getElementById("submitApplication");
        const modalAlert = document.getElementById("applicationModalAlert");

        // Modal yoksa bu sayfada başvuru modülü kullanılmıyor
        // (örn. sayfa Login.html değil). Sessizce çık.
        if (!modal || !form) {
            return;
        }

        // =========================================================
        // VALIDATION
        // =========================================================

        const MIN_USERNAME = 3;
        const MAX_USERNAME = 32;
        const MAX_EMAIL = 120;
        const MIN_DESCRIPTION = 10;
        const MAX_DESCRIPTION = 1000;

        // RFC 5322 simplified — proje seviyesinde yeterli.
        const EMAIL_REGEX =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        function validateUsername(value) {
            const v = (value || "").trim();
            if (!v) return "Kullanıcı adı boş bırakılamaz.";
            if (v.length < MIN_USERNAME) {
                return `Kullanıcı adı en az ${MIN_USERNAME} karakter olmalıdır.`;
            }
            if (v.length > MAX_USERNAME) {
                return `Kullanıcı adı en fazla ${MAX_USERNAME} karakter olabilir.`;
            }
            return null;
        }

        function validatePurpose(value) {
            if (!value) return "Lütfen bir başvuru amacı seçiniz.";
            return null;
        }

        function validateEmail(value) {
            const v = (value || "").trim();
            if (!v) return "İletişim maili boş bırakılamaz.";
            if (v.length > MAX_EMAIL) {
                return `İletişim maili en fazla ${MAX_EMAIL} karakter olabilir.`;
            }
            if (!EMAIL_REGEX.test(v)) {
                return "Lütfen geçerli bir e-posta adresi giriniz.";
            }
            return null;
        }

        function validateDescription(value) {
            const v = (value || "").trim();
            if (!v) return "Açıklama alanı boş bırakılamaz.";
            if (v.length < MIN_DESCRIPTION) {
                return `Açıklama en az ${MIN_DESCRIPTION} karakter olmalıdır.`;
            }
            if (v.length > MAX_DESCRIPTION) {
                return `Açıklama en fazla ${MAX_DESCRIPTION} karakter olabilir.`;
            }
            return null;
        }

        // =========================================================
        // ALERT (mevcut form-alert sistemi)
        // =========================================================

        function showModalAlert(message, type = "error") {
            if (!modalAlert) return;
            modalAlert.textContent = message;
            modalAlert.className = `form-alert show ${type}`;
        }

        function clearModalAlert() {
            if (!modalAlert) return;
            modalAlert.textContent = "";
            modalAlert.className = "form-alert";
        }

        // =========================================================
        // CHAR COUNTER
        // =========================================================

        const counter = descriptionCount
            ? descriptionCount.parentElement
            : null;

        function updateCharCounter() {
            if (!descriptionInput || !descriptionCount) return;

            const len = descriptionInput.value.length;
            descriptionCount.textContent = String(len);

            if (!counter) return;

            counter.classList.remove("is-warning", "is-danger");

            // %90 → uyarı, %100 → tehlike
            if (len >= MAX_DESCRIPTION) {
                counter.classList.add("is-danger");
            } else if (len >= Math.floor(MAX_DESCRIPTION * 0.9)) {
                counter.classList.add("is-warning");
            }
        }

        if (descriptionInput) {
            descriptionInput.addEventListener("input", updateCharCounter);
            updateCharCounter();
        }

        // Select için: kullanıcı bir şey seçtiğinde
        // placeholder class'ını kaldır (CSS'te renk değişimi için).
        if (purposeInput) {
            purposeInput.addEventListener("change", () => {
                if (purposeInput.value) {
                    purposeInput.classList.remove("has-placeholder");
                } else {
                    purposeInput.classList.add("has-placeholder");
                }
            });
            // İlk yüklemede: boş ise has-placeholder ekle
            if (!purposeInput.value) {
                purposeInput.classList.add("has-placeholder");
            }
        }

        // =========================================================
        // MODAL AÇ / KAPA
        // =========================================================

        let lastFocusedElement = null;

        function openModal() {
            if (!modal) return;

            // Tetikleyici elementi hatırla (erişilebilirlik için)
            lastFocusedElement = document.activeElement;

            // Username otomatik doldur (oturum açmış kullanıcı varsa)
            if (usernameInput && !usernameInput.value) {
                try {
                    const user =
                        window.Auth && window.Auth.getUser
                            ? window.Auth.getUser()
                            : null;
                    if (user && user.username) {
                        usernameInput.value = String(user.username);
                    }
                } catch (err) {
                    // Auth yardımcısı yoksa sessizce geç
                }
            }

            modal.classList.add("show");
            modal.setAttribute("aria-hidden", "false");
            document.body.style.overflow = "hidden";

            // İlk input'a focus
            setTimeout(() => {
                if (usernameInput) {
                    usernameInput.focus();
                    if (usernameInput.value) {
                        usernameInput.select();
                    }
                }
            }, 100);

            clearModalAlert();
        }

        function closeModal() {
            if (!modal) return;

            modal.classList.remove("show");
            modal.setAttribute("aria-hidden", "true");
            document.body.style.overflow = "";

            // Form temizle
            try {
                form.reset();
            } catch (err) {
                // reset() desteklenmiyorsa input'ları manuel temizle
                if (usernameInput) usernameInput.value = "";
                if (purposeInput) {
                    purposeInput.value = "";
                    purposeInput.classList.add("has-placeholder");
                }
                if (emailInput) emailInput.value = "";
                if (descriptionInput) descriptionInput.value = "";
            }

            clearModalAlert();
            updateCharCounter();

            // Tetikleyici elemente focus geri ver
            if (
                lastFocusedElement &&
                typeof lastFocusedElement.focus === "function"
            ) {
                lastFocusedElement.focus();
            }
        }

        // =========================================================
        // TETİKLEYİCİLER
        // =========================================================
        //
        // Tüm olası trigger elementlerine (footer linki,
        // kalıcı kilit butonu, vs.) listener bağlanır.
        // Aynı elemente başka listener'lar (örn.
        // LoginRateLimitUI.js) daha önce bağlanmış olabilir;
        // bunlar bağımsız çalışır.
        // =========================================================

        triggerElements.forEach((trigger) => {
            trigger.addEventListener("click", (event) => {
                event.preventDefault();
                openModal();
            });
        });

        if (closeButton) {
            closeButton.addEventListener("click", closeModal);
        }

        if (cancelButton) {
            cancelButton.addEventListener("click", closeModal);
        }

        if (overlay) {
            overlay.addEventListener("click", closeModal);
        }

        // Escape tuşu
        document.addEventListener("keydown", (event) => {
            if (
                event.key === "Escape" &&
                modal.classList.contains("show")
            ) {
                closeModal();
            }
        });

        // =========================================================
        // SUBMIT HANDLER
        // =========================================================

        // Çift submit'i önlemek için inFlight flag'i.
        // submitButton.disabled da kullanılıyor; flag bunu
        // tamamlar (çok hızlı çift tıklama kenar durumu).
        let inFlight = false;

        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            if (inFlight) {
                return;
            }

            clearModalAlert();

            // Trim'li değerleri oku
            const username = usernameInput
                ? usernameInput.value.trim()
                : "";
            const purpose = purposeInput ? purposeInput.value : "";
            const email = emailInput ? emailInput.value.trim() : "";
            const description = descriptionInput
                ? descriptionInput.value.trim()
                : "";

            // Client-side validation
            const errUsername = validateUsername(username);
            if (errUsername) {
                showModalAlert(errUsername, "error");
                if (usernameInput) usernameInput.focus();
                return;
            }

            const errPurpose = validatePurpose(purpose);
            if (errPurpose) {
                showModalAlert(errPurpose, "error");
                if (purposeInput) purposeInput.focus();
                return;
            }

            const errEmail = validateEmail(email);
            if (errEmail) {
                showModalAlert(errEmail, "error");
                if (emailInput) emailInput.focus();
                return;
            }

            const errDescription = validateDescription(description);
            if (errDescription) {
                showModalAlert(errDescription, "error");
                if (descriptionInput) descriptionInput.focus();
                return;
            }

            // Payload
            const payload = {
                username: username,
                purpose: purpose,
                email: email,
                description: description
            };

            // Loading state
            inFlight = true;
            const originalBtnText =
                submitButton && submitButton.textContent
                    ? submitButton.textContent
                    : "Başvuruyu Gönder";

            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = "Gönderiliyor...";
            }

            // Form alanlarını da disable et (kullanıcı değiştiremesin)
            const fields = [
                usernameInput,
                purposeInput,
                emailInput,
                descriptionInput
            ];
            fields.forEach((f) => {
                if (f) f.disabled = true;
            });

            try {
                const response = await fetch(APPLICATION_ENDPOINT, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    body: JSON.stringify(payload)
                });

                let result = null;
                try {
                    result = await response.json();
                } catch (parseErr) {
                    result = null;
                }

                // ApiResponseModel standart yapısı
                const isSuccess =
                    response.ok &&
                    result &&
                    result.success === true;

                if (isSuccess) {
                    // Backend'in gönderdiği mesaj ÖNCELİKLİ.
                    // Frontend kendi mesajını üretmez.
                    const backendMessage =
                        (result.message &&
                            typeof result.message === "string" &&
                            result.message.trim()) ||
                        "Başvurunuz başarıyla alındı.";

                    showModalAlert(backendMessage, "success");

                    // Kısa gecikme sonra modalı kapat.
                    // Kullanıcı success mesajını görebilsin.
                    setTimeout(() => {
                        closeModal();
                    }, 1500);

                    return;
                }

                // Hata — mevcut alert sistemi üzerinden mesaj göster.
                // Backend'in gönderdiği message ÖNCELİKLİ.
                const backendErrorMessage =
                    (result &&
                        result.message &&
                        typeof result.message === "string" &&
                        result.message.trim()) ||
                    "Başvuru gönderilirken bir hata oluştu.";

                showModalAlert(backendErrorMessage, "error");

            } catch (networkError) {
                // Network hatası — endpoint hazır olmayabilir
                // veya backend kapalı. Kullanıcıya net mesaj.
                console.error(
                    "[APPLICATION] Network error:",
                    networkError
                );

                showModalAlert(
                    "Sunucuya bağlanılamadı. Lütfen backend servisinin çalıştığından emin olunuz.",
                    "error"
                );
            } finally {
                // Form alanlarını tekrar enable et
                fields.forEach((f) => {
                    if (f) f.disabled = false;
                });

                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = originalBtnText;
                }

                inFlight = false;
            }
        });

    });

})();
