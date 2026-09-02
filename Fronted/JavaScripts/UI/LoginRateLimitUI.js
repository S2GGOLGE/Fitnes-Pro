// =========================================================
// FITNESS PRO - LOGIN RATE LIMIT UI
// =========================================================
//
// Backend rate-limit sisteminin TEK otorite olduğu kabul
// edilerek yazılmıştır. Frontend:
//
//   - 5dk / 10dk / 15 deneme gibi eşikleri KENDİ BELİRLEMEZ.
//   - remainingSeconds değerini KENDİ ÜRETMEZ.
//   - attempts sayacını GÜVENLİK KAYNAĞI olarak TUTMAZ.
//   - localStorage / sessionStorage / cookies'i blok
//     kararı için KULLANMAZ (sadece görsel countdown için de
//     kullanmaz; tüm UI state bellek içi ve tek bir interval).
//
// Backend response yapısı (ApiResponseModel):
//
//   {
//     success:          boolean,
//     message:          string,
//     data:             object | null,
//     rateLimited:      boolean,
//     remainingSeconds: number | null,
//     accountLocked:    boolean
//   }
//
// Backend endpoint:
//
//   GET  /api/rate/login     -> güncel rate durumunu döner
//   POST /api/auth/login     -> login (response body yine
//                               rateLimited / accountLocked
//                               alanları içerebilir)
//
// Sayfa açıldığında ve login denemesinden önce backend'e
// sorulur; backend "kilitli" dönüyorsa login isteği
// GÖNDERILMEZ. Countdown yalnızca görseldir; bittiğinde
// frontend kilidi kendi başına açmaz, tekrar backend'e
// sorar.
//
// Mevcut public API (LoginEndpoint.js'in kullandığı)
// geriye uyumluluk için korunur:
//   - start(seconds, message)
//   - showPermanentLock(message)
//   - stop()
//   - isActive()
//   - isPermanentLockActive()
//   - getRemainingSeconds()
//   - restore()           -> refreshLoginRateStatus() ile aynı iş
//   - setApplicationUrl(url)
// =========================================================

(function () {
    "use strict";

    // =========================================================
    // API CONFIG
    // =========================================================
    //
    // Yeni bir base URL sistemi kurulmadı. Mevcut proje
    // mimarisi: window.Auth.getBaseUrl() / window.API_BASE_URL
    // =========================================================

    function getApiBaseUrl() {
        if (window.Auth && typeof window.Auth.getBaseUrl === "function") {
            return window.Auth.getBaseUrl();
        }
        if (typeof window.API_BASE_URL === "string" && window.API_BASE_URL) {
            return window.API_BASE_URL;
        }
        return "http://localhost:8081";
    }

    function getRateStatusUrl() {
        return `${getApiBaseUrl()}/api/rate/login`;
    }

    // =========================================================
    // IN-MEMORY UI STATE
    // =========================================================
    //
    // Bu değişkenler yalnızca görsel countdown ve UI kapıları
    // için kullanılır. Rate-limit kararının kaynağı DEĞİLDİR.
    // Sayfa yenilenince bu state sıfırlanır, gerçek karar
    // backend'den tekrar okunur.
    // =========================================================

    let rateCountdownTimer = null;
    let currentRemaining = 0;
    let permanentLockActive = false;

    // =========================================================
    // DOM HELPERS
    // =========================================================

    function getRateLimitElements() {
        return {
            container: document.getElementById("loginRateLimit"),
            timer: document.getElementById("loginRateLimitTimer"),
            permanent: document.getElementById("loginRateLimitPermanent"),
            permanentBtn: document.getElementById("loginRateLimitPermanentBtn"),
            title: document.getElementById("loginRateLimitTitle"),
            message: document.getElementById("loginRateLimitMessage")
        };
    }

    function getFormElements() {
        const loginForm = document.querySelector(".form");
        return {
            form: loginForm,
            usernameInput: document.getElementById("username"),
            passwordInput: document.getElementById("password"),
            submitButton: loginForm
                ? loginForm.querySelector(".login-btn")
                : null,
            forgotPasswordLink: document.getElementById("forgotPasswordLink"),
            alertBox: document.getElementById("formAlert")
        };
    }

    // =========================================================
    // TIMER FORMAT
    // =========================================================

    function formatTimer(totalSeconds) {
        const safe = Math.max(
            0,
            Math.floor(Number(totalSeconds) || 0)
        );
        const minutes = Math.floor(safe / 60);
        const seconds = safe % 60;
        return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    function normalizeMessage(message) {
        if (
            message &&
            typeof message === "string" &&
            message.trim()
        ) {
            return message;
        }
        return "Çok fazla başarısız giriş denemesi. Lütfen daha sonra tekrar deneyiniz.";
    }

    // =========================================================
    // SINGLE COUNTDOWN TIMER
    // =========================================================
    //
    // Sayfa içinde aynı anda en fazla 1 interval çalışır.
    // Yeni countdown başlatmadan önce eski temizlenir.
    // =========================================================

    function clearRateCountdown() {
        if (rateCountdownTimer !== null) {
            clearInterval(rateCountdownTimer);
            rateCountdownTimer = null;
        }
        currentRemaining = 0;
    }

    function updateRateCountdownUI(remainingSeconds) {
        const { timer } = getRateLimitElements();
        if (timer) {
            timer.textContent = formatTimer(remainingSeconds);
        }
    }

    function startRateCountdown(seconds) {
        clearRateCountdown();

        const total = Number(seconds);
        if (!Number.isFinite(total) || total <= 0) {
            // Backend süre göndermediyse / 0 geldiyse frontend
            // kendi başına süre uydurmaz, doğrudan backend'e
            // tekrar sorar.
            refreshLoginRateStatus();
            return;
        }

        currentRemaining = Math.ceil(total);
        updateRateCountdownUI(currentRemaining);

        rateCountdownTimer = setInterval(async () => {
            currentRemaining--;

            if (currentRemaining <= 0) {
                clearRateCountdown();
                // Sayaç bitti diye frontend "kilit kalktı"
                // kararını KENDİ VERMEZ. Gerçek durum
                // yine backend'den sorulur.
                await refreshLoginRateStatus();
                return;
            }

            updateRateCountdownUI(currentRemaining);
        }, 1000);
    }

    // =========================================================
    // BACKEND: GET /api/rate/login
    // =========================================================
    //
    // Network hatası durumunda exception fırlatır. Çağıran
    // fonksiyon bu hatayı yakalayıp sessizce devam eder;
    // kullanıcı rate-limit'li gibi DAVRANILMAZ (12. madde).
    // =========================================================

    async function getLoginRateStatus() {
        const response = await fetch(getRateStatusUrl(), {
            method: "GET",
            headers: {
                "Accept": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error("Rate status alınamadı.");
        }

        return await response.json();
    }

    async function refreshLoginRateStatus() {
        try {
            const rate = await getLoginRateStatus();

            if (!rate || rate.success !== true) {
                return;
            }

            // 1) Kalıcı hesap blokesi
            if (rate.accountLocked === true) {
                clearRateCountdown();
                applyPermanentLock(rate.message);
                return;
            }

            // 2) Geçici rate limit
            if (rate.rateLimited === true) {
                // -------------------------------------------------
                // SAVUNMA: rateLimited:true + remainingSeconds:0/null
                //
                // Backend'in dokümantasyonu/normal davranışı:
                //   rateLimited:true ise remainingSeconds > 0 olur.
                //
                // Ancak backend tarafında küçük bir tutarsızlık
                // (ör. blok süresi henüz expire edilmemiş ama 0
                // hesaplanmış) veya 5dk sonra hâlâ true dönen bir
                // state oluşabilir. Bu durum frontend için
                // "kilit yok" anlamına gelir çünkü bekleyecek bir
                // süre yoktur. Aksi halde 6. denemede form
                // görsel olarak kilitli (rate-limited class'lı)
                // ama isActive() false kalır, finally'de buton
                // enable olur, kullanıcı login yapamaz.
                // -------------------------------------------------

                const seconds = Number(rate.remainingSeconds);

                if (Number.isFinite(seconds) && seconds > 0) {
                    applyTemporaryLock(rate.message, seconds);
                } else {
                    clearRateLimit();
                }
                return;
            }

            // 3) Normal durum
            clearRateLimit();

        } catch (error) {
            console.error(
                "[RATE LIMIT] Status alınamadı:",
                error
            );
            // Network hatası: kullanıcı rate-limit'li gibi
            // davranma, login normal denemeye devam etsin.
            // Mevcut UI state korunur (mevcut ekran kilitli
            // ise kilitli kalır, normal ise normal kalır).
        }
    }

    // =========================================================
    // FORM LOCK / UNLOCK
    // =========================================================

    function setLoginFormDisabled(disabled) {
        const {
            usernameInput,
            passwordInput,
            forgotPasswordLink,
            submitButton,
            form
        } = getFormElements();

        const targets = [
            usernameInput,
            passwordInput,
            forgotPasswordLink
        ];

        targets.forEach((element) => {
            if (!element) {
                return;
            }
            if (disabled) {
                element.setAttribute("disabled", "true");
                element.setAttribute("aria-disabled", "true");
            } else {
                element.removeAttribute("disabled");
                element.removeAttribute("aria-disabled");
            }
        });

        if (form) {
            const toggleButtons = form.querySelectorAll(".password-toggle");
            toggleButtons.forEach((button) => {
                if (disabled) {
                    button.setAttribute("disabled", "true");
                    button.setAttribute("aria-disabled", "true");
                } else {
                    button.removeAttribute("disabled");
                    button.removeAttribute("aria-disabled");
                }
            });
            form.classList.toggle("rate-limited", !!disabled);
        }

        if (submitButton) {
            submitButton.disabled = !!disabled;
        }
    }

    function clearAlert() {
        const { alertBox } = getFormElements();
        if (alertBox) {
            alertBox.textContent = "";
            alertBox.className = "form-alert";
        }
    }

    // =========================================================
    // UI: APPLY STATES
    // =========================================================

    function applyPermanentLock(message) {
        permanentLockActive = true;

        const {
            container,
            timer,
            permanent,
            permanentBtn,
            title,
            message: messageEl
        } = getRateLimitElements();

        if (container) {
            container.hidden = false;
            container.classList.add("is-permanent");
        }
        if (timer) {
            timer.hidden = true;
        }
        if (permanent) {
            permanent.hidden = false;
        }
        if (title) {
            title.textContent = "Hesabınız Güvenlik Nedeniyle Bloke Edildi";
        }
        if (messageEl) {
            messageEl.textContent = normalizeMessage(message);
        }

        if (permanentBtn) {
            const url = permanentBtn.getAttribute("data-basvuru-url");
            if (url && url !== "#") {
                permanentBtn.href = url;
            } else {
                permanentBtn.addEventListener(
                    "click",
                    (event) => {
                        event.preventDefault();
                        console.warn(
                            "[LoginRateLimitUI] Hesap açtırma başvuru URL'si tanımlanmamış."
                        );
                    },
                    { once: true }
                );
            }
        }

        setLoginFormDisabled(true);
        clearAlert();
    }

    function applyTemporaryLock(message, remainingSeconds) {
        // -----------------------------------------------------
        // SAVUNMA: Tutarsız backend response koruması
        //
        // Backend "rateLimited: true" ama "remainingSeconds: 0
        // veya null" gönderirse (örn. 5dk blok süresi dolmuş
        // ama backend hâlâ true dönüyor), frontend bu
        // durumu KENDİ YORUMLAMAMALI. Aksi halde:
        //   - setLoginFormDisabled(true) ile form kilitlenir
        //   - startRateCountdown(0) timer kurmaz
        //   - isActive() false döner
        //   - finally'de buton enable olur
        //   - AMA form görsel olarak kilitli kalır
        //     (form.rate-limited class'ı, input'lar display:none)
        //   - Kullanıcı 6. denemede login yapamaz
        //
        // Bu nedenle süre 0/null/NaN ise UI kilitlenmez,
        // sadece backend'e gerçek durum tekrar sorulur.
        // -----------------------------------------------------

        const seconds = Number(remainingSeconds);

        if (!Number.isFinite(seconds) || seconds <= 0) {
            refreshLoginRateStatus();
            return;
        }

        permanentLockActive = false;

        const {
            container,
            timer,
            permanent,
            title,
            message: messageEl
        } = getRateLimitElements();

        if (container) {
            container.hidden = false;
            container.classList.remove("is-permanent");
        }
        if (timer) {
            timer.hidden = false;
        }
        if (permanent) {
            permanent.hidden = true;
        }
        if (title) {
            title.textContent = "Hesap Geçici Olarak Kilitlendi";
        }
        if (messageEl) {
            messageEl.textContent = normalizeMessage(message);
        }

        setLoginFormDisabled(true);
        clearAlert();

        // Countdown yalnızca görsel amaçlıdır; backend
        // tarafından gönderilen değer kullanılır, frontend
        // yeni bir süre üretmez.
        startRateCountdown(seconds);
    }

    function clearRateLimit() {
        permanentLockActive = false;
        clearRateCountdown();

        const {
            container,
            timer,
            permanent
        } = getRateLimitElements();

        if (container) {
            container.hidden = true;
            container.classList.remove("is-permanent");
        }
        if (timer) {
            timer.hidden = false;
            timer.textContent = "00:00";
        }
        if (permanent) {
            permanent.hidden = true;
        }

        setLoginFormDisabled(false);
        clearAlert();
    }

    // =========================================================
    // PUBLIC API
    // =========================================================
    //
    // Mevcut API imzaları (LoginEndpoint.js ile uyum)
    // korunur. Yeni eklenenler: getLoginRateStatus,
    // refreshLoginRateStatus, startRateCountdown,
    // clearRateCountdown.
    // =========================================================

    window.LoginRateLimitUI = {

        // Yeni: backend'den rate durumunu çek
        getLoginRateStatus: getLoginRateStatus,
        refreshLoginRateStatus: refreshLoginRateStatus,
        startRateCountdown: startRateCountdown,
        clearRateCountdown: clearRateCountdown,

        // Mevcut API (geriye uyumluluk)
        start: function (durationSeconds, message) {
            applyTemporaryLock(message, durationSeconds);
        },
        showPermanentLock: function (message) {
            applyPermanentLock(message);
        },
        stop: function () {
            clearRateLimit();
        },
        isActive: function () {
            // Timer aktifse frontend bu kapıyı kilitli
            // kabul eder. Kararın kaynağı yine backend'dir
            // (refreshLoginRateStatus üzerinden).
            return rateCountdownTimer !== null;
        },
        isPermanentLockActive: function () {
            return permanentLockActive;
        },
        getRemainingSeconds: function () {
            return currentRemaining;
        },
        restore: function () {
            // Eski API: sayfa yüklendiğinde eski state'i
            // geri yükle. Yeni davranışta "geri yükleme"
            // zaten backend'den gelir; bu nedenle burada
            // doğrudan backend'e sorulur.
            refreshLoginRateStatus();
        },
        setApplicationUrl: function (url) {
            const { permanentBtn } = getRateLimitElements();
            if (permanentBtn) {
                permanentBtn.setAttribute("data-basvuru-url", url);
            }
        }
    };

    // =========================================================
    // AUTO INIT (10. madde)
    // =========================================================
    //
    // Sayfa açıldığında backend'e bir kez rate durumu
    // sorulur. F5 ile bypass girişimi burada engellenir:
    // backend "rateLimited:true" dönüyorsa UI hemen tekrar
    // kilitlenir.
    // =========================================================

    function init() {
        refreshLoginRateStatus();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

})();
