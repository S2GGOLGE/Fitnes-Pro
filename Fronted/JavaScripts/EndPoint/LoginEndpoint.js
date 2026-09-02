
    // =========================================================
    // FITNESS PRO - LOGIN ENDPOINT INTEGRATION
    // =========================================================
    //
    // Backend yeni response yapısı (ApiResponseModel):
    // {
    //   success:          boolean,
    //   message:          string,
    //   data:             object | null,
    //   rateLimited:      boolean,
    //   remainingSeconds: number | null,
    //   accountLocked:    boolean
    // }
    //
    // Backend kararları (frontend tarafından üretilmez):
    // 5  başarısız deneme -> rateLimited:true,  remainingSeconds: 300
    // 10 başarısız deneme -> rateLimited:true,  remainingSeconds: 600
    // 15 başarısız deneme -> accountLocked:true (kalıcı blok)
    //
    // Frontend karar sırası (sadece body alanlarına göre):
    //  1) accountLocked === true   -> kalıcı blok
    //  2) rateLimited  === true    -> geçici rate limit (countdown)
    //  3) success      === true    -> başarılı login
    //  4) diğer                    -> normal hata (result.message)
    //
    // HTTP 429 sadece fallback olarak handle edilir.
    // Mesaj metni analiz edilmez, frontend kendi mesajını üretmez.
    // =========================================================

    document.addEventListener("DOMContentLoaded", () => {

        // =========================================================
        // ALREADY LOGGED IN
        // =========================================================

        if (window.Auth && window.Auth.redirectIfLoggedIn()) {
            return;
        }

        // =========================================================
        // API CONFIGURATION
        // =========================================================

        const API_BASE_URL =
            (window.Auth && window.Auth.getBaseUrl()) ||
            window.API_BASE_URL ||
            "http://localhost:8081";

        const LOGIN_ENDPOINT = `${API_BASE_URL}/api/login`;

        // =========================================================
        // FORM ELEMENTS (mevcut ID'ler korunur)
        // =========================================================

        const loginForm = document.querySelector(".form");

        const usernameInput =
            document.getElementById("username");

        const passwordInput =
            document.getElementById("password");

        const submitButton =
            loginForm
                ? loginForm.querySelector(".login-btn")
                : null;

        const alertBox =
            document.getElementById("formAlert");

        const forgotPasswordLink =
            document.getElementById("forgotPasswordLink");

        if (!loginForm) {
            return;
        }

        // =========================================================
        // RESPONSE HELPERS
        // =========================================================

        async function parseResponseBody(response) {
            try {
                return await response.json();
            } catch {
                return null;
            }
        }

        function getBackendMessage(result) {
            if (
                result &&
                typeof result.message === "string" &&
                result.message.trim()
            ) {
                return result.message;
            }
            return null;
        }

        function getRemainingSeconds(result) {
            if (!result || typeof result !== "object") {
                return 0;
            }

            const value = Number(result.remainingSeconds);

            if (Number.isFinite(value) && value > 0) {
                return Math.ceil(value);
            }

            return 0;
        }

        // =========================================================
        // ALERT (mevcut frontend hata sistemi korunur)
        // =========================================================

        function showAlert(
            message,
            type = "error"
        ) {
            if (!alertBox) {
                return;
            }

            alertBox.textContent = message;

            alertBox.className =
                `form-alert show ${type}`;
        }

        function clearAlert() {
            if (!alertBox) {
                return;
            }

            alertBox.textContent = "";

            alertBox.className =
                "form-alert";
        }

        // =========================================================
        // LOGIN SUBMIT
        // =========================================================

        loginForm.addEventListener(
            "submit",
            async (event) => {

                event.preventDefault();

                // -----------------------------------------
                // ENGEL KONTROLÜ
                //
                // Rate-limit kararının tek kaynağı backend'dir.
                // Login isteği gönderilmeden HEMEN ÖNCE
                // GET /api/rate/login çağrılarak güncel durum
                // alınır. Backend rateLimited / accountLocked
                // dönüyorsa login endpoint'ine İSTEK GÖNDERİLMEZ
                // ve UI mevcut LoginRateLimitUI üzerinden
                // kilitlenir (bkz. LoginRateLimitUI.refresh).
                // -----------------------------------------

                if (
                    window.LoginRateLimitUI &&
                    typeof window.LoginRateLimitUI.refreshLoginRateStatus === "function"
                ) {
                    try {
                        await window.LoginRateLimitUI.refreshLoginRateStatus();
                    } catch (error) {
                        // Network hatası durumunda sessizce
                        // devam et: kullanıcı rate-limit'li
                        // gibi DAVRANILMAZ. Backend login
                        // endpoint'i zaten kendi rate-limit
                        // kontrolünü yapacaktır.
                        console.error(
                            "[LOGIN] Rate pre-check failed:",
                            error
                        );
                    }
                }

                if (
                    window.LoginRateLimitUI &&
                    typeof window.LoginRateLimitUI.isActive === "function" &&
                    window.LoginRateLimitUI.isActive()
                ) {
                    console.log("[LOGIN] Rate limit active - request prevented");
                    return;
                }

                if (
                    window.LoginRateLimitUI &&
                    typeof window.LoginRateLimitUI.isPermanentLockActive === "function" &&
                    window.LoginRateLimitUI.isPermanentLockActive()
                ) {
                    console.log("[LOGIN] Permanent lock active - request prevented");
                    return;
                }

                clearAlert();

                // -----------------------------------------
                // FORM VALUES
                // -----------------------------------------

                const username =
                    usernameInput
                        ? usernameInput.value.trim()
                        : "";

                const password =
                    passwordInput
                        ? passwordInput.value
                        : "";

                // -----------------------------------------
                // CLIENT VALIDATION
                // -----------------------------------------

                if (!username || !password) {

                    showAlert(
                        "Lütfen kullanıcı adı ve şifrenizi giriniz.",
                        "error"
                    );

                    return;
                }

                // -----------------------------------------
                // PAYLOAD
                // -----------------------------------------

                const payload = {
                    username: username,
                    password: password
                };

                // -----------------------------------------
                // LOADING STATE (mevcut sistem korunur)
                // -----------------------------------------

                const originalBtnText =
                    submitButton
                        ? submitButton.textContent
                        : "Giriş";

                if (submitButton) {

                    submitButton.disabled = true;

                    submitButton.textContent =
                        "Giriş yapılıyor...";
                }

                try {

                    // -----------------------------------------
                    // API REQUEST
                    // -----------------------------------------

                    const response =
                        await fetch(
                            LOGIN_ENDPOINT,
                            {
                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body:
                                    JSON.stringify(
                                        payload
                                    )
                            }
                        );

                    // -----------------------------------------
                    // RESPONSE BODY (her zaman parse et)
                    // -----------------------------------------

                    const result =
                        await parseResponseBody(response);

                    // =================================================
                    // KARAR AĞACI
                    // Sıralama: accountLocked -> rateLimited -> success -> error
                    // =================================================

                    // -----------------------------------------
                    // 1) KALICI BLOK
                    // -----------------------------------------

                    if (
                        result &&
                        result.accountLocked === true
                    ) {

                        const backendMessage =
                            getBackendMessage(result) ||
                            "Hesabınız güvenlik nedeniyle bloke edilmiştir.";

                        console.log(
                            "[LOGIN] Account permanently locked"
                        );

                        if (window.LoginRateLimitUI) {
                            window.LoginRateLimitUI.showPermanentLock(
                                backendMessage
                            );
                        }

                        return;
                    }

                    // -----------------------------------------
                    // 2) GEÇİCİ RATE LIMIT
                    // -----------------------------------------

                    if (
                        result &&
                        result.rateLimited === true
                    ) {

                        const backendMessage =
                            getBackendMessage(result) ||
                            "Çok fazla başarısız giriş denemesi.";

                        const duration =
                            getRemainingSeconds(result);

                        console.log(
                            "[LOGIN] Rate limit triggered, remainingSeconds:",
                            duration
                        );

                        // Geçerli bir süre varsa UI countdown başlat
                        if (duration > 0) {

                            if (window.LoginRateLimitUI) {
                                window.LoginRateLimitUI.start(
                                    duration,
                                    backendMessage
                                );
                            } else {
                                console.error(
                                    "[LOGIN] LoginRateLimitUI not available"
                                );
                                showAlert(
                                    backendMessage,
                                    "error"
                                );
                            }

                        } else {

                            // Süre gelmediyse sadece alert göster
                            showAlert(
                                backendMessage,
                                "error"
                            );
                        }

                        return;
                    }

                    // -----------------------------------------
                    // 3) HTTP 429 FALLBACK
                    // (Eski davranışta backend 429 dönüyor olabilir;
                    //  body alanları yetersizse burası devreye girer.)
                    // -----------------------------------------

                    if (response.status === 429) {

                        console.log(
                            "[LOGIN] HTTP 429 fallback"
                        );

                        const backendMessage =
                            getBackendMessage(result) ||
                            "Çok fazla başarısız giriş denemesi. Lütfen daha sonra tekrar deneyiniz.";

                        const duration =
                            getRemainingSeconds(result);

                        if (duration > 0 && window.LoginRateLimitUI) {

                            window.LoginRateLimitUI.start(
                                duration,
                                backendMessage
                            );

                        } else {

                            showAlert(
                                backendMessage,
                                "error"
                            );
                        }

                        return;
                    }

                    // -----------------------------------------
                    // 4) BAŞARILI LOGIN
                    // -----------------------------------------

                    if (
                        response.ok &&
                        result &&
                        result.success === true
                    ) {

                        const successMsg =
                            getBackendMessage(result) ||
                            "Giriş başarılı!";

                        showAlert(
                            successMsg,
                            "success"
                        );

                        // -----------------------------------------
                        // TOKEN & USER DATA ÇIKARMA
                        // result.data içinden alınır.
                        // -----------------------------------------

                        const data = result.data;

                        let token = null;
                        let userData = null;

                        if (typeof data === "string") {

                            // Geriye uyumluluk: data string ise JWT olarak kabul et
                            token = data;

                        } else if (
                            data &&
                            typeof data === "object"
                        ) {

                            token = data.token || null;

                            // Yeni response yapısındaki alanlar:
                            // userId, username, role, level, roles
                            userData = {
                                userId: data.userId,
                                username:
                                    data.username || username,
                                role:
                                    data.role || "User",
                                level:
                                    data.level || null,
                                roles: Array.isArray(data.roles)
                                    ? data.roles
                                    : [data.role || "User"]
                            };

                        } else if (result.token) {

                            // Bazı eski varyantlarda token kök seviyede olabilir
                            token = result.token;
                        }

                        // -----------------------------------------
                        // SESSION KAYDET (mevcut auth mimarisi korunur)
                        // -----------------------------------------

                        if (token && window.Auth) {

                            window.Auth.saveSession(
                                token,
                                userData || { username: username }
                            );
                        }

                        // -----------------------------------------
                        // RATE LIMIT STATE TEMİZLE
                        // -----------------------------------------

                        if (window.LoginRateLimitUI) {
                            window.LoginRateLimitUI.stop();
                        }

                        loginForm.reset();

                        // -----------------------------------------
                        // YÖNLENDİRME (mevcut akış korunur)
                        // -----------------------------------------

                        setTimeout(
                            () => {

                                window.location.href =
                                    "index.html";

                            },
                            1000
                        );

                        return;
                    }

                    // -----------------------------------------
                    // 5) NORMAL HATA
                    // Backend'in gönderdiği message direkt gösterilir.
                    // Frontend kendi mesajını üretmez.
                    // -----------------------------------------

                    const errorMsg =
                        getBackendMessage(result) ||
                        "Giriş işlemi sırasında bir hata oluştu.";

                    showAlert(
                        errorMsg,
                        "error"
                    );

                } catch (error) {

                    // =================================================
                    // NETWORK ERROR
                    // Backend tamamen erişilemiyorsa mevcut frontend
                    // hata sistemi kullanılarak bilgi verilir.
                    // =================================================

                    console.error(
                        "[LOGIN] Network error:",
                        error
                    );

                    showAlert(
                        "Sunucuya bağlanılamadı. Lütfen backend servisinin çalıştığından emin olunuz.",
                        "error"
                    );

                } finally {

                    // =================================================
                    // BUTTON STATE (mevcut akış korunur)
                    // =================================================

                    if (submitButton) {

                        if (
                            window.LoginRateLimitUI &&
                            typeof window.LoginRateLimitUI.isActive === "function" &&
                            window.LoginRateLimitUI.isActive()
                        ) {

                            submitButton.textContent =
                                originalBtnText;

                        } else if (
                            window.LoginRateLimitUI &&
                            typeof window.LoginRateLimitUI.isPermanentLockActive === "function" &&
                            window.LoginRateLimitUI.isPermanentLockActive()
                        ) {

                            submitButton.textContent =
                                originalBtnText;

                            submitButton.disabled = true;

                        } else {

                            submitButton.disabled = false;

                            submitButton.textContent =
                                originalBtnText;
                        }
                    }
                }
            }
        );

        // =========================================================
        // INITIAL RESTORE
        // LoginRateLimitUI.js kendi içinde restoreState() çağırır.
        // Bu nedenle burada ekstra restore işlemi gerekmez.
        // =========================================================

    });
