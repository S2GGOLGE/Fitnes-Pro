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

    const Auth = {
        // Base API URL
        getBaseUrl() {
            return window.API_BASE_URL || "http://localhost:8081";
        },

        // Save token and user object
        saveSession(token, user = null) {
            if (!token) return;
            localStorage.setItem(TOKEN_KEY, token);

            if (user) {
                localStorage.setItem(USER_KEY, JSON.stringify(user));
            } else {
                const decoded = this.parseJwt(token);
                if (decoded) {
                    const extractedUser = {
                        userId: decoded.sub || decoded.nameid,
                        username: decoded.unique_name || decoded.name || "Kullanıcı",
                        role: decoded.role || "User"
                    };
                    localStorage.setItem(USER_KEY, JSON.stringify(extractedUser));
                }
            }
        },

        // Get stored JWT token
        getToken() {
            const token = localStorage.getItem(TOKEN_KEY);
            if (!token) return null;

            if (this.isTokenExpired(token)) {
                this.clearSession();
                return null;
            }
            return token;
        },

        // Get stored user information
        getUser() {
            const userStr = localStorage.getItem(USER_KEY);
            if (userStr) {
                try {
                    return JSON.parse(userStr);
                } catch {
                    // ignore JSON parse error
                }
            }

            const token = this.getToken();
            if (token) {
                const decoded = this.parseJwt(token);
                if (decoded) {
                    return {
                        userId: decoded.sub || decoded.nameid,
                        username: decoded.unique_name || decoded.name || "Kullanıcı",
                        role: decoded.role || "User"
                    };
                }
            }
            return null;
        },

        // Clear local storage auth keys
        clearSession() {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
        },

        // Decode JWT token payload
        parseJwt(token) {
            try {
                if (!token) return null;
                const parts = token.split('.');
                if (parts.length < 2) return null;
                const base64Url = parts[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(
                    atob(base64)
                        .split('')
                        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                        .join('')
                );

                return JSON.parse(jsonPayload);
            } catch (err) {
                console.error("JWT Decode Error:", err);
                return null;
            }
        },

        // Check if token is expired
        isTokenExpired(token) {
            const decoded = this.parseJwt(token);
            if (!decoded || !decoded.exp) return false;

            const currentTime = Math.floor(Date.now() / 1000);
            return decoded.exp < currentTime;
        },

        // Check if user is logged in with valid token
        isAuthenticated() {
            return !!this.getToken();
        },

        // Logout and redirect to login page
        logout(redirect = true) {
            this.clearSession();
            if (redirect) {
                const isInPagesDir = window.location.pathname.toLowerCase().includes("/pages/");
                const loginPath = isInPagesDir ? "Login.html" : "Pages/Login.html";
                window.location.href = loginPath;
            }
        },

        // Route Guard: Require authentication for protected pages
        requireAuth() {
            if (!this.isAuthenticated()) {
                const isInPagesDir = window.location.pathname.toLowerCase().includes("/pages/");
                const loginPath = isInPagesDir ? "Login.html" : "Pages/Login.html";
                window.location.href = loginPath;
                return false;
            }
            return true;
        },

        // Route Guard: Redirect already authenticated user to index/dashboard
        redirectIfLoggedIn() {
            if (this.isAuthenticated()) {
                const isInPagesDir = window.location.pathname.toLowerCase().includes("/pages/");
                const indexPath = isInPagesDir ? "index.html" : "Pages/index.html";
                window.location.href = indexPath;
                return true;
            }
            return false;
        },

        // Authenticated Fetch wrapper with automatic Bearer token injection
        async authFetch(url, options = {}) {
            const token = this.getToken();

            // Set up headers
            const headers = {
                "Accept": "application/json",
                ...(options.headers || {})
            };

            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }

            // Default content-type for objects if not set
            if (options.body && typeof options.body === "string" && !headers["Content-Type"]) {
                headers["Content-Type"] = "application/json";
            }

            const fetchOptions = {
                ...options,
                headers
            };

            // Full URL resolution
            const fullUrl = url.startsWith("http") ? url : `${this.getBaseUrl()}${url.startsWith("/") ? "" : "/"}${url}`;

            try {
                const response = await fetch(fullUrl, fetchOptions);

                // Handle 401 Unauthorized globally
                if (response.status === 401) {
                    console.warn("Unauthorized request (401). Token may be expired.");
                    this.logout(true);
                    return response;
                }

                return response;
            } catch (error) {
                console.error("AuthFetch Network Error:", error);
                throw error;
            }
        },

        // Verify current token with backend endpoint
        async verifyToken() {
            try {
                const response = await this.authFetch("/api/auth/me");
                if (response && response.ok) {
                    const result = await response.json();
                    if (result && result.success && result.data) {
                        this.saveSession(this.getToken(), result.data);
                        return result.data;
                    }
                }
                return null;
            } catch {
                return null;
            }
        },

        // Sync User Info in DOM UI (Avatar, Usernames, Logout buttons)
        syncAuthUI() {
            const user = this.getUser();
            if (!user) return;

            const username = user.username || "Kullanıcı";
            const initial = username.charAt(0).toUpperCase();

            // Update Topbar and Sidebar Usernames
            const topbarUsername = document.getElementById("topbarUsername");
            if (topbarUsername) topbarUsername.textContent = username;

            const sidebarUsername = document.getElementById("sidebarUsername");
            if (sidebarUsername) sidebarUsername.textContent = username;

            const displayUsername = document.getElementById("displayUsername");
            if (displayUsername) displayUsername.textContent = `@${username}`;

            // Update Avatars
            const topbarAvatar = document.getElementById("topbarAvatar");
            if (topbarAvatar && !topbarAvatar.querySelector("img")) topbarAvatar.textContent = initial;

            const sidebarAvatar = document.getElementById("sidebarAvatar");
            if (sidebarAvatar && !sidebarAvatar.querySelector("img")) sidebarAvatar.textContent = initial;

            const profileAvatars = document.querySelectorAll(".profile-avatar");
            profileAvatars.forEach(av => {
                if (!av.querySelector("img") && av.id !== "sidebarAvatar") {
                    av.textContent = initial;
                }
            });

            // Wire up all logout buttons
            const logoutBtns = document.querySelectorAll("#logoutBtn, .logout-btn");
            logoutBtns.forEach(btn => {
                if (!btn.dataset.authBound) {
                    btn.dataset.authBound = "true";
                    btn.addEventListener("click", (e) => {
                        e.preventDefault();
                        const confirmed = confirm("Çıkış yapmak istediğinize emin misiniz?");
                        if (confirmed) {
                            Auth.logout(true);
                        }
                    });
                }
            });
        }
    };

    // Attach to global window object
    window.Auth = Auth;

    // Automatic UI sync when DOM is ready
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            if (Auth.isAuthenticated()) {
                Auth.syncAuthUI();
            }
        });
    } else {
        if (Auth.isAuthenticated()) {
            Auth.syncAuthUI();
        }
    }
})();
