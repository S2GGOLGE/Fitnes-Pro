// =========================================================
// FITNESS PRO - FRIENDS UI
// =========================================================
//
// Bu modul arkadaslik UI davranisini yonetir:
//   - Gelen arkadaslik isteklerini yukler ve render eder
//   - Arkadas listesini yukler ve render eder
//   - Kabul / Reddet / Sil aksiyonlarini yonetir
//   - Yeni istek gondermek icin GlobalModal kullanir
//
// Tum API cagirilari window.FriendsAPI uzerinden yapilir.
// Hata ve basari mesajlari mevcut GlobalModal sistemiyle gosterilir.
// Yeni bildirim / toast / modal mimarisi olusturmaz.
// =========================================================

(function () {
    "use strict";

    document.addEventListener("DOMContentLoaded", async () => {

        // ---------------------------------------------------------
        // AUTH KONTROLU
        // ---------------------------------------------------------

        if (
            window.Auth &&
            typeof window.Auth.requireAuth === "function"
        ) {
            if (!window.Auth.requireAuth()) {
                return;
            }
        }

        if (!window.FriendsAPI) {
            console.error(
                "[FriendsUI] window.FriendsAPI bulunamadi. FriendsEndpoint.js yuklendiginden emin olun."
            );
            return;
        }

        // ---------------------------------------------------------
        // DOM ELEMANLARI
        // ---------------------------------------------------------

        const friendsList = document.getElementById("friendsList");
        const friendsEmptyState =
            document.getElementById("friendsEmptyState");

        const requestsList =
            document.getElementById("requestsList");
        const requestsEmptyState =
            document.getElementById("requestsEmptyState");

        const friendsCount =
            document.getElementById("friendsCount");
        const requestsCount =
            document.getElementById("requestsCount");

        const refreshBtn =
            document.getElementById("refreshFriendsBtn");

        const sendRequestBtn =
            document.getElementById("sendRequestBtn");

        if (
            !friendsList ||
            !requestsList
        ) {
            return;
        }

        // ---------------------------------------------------------
        // YARDIMCI: Lucide ikonlarini render et
        // ---------------------------------------------------------

        function refreshIcons(root) {
            if (
                window.lucide &&
                typeof window.lucide.createIcons === "function"
            ) {
                try {
                    window.lucide.createIcons({
                        root: root || document
                    });
                } catch (err) {
                    console.error(
                        "[FriendsUI] Lucide render hatasi:",
                        err
                    );
                }
            }
        }

        // Lucide yuklenmesini bekle (erken render durumunda)
        function whenLucideReady(callback) {
            if (
                window.lucide &&
                typeof window.lucide.createIcons === "function"
            ) {
                callback();
                return;
            }

            let attempts = 0;
            const maxAttempts = 100;
            const interval = setInterval(() => {
                attempts += 1;
                if (
                    window.lucide &&
                    typeof window.lucide.createIcons === "function"
                ) {
                    clearInterval(interval);
                    callback();
                } else if (attempts >= maxAttempts) {
                    clearInterval(interval);
                }
            }, 50);
        }

        // ---------------------------------------------------------
        // YARDIMCI: Backend sonucunu degerlendir
        // ---------------------------------------------------------

        function showResult(result, successFallback) {
            const ok =
                result && (result.success === true || result.ok === true);

            if (
                window.GlobalModal &&
                typeof window.GlobalModal.alert === "function"
            ) {
                window.GlobalModal.alert({
                    type: ok ? "success" : "error",
                    title: ok ? "Basarili" : "Hata",
                    message:
                        (result && result.message) ||
                        (ok
                            ? successFallback || "Islem tamamlandi."
                            : "Islem sirasinda bir hata olustu.")
                });
                return;
            }

            // GlobalModal yoksa sessiz fallback
            console.log(
                "[FriendsUI]",
                ok ? "OK" : "FAIL",
                (result && result.message) || ""
            );
        }

        function showConfirm(options) {
            if (
                window.GlobalModal &&
                typeof window.GlobalModal.confirm === "function"
            ) {
                return window.GlobalModal.confirm(options);
            }
            // Fallback olarak tarayici onay diyalogu
            const confirmed = window.confirm(
                (options.description ||
                    options.title ||
                    "Emin misiniz?")
            );
            if (confirmed && typeof options.onConfirm === "function") {
                options.onConfirm();
            } else if (
                !confirmed &&
                typeof options.onCancel === "function"
            ) {
                options.onCancel();
            }
            return { close: () => {} };
        }

        // ---------------------------------------------------------
        // YARDIMCI: Butonu yukleme durumuna al
        // ---------------------------------------------------------

        function setButtonLoading(button, loading, loadingText) {
            if (!button) return;

            if (loading) {
                if (!button.dataset.originalHtml) {
                    button.dataset.originalHtml = button.innerHTML;
                }
                button.disabled = true;
                button.setAttribute("aria-busy", "true");
                button.innerHTML =
                    '<span class="btn-spinner" aria-hidden="true"></span>' +
                    (loadingText ||
                        button.dataset.loadingText ||
                        "Isleniyor...");
            } else {
                button.disabled = false;
                button.removeAttribute("aria-busy");
                if (button.dataset.originalHtml) {
                    button.innerHTML = button.dataset.originalHtml;
                    delete button.dataset.originalHtml;
                }
            }
        }

        // ---------------------------------------------------------
        // YARDIMCI: Tarih formatla
        // ---------------------------------------------------------

        function formatDate(value) {
            if (!value) return "";
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) return "";

            try {
                return date.toLocaleDateString("tr-TR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                });
            } catch {
                return date.toLocaleDateString();
            }
        }

        function escapeHtml(value) {
            const div = document.createElement("div");
            div.textContent = value == null ? "" : String(value);
            return div.innerHTML;
        }

        function initialsOf(name, surname, fallback) {
            const first =
                (name || "").trim().charAt(0).toUpperCase();
            const last =
                (surname || "").trim().charAt(0).toUpperCase();

            if (first && last) return first + last;
            if (first) return first;
            if (fallback) return String(fallback).charAt(0).toUpperCase();
            return "?";
        }

        // ---------------------------------------------------------
        // RENDER: Gelen arkadaslik istekleri
        // ---------------------------------------------------------

        function renderRequests(requests) {
            requestsList.innerHTML = "";

            if (!Array.isArray(requests) || requests.length === 0) {
                if (requestsEmptyState) {
                    requestsEmptyState.style.display = "flex";
                }
                if (requestsCount) {
                    requestsCount.textContent = "0";
                }
                return;
            }

            if (requestsEmptyState) {
                requestsEmptyState.style.display = "none";
            }

            if (requestsCount) {
                requestsCount.textContent = String(requests.length);
            }

            const fragment = document.createDocumentFragment();

            requests.forEach(req => {
                const item = document.createElement("article");
                item.className = "friend-request-card";
                item.dataset.requestId = String(req.Id);

                const senderUsername =
                    req.SenderUsername || "";
                const senderName = req.SenderName || "";
                const senderSurname = req.SenderSurname || "";
                const senderInitial = initialsOf(
                    senderName,
                    senderSurname,
                    senderUsername
                );
                const senderFullName =
                    [senderName, senderSurname]
                        .filter(Boolean)
                        .join(" ") || senderUsername;

                const handle = senderUsername
                    ? "@" + escapeHtml(senderUsername)
                    : "";

                item.innerHTML =
                    '<div class="friend-request-avatar">' +
                    escapeHtml(senderInitial) +
                    "</div>" +
                    '<div class="friend-request-body">' +
                    '<strong class="friend-request-name">' +
                    escapeHtml(senderFullName) +
                    "</strong>" +
                    (handle
                        ? '<span class="friend-request-handle">' +
                          handle +
                          "</span>"
                        : "") +
                    '<span class="friend-request-meta">' +
                    "Arkadaslik istegi" +
                    (req.CreatedAt
                        ? " &middot; " + escapeHtml(formatDate(req.CreatedAt))
                        : "") +
                    "</span>" +
                    "</div>" +
                    '<div class="friend-request-actions">' +
                    '<button type="button" class="btn btn-primary btn-sm" data-action="accept" data-request-id="' +
                    escapeHtml(String(req.Id)) +
                    '">' +
                    '<i data-lucide="check"></i> Kabul Et' +
                    "</button>" +
                    '<button type="button" class="btn btn-outline btn-sm" data-action="reject" data-request-id="' +
                    escapeHtml(String(req.Id)) +
                    '">' +
                    '<i data-lucide="x"></i> Reddet' +
                    "</button>" +
                    "</div>";

                fragment.appendChild(item);
            });

            requestsList.appendChild(fragment);
            refreshIcons(requestsList);
        }

        // ---------------------------------------------------------
        // RENDER: Arkadas listesi
        // ---------------------------------------------------------

        function renderFriends(friends) {
            friendsList.innerHTML = "";

            if (!Array.isArray(friends) || friends.length === 0) {
                if (friendsEmptyState) {
                    friendsEmptyState.style.display = "flex";
                }
                if (friendsCount) {
                    friendsCount.textContent = "0";
                }
                return;
            }

            if (friendsEmptyState) {
                friendsEmptyState.style.display = "none";
            }

            if (friendsCount) {
                friendsCount.textContent = String(friends.length);
            }

            const fragment = document.createDocumentFragment();

            friends.forEach(friend => {
                const item = document.createElement("article");
                item.className = "friend-card";
                item.dataset.friendId =
                    String(friend.FriendUserId);

                const username = friend.Username || "";
                const name = friend.Name || "";
                const surname = friend.Surname || "";
                const initial = initialsOf(
                    name,
                    surname,
                    username
                );
                const fullName =
                    [name, surname].filter(Boolean).join(" ") ||
                    username;

                const handle = username
                    ? "@" + escapeHtml(username)
                    : "";

                item.innerHTML =
                    '<div class="friend-avatar">' +
                    escapeHtml(initial) +
                    "</div>" +
                    '<div class="friend-body">' +
                    '<strong class="friend-name">' +
                    escapeHtml(fullName) +
                    "</strong>" +
                    (handle
                        ? '<span class="friend-handle">' +
                          handle +
                          "</span>"
                        : "") +
                    '<span class="friend-meta">' +
                    "Arkadaslik tarihi" +
                    (friend.CreatedAt
                        ? " &middot; " + escapeHtml(formatDate(friend.CreatedAt))
                        : "") +
                    "</span>" +
                    "</div>" +
                    '<div class="friend-actions">' +
                    '<button type="button" class="btn btn-outline btn-sm" data-action="remove" data-friend-id="' +
                    escapeHtml(String(friend.FriendUserId)) +
                    '" data-friend-name="' +
                    escapeHtml(fullName) +
                    '">' +
                    '<i data-lucide="user-minus"></i> Arkadasligi Kaldir' +
                    "</button>" +
                    "</div>";

                fragment.appendChild(item);
            });

            friendsList.appendChild(fragment);
            refreshIcons(friendsList);
        }

        // ---------------------------------------------------------
        // YUKLEME
        // ---------------------------------------------------------

        let isLoading = false;

        async function loadAll() {
            if (isLoading) return;
            isLoading = true;

            if (refreshBtn) {
                setButtonLoading(
                    refreshBtn,
                    true,
                    "Yenileniyor..."
                );
            }

            try {
                // Paralel olarak iki API cagir
                const [friendsResult, requestsResult] =
                    await Promise.all([
                        window.FriendsAPI.getFriends(),
                        window.FriendsAPI.getIncomingRequests()
                    ]);

                if (
                    friendsResult &&
                    friendsResult.unauthorized
                ) {
                    return;
                }
                if (
                    requestsResult &&
                    requestsResult.unauthorized
                ) {
                    return;
                }

                const friends =
                    friendsResult && friendsResult.success
                        ? extractList(friendsResult.data)
                        : [];
                const requests =
                    requestsResult && requestsResult.success
                        ? extractList(requestsResult.data)
                        : [];

                renderFriends(friends);
                renderRequests(requests);

                if (
                    friendsResult &&
                    !friendsResult.success &&
                    !friendsResult.unauthorized
                ) {
                    // Sessiz: UI zaten bos duruma dusuyor
                    console.warn(
                        "[FriendsUI] Arkadas listesi alinamadi:",
                        friendsResult.message
                    );
                }

                if (
                    requestsResult &&
                    !requestsResult.success &&
                    !requestsResult.unauthorized
                ) {
                    console.warn(
                        "[FriendsUI] Istek listesi alinamadi:",
                        requestsResult.message
                    );
                }
            } catch (error) {
                console.error(
                    "[FriendsUI] Yukleme hatasi:",
                    error
                );
            } finally {
                isLoading = false;
                if (refreshBtn) {
                    setButtonLoading(refreshBtn, false);
                }
                refreshIcons();
            }
        }

        /**
         * Backend data alaninin icindeki liste benzeri veriyi duzgun sekilde cikar.
         * Bazi endpoint'ler dogrudan dizi, bazilari ise { items: [...] } donebilir.
         */
        function extractList(data) {
            if (Array.isArray(data)) return data;
            if (data && Array.isArray(data.items)) return data.items;
            if (data && Array.isArray(data.requests)) return data.requests;
            if (data && Array.isArray(data.friends)) return data.friends;
            return [];
        }

        // ---------------------------------------------------------
        // EVENT: Kabul Et / Reddet (event delegation)
        // ---------------------------------------------------------

        requestsList.addEventListener("click", async event => {
            const acceptBtn = event.target.closest(
                'button[data-action="accept"]'
            );
            if (acceptBtn) {
                const requestId = acceptBtn.dataset.requestId;
                await handleAccept(requestId, acceptBtn);
                return;
            }

            const rejectBtn = event.target.closest(
                'button[data-action="reject"]'
            );
            if (rejectBtn) {
                const requestId = rejectBtn.dataset.requestId;
                await handleReject(requestId, rejectBtn);
            }
        });

        async function handleAccept(requestId, button) {
            if (!requestId) return;
            setButtonLoading(button, true, "Kabul ediliyor...");

            const result =
                await window.FriendsAPI.acceptRequest(requestId);

            setButtonLoading(button, false);
            showResult(
                result,
                "Arkadaslik istegi kabul edildi."
            );

            if (result && result.success) {
                // Listeyi yenile ki arkadas listesine dusmus olsun
                await loadAll();
            }
        }

        async function handleReject(requestId, button) {
            if (!requestId) return;
            setButtonLoading(button, true, "Reddediliyor...");

            const result =
                await window.FriendsAPI.rejectRequest(requestId);

            setButtonLoading(button, false);
            showResult(
                result,
                "Arkadaslik istegi reddedildi."
            );

            if (result && result.success) {
                // Listeyi yenile
                await loadAll();
            }
        }

        // ---------------------------------------------------------
        // EVENT: Arkadasi Sil (event delegation)
        // ---------------------------------------------------------

        friendsList.addEventListener("click", async event => {
            const removeBtn = event.target.closest(
                'button[data-action="remove"]'
            );
            if (removeBtn) {
                const friendId = removeBtn.dataset.friendId;
                const friendName =
                    removeBtn.dataset.friendName || "bu kullaniciyi";

                showConfirm({
                    title: "Arkadasi Kaldir",
                    description:
                        friendName +
                        " arkadas listenizden kaldirilacak. Bu islemi gerceklestirmek istediginize emin misiniz?",
                    type: "delete",
                    buttons: [
                        {
                            text: "Iptal",
                            variant: "secondary"
                        },
                        {
                            text: "Arkadasi Kaldir",
                            variant: "danger",
                            callback: async () => {
                                await handleRemove(
                                    friendId,
                                    removeBtn
                                );
                            }
                        }
                    ]
                });
            }
        });

        async function handleRemove(friendId, button) {
            if (!friendId) return;
            setButtonLoading(button, true, "Kaldiriliyor...");

            const result =
                await window.FriendsAPI.removeFriend(friendId);

            setButtonLoading(button, false);

            if (result && result.success) {
                // Listeyi yenile
                await loadAll();
            }

            showResult(
                result,
                "Arkadas basariyla kaldirildi."
            );
        }

        // ---------------------------------------------------------
        // EVENT: Yenile butonu
        // ---------------------------------------------------------

        if (refreshBtn) {
            refreshBtn.addEventListener("click", () => {
                loadAll();
            });
        }

        // ---------------------------------------------------------
        // EVENT: Yeni istek gonder (modal ile)
        // ---------------------------------------------------------

        if (sendRequestBtn) {
            sendRequestBtn.addEventListener("click", () => {
                openSendRequestModal();
            });
        }

        function openSendRequestModal() {
            if (
                !window.GlobalModal ||
                typeof window.GlobalModal.open !== "function"
            ) {
                // Fallback: basit bir prompt
                const receiverId = window.prompt(
                    "Arkadaslik istegi gondermek istediginiz kullanici ID:"
                );
                if (receiverId) {
                    handleSendRequest(receiverId);
                }
                return;
            }

            const body = document.createElement("div");
            body.className = "send-request-modal-body";
            body.innerHTML =
                '<label for="sendRequestUserId" class="send-request-label">' +
                "Hedef Kullanici ID" +
                "</label>" +
                '<input type="number" min="1" id="sendRequestUserId" ' +
                'class="send-request-input" placeholder="Orn: 42" />' +
                '<p class="send-request-hint" id="sendRequestHint"></p>';

            const modal = window.GlobalModal.open({
                type: "info",
                title: "Arkadaslik Istegi Gonder",
                description:
                    "Arkadaslik istegi gondermek istediginiz kullanicinin ID numarasini girin.",
                content: body,
                size: "default",
                buttons: [
                    {
                        text: "Iptal",
                        variant: "secondary"
                    },
                    {
                        text: "Gonder",
                        variant: "primary",
                        callback: async ({ close }) => {
                            const input = document.getElementById(
                                "sendRequestUserId"
                            );
                            const hint = document.getElementById(
                                "sendRequestHint"
                            );
                            const value = input
                                ? input.value.trim()
                                : "";

                            if (!value) {
                                if (hint) {
                                    hint.textContent =
                                        "Lutfen bir kullanici ID girin.";
                                    hint.classList.add(
                                        "send-request-hint-error"
                                    );
                                }
                                return false;
                            }

                            const numericId = Number(value);
                            if (
                                !Number.isInteger(numericId) ||
                                numericId <= 0
                            ) {
                                if (hint) {
                                    hint.textContent =
                                        "Gecerli bir kullanici ID girin.";
                                    hint.classList.add(
                                        "send-request-hint-error"
                                    );
                                }
                                return false;
                            }

                            await handleSendRequest(numericId, close);
                        }
                    }
                ]
            });

            // Ilk odagi input'a al
            setTimeout(() => {
                const input = document.getElementById(
                    "sendRequestUserId"
                );
                if (input) input.focus();
            }, 80);
        }

        async function handleSendRequest(receiverId, modalClose) {
            const result =
                await window.FriendsAPI.sendRequest(receiverId);

            showResult(
                result,
                "Arkadaslik istegi basariyla gonderildi."
            );

            if (result && result.success) {
                if (typeof modalClose === "function") {
                    modalClose("success");
                }
            }
        }

        // ---------------------------------------------------------
        // BASLANGIC
        // ---------------------------------------------------------

        whenLucideReady(() => {
            loadAll();
        });
    });
})();
