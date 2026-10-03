// =========================================================
// FITNESS PRO - MESSAGE REQUESTS ENDPOINT INTEGRATION
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
// Bu modül backend'deki /api/message-requests endpointlerini
// sarar. Tüm istekler JWT ile çalışır; window.Auth.authFetch
// üzerinden gider.
// =========================================================

(function () {
    "use strict";

    const Auth = window.Auth;

    if (!Auth || typeof Auth.authFetch !== "function") {
        console.error(
            "[MessageRequestEndpoint] window.Auth bulunamadi. auth.js yuklendiginden emin olun."
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
                "[MessageRequestEndpoint] JSON parse hatasi:",
                err
            );
            return null;
        }
    }

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
                "[MessageRequestEndpoint] Network hatasi:",
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
     * Mesaj isteği gönder.
     * POST /api/message-requests
     * body: { receiverId: int }
     *
     * Backend (bool success, string message, int? requestId)
     * döner. Normalize edilmiş Result.data = { requestId }.
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

        return await request(
            "POST",
            "/api/message-requests",
            { receiverId: Number(receiverId) }
        );
    }

    /**
     * Gelen mesaj isteklerini getir.
     * GET /api/message-requests/incoming
     */
    async function getIncomingRequests() {
        return await request(
            "GET",
            "/api/message-requests/incoming"
        );
    }

    /**
     * Gönderilen mesaj isteklerini getir.
     * GET /api/message-requests/outgoing
     */
    async function getOutgoingRequests() {
        return await request(
            "GET",
            "/api/message-requests/outgoing"
        );
    }

    /**
     * Mesaj isteğini kabul et.
     * POST /api/message-requests/{requestId}/accept
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
            `/api/message-requests/${safeId}/accept`
        );
    }

    /**
     * Mesaj isteğini reddet.
     * POST /api/message-requests/{requestId}/reject
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
            `/api/message-requests/${safeId}/reject`
        );
    }

    /**
     * Kabul edilmiş mesajlaşma kişilerini getir.
     * GET /api/message-requests/accted-message
     *
     * Backend (bool success, string message, List<AcceptedMessageContactDto>)
     * döner. Her DTO: { UserId, UserName, RequestId }.
     * Normalize edilmiş Result.data bir dizi kontak objesidir.
     */
    async function getAcceptedContacts() {
        return await request(
            "GET",
            "/api/message-requests/accted-message"
        );
    }

    /**
     * Gönderilen mesaj isteğini iptal et.
     * DELETE /api/message-requests/{requestId}
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
            "DELETE",
            `/api/message-requests/${safeId}`
        );
    }

    // ---------------------------------------------------------
    // GLOBAL EXPORT
    // ---------------------------------------------------------

    window.MessageRequestsAPI = {
        sendRequest,
        getIncomingRequests,
        getOutgoingRequests,
        getAcceptedContacts,
        acceptRequest,
        rejectRequest,
        cancelRequest
    };
})();