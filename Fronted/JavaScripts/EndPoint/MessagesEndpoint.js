// =========================================================
// FITNESS PRO - MESSAGES ENDPOINT INTEGRATION
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
// Bu modül backend'deki /api/messages endpointlerini sarar.
// Tüm istekler JWT ile çalışır; window.Auth.authFetch
// üzerinden gider.
//
// KAPSAM:
//   - Sohbet okuma    : GET  /api/messages/{otherUserId}
//   - Mesaj gönderme  : POST /api/messages
//
// Mesaj gönderme body alanları (backend SendMessageDto):
//   // ReceviverId  (int, Range[1, int.MaxValue])   — alıcı kullanıcı Id
//   // MessageType  (string)                         — "Text" | "Image" | "Fıle"
//   // Content      (string, max 10000 karakter)     — mesaj içeriği
//
// ÖNEMLİ: Backend DTO alanı "ReceviverId" olarak tanımlı (typo).
// Bu nedenle frontend de JSON body içinde aynı yazımı kullanmalıdır;
// ASP.NET Core'un JSON model binding'i büyük-küçük harf duyarsız
// olsa da C# property adı birebir eşleşmelidir.
//
// Henüz bağlanmayan endpoint'ler (backend bug'ları nedeniyle):
//   - PATCH /api/messages/{messageId}/read   (parametre çakışması → 500)
//   - DELETE /api/messages/{messageId}       (kapsam dışı)
// =========================================================

(function () {
    "use strict";

    const Auth = window.Auth;

    if (!Auth || typeof Auth.authFetch !== "function") {
        console.error(
            "[MessagesEndpoint] window.Auth bulunamadi. auth.js yuklendiginden emin olun."
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
                "[MessagesEndpoint] JSON parse hatasi:",
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
                "[MessagesEndpoint] Network hatasi:",
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
     * İki kullanıcı arasındaki konuşma geçmişini getir.
     * GET /api/messages/{otherUserId}
     *
     * Backend MessageService.GetConversationAsync çağrısının
     * sonucunu ApiResponseModel formatında döner. Normalize
     * edilmiş Result.data bir mesaj dizisidir; her mesaj
     * { Id, SenderId, ReceiverId, Content, MessageType, IsRead,
     *   ReadAt, CreatedAt } alanlarını içerir.
     */
    async function getConversation(otherUserId) {
        if (
            otherUserId === undefined ||
            otherUserId === null ||
            otherUserId === ""
        ) {
            return {
                ok: false,
                success: false,
                message: "Gorusme kisi belirtilmedi.",
                data: null,
                unauthorized: false,
                rateLimited: false,
                accountLocked: false,
                remainingSeconds: 0
            };
        }

        const safeId = encodeURIComponent(String(otherUserId));
        return await request(
            "GET",
            `/api/messages/${safeId}`
        );
    }

    // ---------------------------------------------------------
    // YARDIMCI: önceden oluşturulmuş standart hata yanıtı
    // ---------------------------------------------------------

    function clientError(message) {
        return {
            ok: false,
            success: false,
            message,
            data: null,
            unauthorized: false,
            rateLimited: false,
            accountLocked: false,
            remainingSeconds: 0
        };
    }

    // ---------------------------------------------------------
    // MESAJ GÖNDERME
    // ---------------------------------------------------------

    /**
     * Mesaj gönderir.
     * POST /api/messages
     *
     * Backend başarılı olduğunda data içinde mesaj nesnesini
     * döner:
     *   {
     *     messageId:    number,
     *     senderId:     number,
     *     receiverId:   number,
     *     content:      string,
     *     messageType:  "Text" | "Image" | "Fıle",
     *     createdAt:    ISO 8601 string
     *   }
     *
     * NOT: API'nin döndürdüğü `message` alanı şu an backend
     * tarafında "Mesaj Gönderilemedi" gibi yanlış değerler
     * içerebilir; bu durumda frontend `success === true` bayrağına
     * güvenerek karar verir.
     */
    async function sendMessage({ receiverId, messageType, content }) {
        const receiverNum = Number(receiverId);
        if (
            receiverId === undefined ||
            receiverId === null ||
            receiverId === "" ||
            !Number.isFinite(receiverNum) ||
            receiverNum <= 0
        ) {
            return clientError("Alici kullanici belirtilmedi.");
        }

        const safeType = String(messageType || "").trim();
        if (!["Text", "Image", "Fıle"].includes(safeType)) {
            return clientError(
                "Gecersiz mesaj tipi. Kabul edilenler: Text, Image, File."
            );
        }

        const text = String(content == null ? "" : content);
        if (text.trim().length === 0) {
            return clientError("Mesaj icerigi bos olamaz.");
        }

        if (text.length > 10000) {
            return clientError(
                "Mesaj 10000 karakterden uzun olamaz."
            );
        }

        // Backend DTO alan adı "ReceviverId" (typo) — JSON'da
        // birebir bu isimle gönderilmelidir.
        const body = {
            receviverId: receiverNum,
            messageType: safeType,
            content: text
        };

        return await request("POST", "/api/messages", body);
    }

    // ---------------------------------------------------------
    // GLOBAL EXPORT
    // ---------------------------------------------------------

    window.MessagesAPI = {
        getConversation,
        sendMessage
    };
})();