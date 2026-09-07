// =========================================================
// FITNESS PRO - BAN APPEAL (BAŞVURU) MODAL
// =========================================================
//
// Kalıcı olarak banlanmış kullanıcının ban kaldırma talebi
// göndermesi için kullanılan modal. Tek başvuru türü:
// "kalıcı engelin kaldırılması" — Hesap blokesi kaldırma
// / yeniden açma / şifre sıfırlama gibi diğer başvuru
// türleri bu akışa dahil değildir.
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
//   Endpoint   : POST /api/auth/ban-appeal
//   Request    : { username, message }
//   Response   : ApiResponseModel
//                { success, message, data, rateLimited,
//                  remainingSeconds, accountLocked }
//
//   Kurallar (backend tarafında zorlanır):
//   - Sadece DB'de banlı kullanıcılar gönderebilir.
//   - Aynı anda en fazla 1 Pending appeal olabilir.
//   - Toplam max 2 appeal (onay/ret fark etmez).
// =========================================================

(function () {
    "use strict";

    document.addEventListener("DOMContentLoaded", () => {

        // =========================================================
        // API CONFIG
        // =========================================================

        const API_BASE_URL =
            (window.Auth && window.Auth.getBaseUrl()) ||
            window.API_BASE_URL ||
            "http://localhost:8081";

        const BAN_APPEAL_ENDPOINT =
            `${API_BASE_URL}/api/auth/ban-appeal`;

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
        const messageInput = document.getElementById("applicationDescription");
        const messageCount = document.getElementById("applicationDescriptionCount");
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
        const MIN_MESSAGE = 10;
        const MAX_MESSAGE = 1000;

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

        function validateMessage(value) {
            const v = (value || "").trim();
            if (!v) return "Mesaj alanı boş bırakılamaz.";
            if (v.length < MIN_MESSAGE) {
                return `Mesaj en az ${MIN_MESSAGE} karakter olmalıdır.`;
            }
            if (v.length > MAX_MESSAGE) {
                return `Mesaj en fazla ${MAX_MESSAGE} karakter olabilir.`;
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

        const counter = messageCount
            ? messageCount.parentElement
            : null;

        function updateCharCounter() {
            if (!messageInput || !messageCount) return;

            const len = messageInput.value.length;
            messageCount.textContent = String(len);

            if (!counter) return;

            counter.classList.remove("is-warning", "is-danger");

            // %90 → uyarı, %100 → tehlike
            if (len >= MAX_MESSAGE) {
                counter.classList.add("is-danger");
            } else if (len >= Math.floor(MAX_MESSAGE * 0.9)) {
                counter.classList.add("is-warning");
            }
        }

        if (messageInput) {
            messageInput.addEventListener("input", updateCharCounter);
            updateCharCounter();
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

            clearModalAlert();

            // Merkezi altyapı yüklüyse form node'unu tek global container
            // içinde göster. Form/event/API davranışı değişmez; yalnızca
            // presentation ve accessibility GlobalModal tarafından yönetilir.
            if (window.GlobalModal) {
                window.GlobalModal.open({
                    type: "form",
                    title: "Hesap Açtırma Başvurusu",
                    description: "Başvurunuz ekibimiz tarafından değerlendirilecektir. Lütfen bilgilerinizi eksiksiz doldurun.",
                    content: form,
                    initialFocus: "#applicationUsername",
                    onClose: resetModalState
                });

                setTimeout(() => {
                    if (usernameInput && usernameInput.value) usernameInput.select();
                }, 100);
                return;
            }

            modal.classList.add("show");
            modal.setAttribute("aria-hidden", "false");
            document.body.style.overflow = "hidden";

            setTimeout(() => {
                if (usernameInput) {
                    usernameInput.focus();
                    if (usernameInput.value) usernameInput.select();
                }
            }, 100);
        }

        function resetModalState() {
            // Form temizle
            try {
                form.reset();
            } catch (err) {
                // reset() desteklenmiyorsa input'ları manuel temizle
                if (usernameInput) usernameInput.value = "";
                if (messageInput) messageInput.value = "";
            }

            clearModalAlert();
            updateCharCounter();
        }

        function closeModal() {
            if (!modal) return;

            if (window.GlobalModal && window.GlobalModal.isOpen()) {
                window.GlobalModal.close("feature-close");
                return;
            }

            modal.classList.remove("show");
            modal.setAttribute("aria-hidden", "true");
            document.body.style.overflow = "";
            resetModalState();

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
            const message = messageInput
                ? messageInput.value.trim()
                : "";

            // Client-side validation
            const errUsername = validateUsername(username);
            if (errUsername) {
                showModalAlert(errUsername, "error");
                if (usernameInput) usernameInput.focus();
                return;
            }

            const errMessage = validateMessage(message);
            if (errMessage) {
                showModalAlert(errMessage, "error");
                if (messageInput) messageInput.focus();
                return;
            }

            // Payload — backend BanAppealRequestModel ile uyumlu.
            // Mevcut log/format yapısı korunur, sadece alanlar
            // sadeleştirilmiştir.
            const payload = {
                username: username,
                message: message
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
                messageInput
            ];
            fields.forEach((f) => {
                if (f) f.disabled = true;
            });

            try {
                const response = await fetch(BAN_APPEAL_ENDPOINT, {
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
                    "[BAN APPEAL] Network error:",
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
