// =========================================================
// FITNESS PRO - FRIENDS ENDPOINT INTEGRATION
// =========================================================
//
// Backend response yapısı (ApiResponseModel):
// {
//   success:          boolean,
//   message:          string,
//   data:             object | array | null,
//   rateLimited:      boolean,
//   remainingSeconds: number | null,
//   accountLocked:    boolean
// }
//
// Backend kararlari (frontend tarafindan uretilmez):
//   - JWT auth [Authorize] gerektirir
//   - Kendine istek gonderilemez
//   - Zaten arkadas olan birine tekrar istek gonderilemez
//   - Bekleyen istek varken yeni istek gonderilemez
//
// Frontend karar sirasi (sadece body alanlarina gore):
//   1) accountLocked === true -> kalici blok (logout zaten authFetch tarafindan tetiklenir)
//   2) rateLimited  === true -> gecici rate limit
//   3) success      === true -> basarili
//   4) diger                 -> normal hata (result.message)
// =========================================================

(function () {
    "use strict";

    const Auth = window.Auth;

    if (!Auth || typeof Auth.authFetch !== "function") {
        console.error(
            "[FriendsEndpoint] window.Auth bulunamadi. auth.js yuklendiginden emin olun."
        );
        return;
    }

    // ---------------------------------------------------------
    // YARDIMCI: response'u normalize et
    // ---------------------------------------------------------

    async function parseJson(response) {
        try {
            return await response.json();
        } catch (err) {
            console.error(
                "[FriendsEndpoint] JSON parse hatasi:",
                err
            );
            return null;
        }
    }

    /**
     * Backend cevabini UI'nin kullanacagi tekduze bir Result nesnesine cevirir.
     *
     * @returns {{
     *   ok: boolean,
     *   success: boolean,
     *   message: string,
     *   data: any,
     *   unauthorized: boolean,
     *   rateLimited: boolean,
     *   accountLocked: boolean,
     *   remainingSeconds: number
     * }}
     */
    function normalize(result, response) {
        const payload = result || {};

        const success = payload.success === true;
        const accountLocked = payload.accountLocked === true;
        const rateLimited = payload.rateLimited === true;
        const unauthorized =
            response && response.status === 401;

        const remainingSeconds =
            Number.isFinite(Number(payload.remainingSeconds)) &&
            Number(payload.remainingSeconds) > 0
                ? Math.ceil(Number(payload.remainingSeconds))
                : 0;

        const message =
            (typeof payload.message === "string" &&
                payload.message.trim()) ||
            (success
                ? "Islem basarili."
                : "Islem sirasinda bir hata olustu.");

        return {
            ok: response ? response.ok : success,
            success,
            message,
            data: payload.data !== undefined ? payload.data : null,
            unauthorized,
            rateLimited,
            accountLocked,
            remainingSeconds
        };
    }

    // ---------------------------------------------------------
    // YARDIMCI: HTTP metodu ortak isleyici
    // ---------------------------------------------------------

    async function request(method, path, body) {
        let response;
        try {
            const options = { method };

            if (body !== undefined && body !== null) {
                options.body =
                    typeof body === "string"
                        ? body
                        : JSON.stringify(body);
            }

            response = await Auth.authFetch(path, options);
        } catch (error) {
            console.error(
                "[FriendsEndpoint] Network hatasi:",
                error
            );
            return {
                ok: false,
                success: false,
                message:
                    "Sunucuya baglanilamadi. Lutfen backend servisinin calistigindan emin olunuz.",
                data: null,
                unauthorized: false,
                rateLimited: false,
                accountLocked: false,
                remainingSeconds: 0
            };
        }

        const result = await parseJson(response);
        return normalize(result, response);
    }

    // ---------------------------------------------------------
    // ENDPOINTS
    // ---------------------------------------------------------

    /**
     * Arkadaslik istegi gonder.
     * POST /api/friends/request/{receiverId}
     */
    async function sendRequest(receiverId) {
        if (
            receiverId === undefined ||
            receiverId === null ||
            receiverId === ""
        ) {
            return {
                ok: false,
                success: false,
                message: "Hedef kullanici belirtilmedi.",
                data: null,
                unauthorized: false,
                rateLimited: false,
                accountLocked: false,
                remainingSeconds: 0
            };
        }

        const safeId = encodeURIComponent(String(receiverId));
        return await request(
            "POST",
            `/api/friends/request/${safeId}`
        );
    }

    /**
     * Gelen arkadaslik isteklerini getir.
     * GET /api/friends/requests/incoming
     */
    async function getIncomingRequests() {
        return await request(
            "GET",
            "/api/friends/requests/incoming"
        );
    }

    /**
     * Gonderilen arkadaslik isteklerini getir.
     * GET /api/friends/requests/outgoing
     */
    async function getOutgoingRequests() {
        return await request(
            "GET",
            "/api/friends/requests/outgoing"
        );
    }

    /**
     * Arkadaslik istegini kabul et.
     * POST /api/friends/requests/{requestId}/accept
     */
    async function acceptRequest(requestId) {
        if (
            requestId === undefined ||
            requestId === null ||
            requestId === ""
        ) {
            return {
                ok: false,
                success: false,
                message: "Istek numarasi belirtilmedi.",
                data: null,
                unauthorized: false,
                rateLimited: false,
                accountLocked: false,
                remainingSeconds: 0
            };
        }

        const safeId = encodeURIComponent(String(requestId));
        return await request(
            "POST",
            `/api/friends/requests/${safeId}/accept`
        );
    }

    /**
     * Arkadaslik istegini reddet.
     * POST /api/friends/requests/{requestId}/reject
     */
    async function rejectRequest(requestId) {
        if (
            requestId === undefined ||
            requestId === null ||
            requestId === ""
        ) {
            return {
                ok: false,
                success: false,
                message: "Istek numarasi belirtilmedi.",
                data: null,
                unauthorized: false,
                rateLimited: false,
                accountLocked: false,
                remainingSeconds: 0
            };
        }

        const safeId = encodeURIComponent(String(requestId));
        return await request(
            "POST",
            `/api/friends/requests/${safeId}/reject`
        );
    }

    /**
     * Gonderilen arkadaslik istegini iptal et.
     * POST /api/friends/requests/{requestId}/cancel
     */
    async function cancelRequest(requestId) {
        if (
            requestId === undefined ||
            requestId === null ||
            requestId === ""
        ) {
            return {
                ok: false,
                success: false,
                message: "Istek numarasi belirtilmedi.",
                data: null,
                unauthorized: false,
                rateLimited: false,
                accountLocked: false,
                remainingSeconds: 0
            };
        }

        const safeId = encodeURIComponent(String(requestId));
        return await request(
            "POST",
            `/api/friends/requests/${safeId}/cancel`
        );
    }

    /**
     * Arkadas listesini getir.
     * GET /api/friends
     */
    async function getFriends() {
        return await request("GET", "/api/friends");
    }

    /**
     * Arkadasi sil.
     * DELETE /api/friends/{friendUserId}
     */
    async function removeFriend(friendUserId) {
        if (
            friendUserId === undefined ||
            friendUserId === null ||
            friendUserId === ""
        ) {
            return {
                ok: false,
                success: false,
                message: "Kullanici belirtilmedi.",
                data: null,
                unauthorized: false,
                rateLimited: false,
                accountLocked: false,
                remainingSeconds: 0
            };
        }

        const safeId = encodeURIComponent(String(friendUserId));
        return await request(
            "DELETE",
            `/api/friends/${safeId}`
        );
    }

    // ---------------------------------------------------------
    // GLOBAL EXPORT
    // ---------------------------------------------------------

    window.FriendsAPI = {
        sendRequest,
        getIncomingRequests,
        getOutgoingRequests,
        acceptRequest,
        rejectRequest,
        cancelRequest,
        getFriends,
        removeFriend
    };
})();
