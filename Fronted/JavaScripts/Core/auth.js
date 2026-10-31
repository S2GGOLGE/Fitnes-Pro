/**
 * =========================================================
 * FITNESS PRO - JWT AUTHENTICATION CORE HELPER
 * =========================================================
 * Centralized JWT token handling, storage, session management,
 * token decoding, route guards, and authenticated API requests.
 */

(function () {
    const TOKEN_KEY = "fitness_pro_token";
    const USER_KEY = "fitness_pro_user";
    const ADMIN_KEY = "fitness_pro_admin";

    const Auth = {
        // =====================================================
        // BASE API URL
        // =====================================================

        getBaseUrl() {
            return window.API_BASE_URL || "http://localhost:8081";
        },

        // =====================================================
        // SESSION
        // =====================================================

        saveSession(token, user = null) {
            if (!token) return;

            localStorage.setItem(TOKEN_KEY, token);

            if (user) {
                if (!user.email && token) {
                    const decoded = this.parseJwt(token);
                    if (decoded) {
                        user.email =
                            decoded.email ||
                            decoded[
                                "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
                            ] ||
                            "";
                    }
                }
                localStorage.setItem(USER_KEY, JSON.stringify(user));
            } else {
                const decoded = this.parseJwt(token);

                if (decoded) {
                    const extractedUser = {
                        userId: decoded.sub || decoded.nameid,
                        username:
                            decoded.unique_name ||
                            decoded.name ||
                            "Kullanıcı",
                        email:
                            decoded.email ||
                            decoded[
                                "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
                            ] ||
                            "",
                        role: decoded.role || "User"
                    };

                    localStorage.setItem(
                        USER_KEY,
                        JSON.stringify(extractedUser)
                    );
                }
            }
        },

        getToken() {
            const token = localStorage.getItem(TOKEN_KEY);

            if (!token) {
                return null;
            }

            if (this.isTokenExpired(token)) {
                this.clearSession();
                this.clearAdmin();
                return null;
            }

            return token;
        },

        getUser() {
            const userStr = localStorage.getItem(USER_KEY);

            if (userStr) {
                try {
                    const parsed = JSON.parse(userStr);
                    if (parsed && !parsed.email) {
                        const token = this.getToken();
                        if (token) {
                            const decoded = this.parseJwt(token);
                            if (decoded) {
                                parsed.email =
                                    decoded.email ||
                                    decoded[
                                        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
                                    ] ||
                                    "";
                            }
                        }
                    }
                    return parsed;
                } catch {
                    // Ignore invalid JSON
                }
            }

            const token = this.getToken();

            if (token) {
                const decoded = this.parseJwt(token);

                if (decoded) {
                    return {
                        userId: decoded.sub || decoded.nameid,
                        username:
                            decoded.unique_name ||
                            decoded.name ||
                            "Kullanıcı",
                        email:
                            decoded.email ||
                            decoded[
                                "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
                            ] ||
                            "",
                        role: decoded.role || "User"
                    };
                }
            }

            return null;
        },

        clearSession() {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
        },

        // =====================================================
        // JWT
        // =====================================================

        parseJwt(token) {
            try {
                if (!token) {
                    return null;
                }

                const parts = token.split(".");

                if (parts.length < 2) {
                    return null;
                }

                const base64Url = parts[1];

                const base64 = base64Url
                    .replace(/-/g, "+")
                    .replace(/_/g, "/");

                const jsonPayload = decodeURIComponent(
                    atob(base64)
                        .split("")
                        .map(
                            c =>
                                "%" +
                                ("00" +
                                    c.charCodeAt(0).toString(16)).slice(-2)
                        )
                        .join("")
                );

                return JSON.parse(jsonPayload);
            } catch (err) {
                console.error("JWT Decode Error:", err);
                return null;
            }
        },

        isTokenExpired(token) {
            const decoded = this.parseJwt(token);

            if (!decoded || !decoded.exp) {
                return false;
            }

            const currentTime = Math.floor(Date.now() / 1000);

            return decoded.exp < currentTime;
        },

        isAuthenticated() {
            return !!this.getToken();
        },

        // =====================================================
        // LOGOUT
        // =====================================================

        logout(redirect = true) {
            this.clearSession();
            this.clearAdmin();

            if (redirect) {
                const currentPath =
                    window.location.pathname.toLowerCase();

                const isAuthOrOnboardingPage =
                    currentPath.includes("login.html") ||
                    currentPath.includes("singup.html") ||
                    currentPath.includes("register.html") ||
                    currentPath.includes("epostadogrulama.html") ||
                    currentPath.includes("konumbelirleme.html");

                // Kullanıcı zaten kayıt/giriş/onboarding sürecindeyse sayfadan koparıp Login'e yönlendirme
                if (isAuthOrOnboardingPage) {
                    return;
                }

                const isInPagesDir =
                    currentPath.includes("/pages/");

                const loginPath = isInPagesDir
                    ? "Login.html"
                    : "Pages/Login.html";

                window.location.href = loginPath;
            }
        },

        confirmLogout() {
            if (window.GlobalModal?.isOpen && window.GlobalModal.isOpen()) {
                return;
            }

            const performLogout = () => {
                this.logout(true);
            };

            if (window.GlobalModal && typeof window.GlobalModal.confirm === "function") {
                window.GlobalModal.confirm({
                    title: "Çıkış Yap",
                    description: "Oturumunuz sonlandırılacak. Devam etmek istiyor musunuz?",
                    buttons: [
                        {
                            text: "İptal",
                            variant: "secondary"
                        },
                        {
                            text: "Çıkış Yap",
                            variant: "danger",
                            callback: () => performLogout()
                        }
                    ]
                });
                return;
            }

            this._renderFallbackLogoutModal(performLogout);
        },

        _renderFallbackLogoutModal(onConfirm) {
            const existing = document.getElementById("fallbackLogoutModal");
            if (existing) existing.remove();

            const backdrop = document.createElement("div");
            backdrop.id = "fallbackLogoutModal";
            backdrop.style.cssText =
                "position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:99999;backdrop-filter:blur(4px);padding:16px;";

            const box = document.createElement("div");
            box.style.cssText =
                "background:#1e293b;color:#f8fafc;border-radius:12px;max-width:400px;width:100%;padding:24px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.5);font-family:inherit;border:1px solid rgba(255,255,255,0.1);";

            box.innerHTML = `
                <h3 style="margin:0 0 8px 0;font-size:1.25rem;font-weight:600;">Çıkış Yap</h3>
                <p style="margin:0 0 24px 0;font-size:0.95rem;color:#94a3b8;line-height:1.5;">Oturumunuz sonlandırılacak. Devam etmek istiyor musunuz?</p>
                <div style="display:flex;justify-content:flex-end;gap:12px;">
                    <button type="button" id="fallbackLogoutCancel" style="padding:10px 18px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:transparent;color:#f8fafc;cursor:pointer;font-weight:500;">İptal</button>
                    <button type="button" id="fallbackLogoutConfirm" style="padding:10px 18px;border-radius:8px;border:none;background:#ef4444;color:#ffffff;cursor:pointer;font-weight:600;">Çıkış Yap</button>
                </div>
            `;

            backdrop.appendChild(box);
            document.body.appendChild(backdrop);

            const close = () => backdrop.remove();
            backdrop.querySelector("#fallbackLogoutCancel").addEventListener("click", close);
            backdrop.querySelector("#fallbackLogoutConfirm").addEventListener("click", () => {
                close();
                onConfirm();
            });
            backdrop.addEventListener("click", (e) => {
                if (e.target === backdrop) close();
            });
        },

        // =====================================================
        // AUTH ROUTE GUARD
        // =====================================================

        requireAuth() {
            if (!this.isAuthenticated()) {
                const isInPagesDir =
                    window.location.pathname
                        .toLowerCase()
                        .includes("/pages/");

                const loginPath = isInPagesDir
                    ? "Login.html"
                    : "Pages/Login.html";

                window.location.href = loginPath;

                return false;
            }

            return true;
        },

        redirectIfLoggedIn() {
            if (this.isAuthenticated()) {
                const isInPagesDir =
                    window.location.pathname
                        .toLowerCase()
                        .includes("/pages/");

                const indexPath = isInPagesDir
                    ? "index.html"
                    : "Pages/index.html";

                window.location.href = indexPath;

                return true;
            }

            return false;
        },

        // =====================================================
        // AUTHENTICATED FETCH
        // =====================================================

        async authFetch(url, options = {}) {
            const token = this.getToken();

            const headers = {
                Accept: "application/json",
                ...(options.headers || {})
            };

            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }

            if (
                options.body &&
                typeof options.body === "string" &&
                !headers["Content-Type"]
            ) {
                headers["Content-Type"] = "application/json";
            }

            const fetchOptions = {
                ...options,
                headers
            };

            const fullUrl = url.startsWith("http")
                ? url
                : `${this.getBaseUrl()}${
                      url.startsWith("/") ? "" : "/"
                  }${url}`;

            try {
                const response = await fetch(
                    fullUrl,
                    fetchOptions
                );

                if (response.status === 401) {
                    console.warn(
                        "Unauthorized request (401). Token may be expired."
                    );

                    this.logout(true);

                    return response;
                }

                return response;
            } catch (error) {
                console.error(
                    "AuthFetch Network Error:",
                    error
                );

                throw error;
            }
        },

        // =====================================================
        // VERIFY TOKEN
        // =====================================================

        async verifyToken() {
            try {
                const response = await this.authFetch(
                    "/api/auth/me"
                );

                if (response && response.ok) {
                    const result = await response.json();

                    if (
                        result &&
                        result.success &&
                        result.data
                    ) {
                        this.saveSession(
                            this.getToken(),
                            result.data
                        );

                        return result.data;
                    }
                }

                return null;
            } catch {
                return null;
            }
        },

        // =====================================================
        // AUTH UI
        // =====================================================

        syncAuthUI() {
            const user = this.getUser();

            if (!user) {
                return;
            }

            const username =
                user.username || "Kullanıcı";

            const initial =
                username.charAt(0).toUpperCase();

            const topbarUsername =
                document.getElementById(
                    "topbarUsername"
                );

            if (topbarUsername) {
                topbarUsername.textContent =
                    username;
            }

            const sidebarUsername =
                document.getElementById(
                    "sidebarUsername"
                );

            if (sidebarUsername) {
                sidebarUsername.textContent =
                    username;
            }

            const displayUsername =
                document.getElementById(
                    "displayUsername"
                );

            if (displayUsername) {
                displayUsername.textContent =
                    `@${username}`;
            }

            const topbarAvatar =
                document.getElementById(
                    "topbarAvatar"
                );

            if (
                topbarAvatar &&
                !topbarAvatar.querySelector("img")
            ) {
                topbarAvatar.textContent =
                    initial;
            }

            const sidebarAvatar =
                document.getElementById(
                    "sidebarAvatar"
                );

            if (
                sidebarAvatar &&
                !sidebarAvatar.querySelector("img")
            ) {
                sidebarAvatar.textContent =
                    initial;
            }

            const profileAvatars =
                document.querySelectorAll(
                    ".profile-avatar"
                );

            profileAvatars.forEach(avatar => {
                if (
                    !avatar.querySelector("img") &&
                    avatar.id !== "sidebarAvatar"
                ) {
                    avatar.textContent =
                        initial;
                }
            });

            this.bindLogoutButtons();
        },

        // =====================================================
        // LOGOUT BUTTON BINDING
        // =====================================================

        bindLogoutButtons() {
            const logoutButtons =
                document.querySelectorAll(
                    "#logoutBtn, .logout-btn"
                );

            logoutButtons.forEach(button => {
                if (!button.dataset.authBound) {
                    button.dataset.authBound = "true";

                    button.addEventListener(
                        "click",
                        event => {
                            event.preventDefault();
                            Auth.confirmLogout();
                        }
                    );
                }
            });
        },

        // =====================================================
        // ADMIN STATE
        // =====================================================

        _adminFlag: false,

        // =====================================================
        // ADMIN ACCESS
        // =====================================================

        async fetchAdminAccess() {
            try {
                const response =
                    await this.authFetch(
                        "/api/admin/access"
                    );

                if (response && response.ok) {
                    const payload =
                        await response.json();

                    const requestSucceeded = !!(
                        payload &&
                        (payload.success === true || payload.succes === true)
                    );

                    const isAdmin = !!(
                        requestSucceeded &&
                        payload.data &&
                        payload.data.isAdmin
                    );

                    this._adminFlag =
                        isAdmin;

                    localStorage.setItem(
                        ADMIN_KEY,
                        isAdmin
                            ? "true"
                            : "false"
                    );

                    return isAdmin;
                }

                // Non-success response:
                // treat current frontend state as non-admin.
                this._adminFlag = false;

                localStorage.setItem(
                    ADMIN_KEY,
                    "false"
                );

                return false;
            } catch (error) {
                console.error(
                    "Admin access fetch error:",
                    error
                );

                this._adminFlag = false;

                localStorage.setItem(
                    ADMIN_KEY,
                    "false"
                );

                return false;
            }
        },

        isAdmin() {
            if (
                typeof this._adminFlag ===
                "boolean"
            ) {
                return this._adminFlag;
            }

            return (
                localStorage.getItem(
                    ADMIN_KEY
                ) === "true"
            );
        },

        clearAdmin() {
            localStorage.removeItem(
                ADMIN_KEY
            );

            this._adminFlag = false;
        },

        // =====================================================
        // ADMIN ROUTE GUARD
        // =====================================================

        requireAdmin() {
            if (!this.isAuthenticated()) {
                return this.requireAuth();
            }

            if (!this.isAdmin()) {
                const isInPagesDir =
                    window.location.pathname
                        .toLowerCase()
                        .includes("/pages/");

                const redirectPath =
                    isInPagesDir
                        ? "index.html"
                        : "Pages/index.html";

                window.location.href =
                    redirectPath;

                return false;
            }

            return true;
        },

        // =====================================================
        // ADMIN UI VISIBILITY
        // =====================================================

        applyAdminVisibility() {
            const isAdmin =
                this.isAdmin();

            const adminElements =
                document.querySelectorAll(
                    '[data-role="admin"]'
                );

            adminElements.forEach(element => {
                element.style.display =
                    isAdmin ? "" : "none";
            });
        }
    };

    // =========================================================
    // GLOBAL AUTH OBJECT
    // =========================================================

    window.Auth = Auth;

    // =========================================================
    // AUTH INITIALIZATION
    // =========================================================

    const initializeAuthUI = async () => {
        Auth.bindLogoutButtons();

        const currentPath =
            window.location.pathname.toLowerCase();

        const isAuthOrOnboardingPage =
            currentPath.includes("login.html") ||
            currentPath.includes("singup.html") ||
            currentPath.includes("register.html") ||
            currentPath.includes("epostadogrulama.html") ||
            currentPath.includes("konumbelirleme.html");

        // Kayıt ve onboarding sayfalarında arka planda yetki sorgusu yapıp 401 ile yönlendirme tetiklenmesini engelle
        if (isAuthOrOnboardingPage) {
            return;
        }

        if (!Auth.isAuthenticated()) {
            Auth.clearAdmin();
            Auth.applyAdminVisibility();
            return;
        }

        Auth.syncAuthUI();

        await Auth.fetchAdminAccess();

        Auth.applyAdminVisibility();
    };

    // =========================================================
    // DOM READY
    // =========================================================

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initializeAuthUI
        );
    } else {
        initializeAuthUI();
    }
})();
