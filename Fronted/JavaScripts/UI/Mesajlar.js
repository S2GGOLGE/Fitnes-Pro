/**
 * ==========================================================================
 * FITNESS PRO - MESAJLAR PANELİ KONTROL VE ETKİLEŞİM YÖNETİCİSİ
 *
 * Mesaj istekleri ve arkadaşlık akışı backend API ile çalışır:
 *   - Gelen mesaj istekleri   : window.MessageRequestsAPI.getIncomingRequests
 *   - Gönderilen istekler     : window.MessageRequestsAPI.getOutgoingRequests
 *   - Kabul / Reddet / iptal  : window.MessageRequestsAPI.accept|reject|cancel
 *   - Yeni istek gönder       : window.MessageRequestsAPI.sendRequest
 *
 * Sohbet (chat) ekranı:
 *   - Kabul edilen kişiler    : window.MessageRequestsAPI.getAcceptedContacts
 *   - Konuşma geçmişi         : window.MessagesAPI.getConversation
 *     (GET /api/messages/{otherUserId})
 *   - Mesaj gönderme / okundu işaretleme / silme endpoint'leri
 *     backend'de henüz hazır/çalışır durumda olmadığı için sadece
 *     sohbet okuma (konuşma geçmişi) gerçek API ile çalışır.
 *     Gönderme butonu placeholder mesajı gösterir; silme işlemi
 *     sadece lokal state'ten kaldırır.
 *
 * Yeni mesaj isteği gönderirken alıcı seçimi:
 *   - window.FriendsAPI.getFriends() ile arkadaş listesi çekilir
 *   - Liste modal içinde kullanıcıya sunulur
 *   - Seçilen arkadaşa sendRequest(friendId) çağrılır
 *
 * Raporlar/Tasarım/Mesajlar (1.png, 2.png, 3.png) kuralları korunur:
 * 1 Nolu: bağlantı istekleri tek akışta incelenir
 * 2 Nolu: istekler tablo halinde, sağda Onay/Red
 * 3 Nolu: sohbet sidebar + içerik akışı
 * ==========================================================================
 */

(function () {
    "use strict";

    // -----------------------------------------------------------
    // UYGULAMA DURUMU
    // -----------------------------------------------------------
    const state = {
        currentView: "overview", // "overview" | "requests" | "outgoing" | "chat"
        currentUser: null,
        activeChatPartnerId: null,
        loading: false,

        // Backend'den doldurulur
        requests: [],          // gelen (incoming) mesaj istekleri
        outgoingRequests: [],       // giden (outgoing) mesaj istekleri
        activeChatFilter: "incoming", // "incoming" | "outgoing"

        // Sohbetler listesi
        chats: [],

        // Sohbet (konuşma) yükleme durumu
        // partnerId -> { status: "idle"|"loading"|"ready"|"error", error?: string }
        chatConversations: {},

        // Mesaj gönderme kilidi (çift tıklama / hızlı submit koruması)
        sendingMessage: false
    };

    // -----------------------------------------------------------
    // DOM ELEMENTLERİ
    // -----------------------------------------------------------
    const dom = {
        msgSidebar: document.getElementById("msgSidebar"),
        msgSidebarOverlay: document.getElementById("msgSidebarOverlay"),
        msgSidebarClose: document.getElementById("msgSidebarClose"),
        msgMenuToggle: document.getElementById("msgMenuToggle"),
        sidebarUsername: document.getElementById("sidebarUsername"),

        msgNavGroup: document.getElementById("msgNavGroup"),
        msgBackBtn: document.getElementById("msgBackBtn"),

        breadcrumbCurrent: document.getElementById("breadcrumbCurrent"),
        bcHomeBtn: document.getElementById("bcHomeBtn"),
        msgHeaderTitle: document.getElementById("msgHeaderTitle"),
        msgHeaderSubtitle: document.getElementById("msgHeaderSubtitle"),

        viewOverview: document.getElementById("viewOverview"),
        viewRequests: document.getElementById("viewRequests"),
        viewChat: document.getElementById("viewChat"),

        statPendingCount: document.getElementById("statPendingCount"),
        statChatsCount: document.getElementById("statChatsCount"),
        statOutgoingCount: document.getElementById("statOutgoingCount"),
        cardGoToRequests: document.getElementById("cardGoToRequests"),
        cardGoToChats: document.getElementById("cardGoToChats"),
        cardGoToFindFriends: document.getElementById("cardGoToFindFriends"),
        bannerOpenRequestsBtn: document.getElementById("bannerOpenRequestsBtn"),
        bannerOpenRequestsLink: document.getElementById("bannerOpenRequestsLink"),
        bannerOpenComposeBtn: document.getElementById("bannerOpenComposeBtn"),
        toolbarOpenComposeBtn: document.getElementById("toolbarOpenComposeBtn"),
        btnOpenComposeModal: document.getElementById("btnOpenComposeModal"),

        // İstekler tablosu
        requestsTableBody: document.getElementById("requestsTableBody"),
        requestsEmptyState: document.getElementById("requestsEmptyState"),
        requestSearchInput: document.getElementById("requestSearchInput"),
        requestCountBadge: document.getElementById("requestCountBadge"),
        requestsTabs: document.getElementById("requestsTabs"),

        // Sohbet
        activeChatAvatar: document.getElementById("activeChatAvatar"),
        activeChatName: document.getElementById("activeChatName"),
        activeChatStatusText: document.getElementById("activeChatStatusText"),
        btnChatMenuToggle: document.getElementById("btnChatMenuToggle"),
        chatDropdownMenu: document.getElementById("chatDropdownMenu"),
        btnClearChatHistory: document.getElementById("btnClearChatHistory"),
        btnDeleteConversation: document.getElementById("btnDeleteConversation"),
        chatMessagesArea: document.getElementById("chatMessagesArea"),
        chatMessageForm: document.getElementById("chatMessageForm"),
        chatInputText: document.getElementById("chatInputText")
    };

    // -----------------------------------------------------------
    // YARDIMCILAR
    // -----------------------------------------------------------

    function escapeHtml(str) {
        if (str === null || str === undefined) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function formatDate(value) {
        if (!value) return "";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";
        try {
            return date.toLocaleString("tr-TR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            });
        } catch {
            return date.toLocaleString();
        }
    }

    function showToast(message, type) {
        if (window.GlobalModal && typeof window.GlobalModal.alert === "function") {
            const safeType = ["success", "error", "warning", "info"].includes(type) ? type : "info";
            const title = safeType === "success" ? "Başarılı"
                : safeType === "error" ? "Hata"
                    : safeType === "warning" ? "Uyarı" : "Bilgi";
            window.GlobalModal.alert({
                type: safeType,
                title,
                message: message || "İşlem tamamlandı."
            });
            return;
        }
        // Fallback
        if (type === "error") {
            console.error("[Mesajlar]", message);
        } else {
            console.log("[Mesajlar]", message);
        }
    }

    function showConfirm(options) {
        if (window.GlobalModal && typeof window.GlobalModal.confirm === "function") {
            return window.GlobalModal.confirm(options);
        }
        const ok = window.confirm(options.description || options.title || "Emin misiniz?");
        if (ok && typeof options.onConfirm === "function") options.onConfirm();
        return { close: () => { } };
    }

    function initials(name, surname, fallback) {
        const a = (name || "").trim().charAt(0).toUpperCase();
        const b = (surname || "").trim().charAt(0).toUpperCase();
        if (a && b) return a + b;
        if (a) return a;
        if (fallback) return String(fallback).charAt(0).toUpperCase();
        return "?";
    }

    function setButtonLoading(button, loading, loadingText) {
        if (!button) return;
        if (loading) {
            if (!button.dataset.originalHtml) {
                button.dataset.originalHtml = button.innerHTML;
            }
            button.disabled = true;
            button.setAttribute("aria-busy", "true");
            button.innerHTML = loadingText || "İşleniyor...";
        } else {
            button.disabled = false;
            button.removeAttribute("aria-busy");
            if (button.dataset.originalHtml) {
                button.innerHTML = button.dataset.originalHtml;
                delete button.dataset.originalHtml;
            }
        }
    }

    // -----------------------------------------------------------
    // BACKEND'DEN VERİ YÜKLEME
    // -----------------------------------------------------------

    async function loadIncomingRequests() {
        if (!window.MessageRequestsAPI) {
            state.requests = [];
            return;
        }
        const result = await window.MessageRequestsAPI.getIncomingRequests();
        if (result && result.success && Array.isArray(result.data)) {
            state.requests = result.data;
        } else if (result && result.data === null) {
            state.requests = [];
        } else if (!result || !result.success) {
            // Hata durumunda kullanıcıyı bilgilendir ama UI'ı kırma
            if (result && result.message) {
                showToast(result.message, "error");
            }
            state.requests = [];
        }
    }

    async function loadOutgoingRequests() {
        if (!window.MessageRequestsAPI) {
            state.outgoingRequests = [];
            return;
        }
        const result = await window.MessageRequestsAPI.getOutgoingRequests();
        if (result && result.success && Array.isArray(result.data)) {
            state.outgoingRequests = result.data;
        } else if (result && result.data === null) {
            state.outgoingRequests = [];
        } else if (!result || !result.success) {
            if (result && result.message) {
                showToast(result.message, "error");
            }
            state.outgoingRequests = [];
        }
    }

    // -----------------------------------------------------------
    // KABUL EDİLMİŞ KONTAKLAR (accted-message)
    // -----------------------------------------------------------

    /**
     * Backend AcceptedMessageContactDto'sunu frontend'in chat modeline
     * dönüştürür. Backend yalnızca { UserId, UserName, RequestId }
     * döner; Name/Surname bilgisi olmadığı için fullName username'e
     * düşer.
     */
    function normalizeAcceptedContact(item) {
        if (!item) return null;
        const userId = item.UserId ?? item.userId;
        const username = item.UserName ?? item.userName ?? "";
        const requestId = item.RequestId ?? item.requestId;
        return {
            id: `chat-${userId}`,
            partnerId: userId,
            username,
            fullName: username,
            avatar: initials("", "", username),
            requestId,
            online: false,
            lastTime: "",
            messages: []
        };
    }

    async function loadAcceptedContacts() {
        if (!window.MessageRequestsAPI) {
            state.chats = [];
            return;
        }
        const result = await window.MessageRequestsAPI.getAcceptedContacts();
        if (result && result.success && Array.isArray(result.data)) {
            const normalized = result.data
                .map(normalizeAcceptedContact)
                .filter(Boolean);
            mergeAcceptedContacts(normalized);
        } else if (result && result.data === null) {
            // Backend hatasız boş döndüyse sadece state.chats'i temizleme;
            // kullanıcının lokal mesaj state'i korunabilir. Sıfırlama.
        } else if (!result || !result.success) {
            if (result && result.message) {
                showToast(result.message, "error");
            }
        }
    }

    /**
     * Backend'ten gelen kabul edilmiş kontakları state.chats ile
     * birleştirir. Aynı partnerId'ye sahip mevcut sohbetlerin
     * yerel mesaj geçmişi (messages) korunur; yeni gelen kontaklar
     * başa eklenir.
     */
    function mergeAcceptedContacts(contacts) {
        if (!Array.isArray(contacts)) return;

        contacts.forEach(contact => {
            if (!contact || !contact.partnerId) return;
            const existingIndex = state.chats.findIndex(
                c => c.partnerId && c.partnerId === contact.partnerId
            );
            if (existingIndex >= 0) {
                const existing = state.chats[existingIndex];
                state.chats[existingIndex] = {
                    ...contact,
                    messages: existing.messages || [],
                    lastTime: existing.lastTime || contact.lastTime,
                    online: existing.online
                };
            } else {
                state.chats.unshift(contact);
            }
        });
    }

    async function refreshAll() {
        if (state.loading) return;
        state.loading = true;
        try {
            await Promise.all([
                loadIncomingRequests(),
                loadOutgoingRequests(),
                loadAcceptedContacts()
            ]);
            updateCounts();
            if (state.currentView === "requests") {
                renderRequestsTable();
            } else if (state.currentView === "overview") {
                // sayaçlar yeterli
            } else if (state.currentView === "chat") {
                renderSidebarNav();
            }
        } finally {
            state.loading = false;
        }
    }

    // -----------------------------------------------------------
    // KULLANICI ÇÖZÜMLEMESİ
    // -----------------------------------------------------------

    // -----------------------------------------------------------
    // KULLANICI ÇÖZÜMLEMESİ
    // -----------------------------------------------------------

    function resolveCurrentUser() {
        let user = null;
        if (window.Auth && typeof window.Auth.getUser === "function") {
            user = window.Auth.getUser();
        }
        state.currentUser = user || { username: "Kullanıcı", role: "User" };
        const username = state.currentUser.username || "Kullanıcı";
        if (dom.sidebarUsername) dom.sidebarUsername.textContent = username;
    }

    // -----------------------------------------------------------
    // SAYAÇLAR
    // -----------------------------------------------------------

    function updateCounts() {
        const pendingCount = state.requests.length;
        const outgoingCount = state.outgoingRequests.length;
        const chatsCount = state.chats.length;

        if (dom.statPendingCount) dom.statPendingCount.textContent = pendingCount;
        if (dom.statChatsCount) dom.statChatsCount.textContent = chatsCount;
        if (dom.statOutgoingCount) dom.statOutgoingCount.textContent = outgoingCount;
        if (dom.requestCountBadge) {
            const tab = state.activeChatFilter;
            if (tab === "outgoing") {
                dom.requestCountBadge.textContent = `Toplam: ${outgoingCount} Gönderilen İstek`;
            } else {
                dom.requestCountBadge.textContent = `Toplam: ${pendingCount} Bekleyen İstek`;
            }
        }
    }

    // -----------------------------------------------------------
    // GÖRÜNÜM YÖNETİMİ
    // -----------------------------------------------------------

    function renderView(viewName, payload = null) {
        state.currentView = viewName;
        closeMobileSidebar();

        if (dom.viewOverview) dom.viewOverview.style.display = "none";
        if (dom.viewRequests) dom.viewRequests.style.display = "none";
        if (dom.viewChat) dom.viewChat.style.display = "none";

        renderSidebarNav();

        switch (viewName) {
            case "overview":
                if (dom.viewOverview) dom.viewOverview.style.display = "flex";
                if (dom.breadcrumbCurrent) dom.breadcrumbCurrent.textContent = "Genel Bakış";
                if (dom.msgHeaderTitle) dom.msgHeaderTitle.textContent = "Mesajlar & İstekler";
                if (dom.msgHeaderSubtitle) {
                    dom.msgHeaderSubtitle.textContent = "Arkadaşlarınla iletişimde kal, antrenmanlarını paylaş.";
                }
                updateCounts();
                break;

            case "requests":
                if (dom.viewRequests) dom.viewRequests.style.display = "flex";
                if (dom.breadcrumbCurrent) dom.breadcrumbCurrent.textContent = "İstekler";
                if (dom.msgHeaderTitle) dom.msgHeaderTitle.textContent = "Mesaj İstekleri";
                if (dom.msgHeaderSubtitle) {
                    dom.msgHeaderSubtitle.textContent =
                        "Gelen ve gönderilen bekleyen mesaj isteklerini buradan yönet.";
                }
                renderRequestsTable();
                break;

            case "chat":
                if (dom.viewChat) dom.viewChat.style.display = "flex";
                if (payload) {
                    state.activeChatPartnerId = payload;
                } else if (!state.activeChatPartnerId && state.chats.length > 0) {
                    state.activeChatPartnerId = state.chats[0].id;
                }
                renderActiveChat();
                break;
        }

        if (window.lucide) lucide.createIcons();
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    // -----------------------------------------------------------
    // SIDEBAR NAVİGASYONU
    // -----------------------------------------------------------

    function renderSidebarNav() {
        if (!dom.msgNavGroup) return;
        dom.msgNavGroup.innerHTML = "";

        if (state.currentView === "chat") {
            // 3.png Kuralı: Sohbet ekranında butonlar yerine aktif sohbet listesi gösterilir
            const chatsContainer = document.createElement("div");
            chatsContainer.className = "msg-chats-sidebar";

            const chatListTitle = document.createElement("div");
            chatListTitle.style.cssText = "font-size:12px; font-weight:700; color:var(--msg-text-muted); text-transform:uppercase; letter-spacing:0.5px; padding:0 6px 8px 6px;";
            chatListTitle.textContent = "Mevcut Sohbetler";
            chatsContainer.appendChild(chatListTitle);

            if (state.chats.length === 0) {
                const emptyChats = document.createElement("div");
                emptyChats.style.cssText = "padding:20px 8px; font-size:13px; color:var(--msg-text-muted); text-align:center;";
                emptyChats.textContent = "Henüz bir mesajlaşma bulunmuyor.";
                chatsContainer.appendChild(emptyChats);
            } else {
                state.chats.forEach(chat => {
                    const lastMsg = (chat.messages && chat.messages.length > 0)
                        ? chat.messages[chat.messages.length - 1]
                        : null;
                    const previewText = lastMsg
                        ? (lastMsg.sender === "outgoing" ? `Sen: ${lastMsg.text}` : lastMsg.text)
                        : "Sohbete başlayın...";
                    const isActive = chat.id === state.activeChatPartnerId;

                    const item = document.createElement("div");
                    item.className = `msg-chat-item ${isActive ? "active" : ""}`;
                    item.innerHTML = `
                        <div class="msg-chat-avatar ${chat.online ? "online" : ""}">
                            ${escapeHtml(chat.avatar || (chat.username || "?").charAt(0).toUpperCase())}
                        </div>
                        <div class="msg-chat-details">
                            <div class="msg-chat-header">
                                <span class="msg-chat-name">${escapeHtml(chat.fullName || chat.username)}</span>
                                <span class="msg-chat-time">${escapeHtml(chat.lastTime || "")}</span>
                            </div>
                            <div class="msg-chat-preview">${escapeHtml(previewText)}</div>
                        </div>
                    `;

                    item.addEventListener("click", () => {
                        state.activeChatPartnerId = chat.id;
                        renderView("chat", chat.id);
                    });

                    chatsContainer.appendChild(item);
                });
            }

            dom.msgNavGroup.appendChild(chatsContainer);
            if (window.lucide) lucide.createIcons();
            return;
        }

        // 1 & 2.png Modu: Menü butonları
        // Gelen istekler
        const incomingBtn = document.createElement("button");
        incomingBtn.type = "button";
        incomingBtn.className = `msg-btn-pill ${state.currentView === "requests" && state.activeChatFilter === "incoming" ? "active" : ""}`;
        incomingBtn.innerHTML = `
            <i data-lucide="inbox"></i>
            <span>Gelen İstekler</span>
            ${state.requests.length > 0 ? `<span class="msg-btn-badge">${state.requests.length}</span>` : ""}
        `;
        incomingBtn.addEventListener("click", () => {
            state.activeChatFilter = "incoming";
            renderView("requests");
        });
        dom.msgNavGroup.appendChild(incomingBtn);

        // Gönderilen istekler
        const outgoingBtn = document.createElement("button");
        outgoingBtn.type = "button";
        outgoingBtn.className = `msg-btn-pill ${state.currentView === "requests" && state.activeChatFilter === "outgoing" ? "active" : ""}`;
        outgoingBtn.innerHTML = `
            <i data-lucide="send"></i>
            <span>Gönderilenler</span>
            ${state.outgoingRequests.length > 0 ? `<span class="msg-btn-badge">${state.outgoingRequests.length}</span>` : ""}
        `;
        outgoingBtn.addEventListener("click", () => {
            state.activeChatFilter = "outgoing";
            renderView("requests");
        });
        dom.msgNavGroup.appendChild(outgoingBtn);

        // Mesajlarım / Sohbetler
        const messagesBtn = document.createElement("button");
        messagesBtn.type = "button";
        messagesBtn.className = `msg-btn-pill ${state.currentView === "chat" ? "active" : ""}`;
        messagesBtn.innerHTML = `
            <i data-lucide="message-square"></i>
            <span>Mesajlarım</span>
            ${state.chats.length > 0 ? `<span class="msg-btn-badge" style="background:rgba(255,255,255,0.15); color:var(--msg-text-main);">${state.chats.length}</span>` : ""}
        `;
        messagesBtn.addEventListener("click", () => {
            renderView("chat");
        });
        dom.msgNavGroup.appendChild(messagesBtn);

        if (window.lucide) lucide.createIcons();
    }

    // -----------------------------------------------------------
    // İSTEKLER TABLOSU
    // -----------------------------------------------------------

    function normalizeIncomingItem(req) {
        const senderName = req.SenderName || req.senderName || "";
        const senderSurname = req.SenderSurname || req.senderSurname || "";
        const username = req.SenderUsername || req.senderUsername || "";
        return {
            id: req.Id ?? req.id,
            partnerId: req.SenderId ?? req.senderId,
            username,
            fullName: (senderName || senderSurname)
                ? [senderName, senderSurname].filter(Boolean).join(" ")
                : username,
            avatar: initials(senderName, senderSurname, username),
            createdAt: req.CreatedAt ?? req.createdAt,
            status: req.Status ?? req.status
        };
    }

    function normalizeOutgoingItem(req) {
        const recvName = req.ReceiverName || req.receiverName || "";
        const recvSurname = req.ReceiverSurname || req.receiverSurname || "";
        const username = req.ReceiverUsername || req.receiverUsername || "";
        return {
            id: req.Id ?? req.id,
            partnerId: req.ReceiverId ?? req.receiverId,
            username,
            fullName: (recvName || recvSurname)
                ? [recvName, recvSurname].filter(Boolean).join(" ")
                : username,
            avatar: initials(recvName, recvSurname, username),
            createdAt: req.CreatedAt ?? req.createdAt,
            status: req.Status ?? req.status
        };
    }

    function renderRequestsTable() {
        if (!dom.requestsTableBody) return;
        dom.requestsTableBody.innerHTML = "";

        const tab = state.activeChatFilter;
        const source = tab === "outgoing"
            ? state.outgoingRequests.map(normalizeOutgoingItem)
            : state.requests.map(normalizeIncomingItem);

        const searchTerm = (dom.requestSearchInput?.value || "").trim().toLowerCase();
        const filtered = source.filter(r => {
            if (!searchTerm) return true;
            return (
                (r.username || "").toLowerCase().includes(searchTerm) ||
                (r.fullName || "").toLowerCase().includes(searchTerm)
            );
        });

        if (filtered.length === 0) {
            if (dom.requestsEmptyState) dom.requestsEmptyState.style.display = "flex";
        } else {
            if (dom.requestsEmptyState) dom.requestsEmptyState.style.display = "none";

            filtered.forEach(item => {
                const tr = document.createElement("tr");
                tr.dataset.requestId = String(item.id);

                const actionButtons = tab === "outgoing"
                    ? `
                        <button type="button" class="msg-action-btn reject" data-action="cancel" data-id="${escapeHtml(String(item.id))}" title="İsteği İptal Et">
                            <i data-lucide="x"></i>
                            <span>İptal</span>
                        </button>`
                    : `
                        <button type="button" class="msg-action-btn approve" data-action="approve" data-id="${escapeHtml(String(item.id))}" title="İsteği Onayla">
                            <i data-lucide="check"></i>
                            <span>Onayla</span>
                        </button>
                        <button type="button" class="msg-action-btn reject" data-action="reject" data-id="${escapeHtml(String(item.id))}" title="İsteği Reddet">
                            <i data-lucide="x"></i>
                            <span>Reddet</span>
                        </button>`;

                tr.innerHTML = `
                    <td>
                        <div class="msg-user-cell">
                            <div class="msg-user-avatar">${escapeHtml(item.avatar)}</div>
                            <div>
                                <div class="msg-user-name">${escapeHtml(item.fullName || item.username)}</div>
                                <div class="msg-user-handle">@${escapeHtml(item.username)}</div>
                            </div>
                        </div>
                    </td>
                    <td style="white-space:nowrap; color:var(--msg-text-muted);">${escapeHtml(formatDate(item.createdAt))}</td>
                    <td>
                        <span class="msg-badge msg-badge-pending">${tab === "outgoing" ? "Gönderildi" : "Beklemede"}</span>
                    </td>
                    <td>
                        <div class="msg-actions-cell">
                            ${actionButtons}
                        </div>
                    </td>
                `;

                tr.querySelectorAll("[data-action]").forEach(btn => {
                    btn.addEventListener("click", () => {
                        const action = btn.getAttribute("data-action");
                        const id = btn.getAttribute("data-id");
                        if (action === "approve") {
                            handleApproveRequest(id, item);
                        } else if (action === "reject") {
                            handleRejectRequest(id, item);
                        } else if (action === "cancel") {
                            handleCancelRequest(id, item);
                        }
                    });
                });

                dom.requestsTableBody.appendChild(tr);
            });
        }

        if (window.lucide) lucide.createIcons();
        updateCounts();
    }

    // -----------------------------------------------------------
    // İSTEK AKSİYON HANDLERLERİ
    // -----------------------------------------------------------

    function addAcceptedUserToChats(item) {
        if (!item) return null;
        const partnerId = item.partnerId || item.id;
        let existing = state.chats.find(c =>
            (partnerId && c.partnerId === partnerId) ||
            (item.username && c.username.toLowerCase() === String(item.username).toLowerCase())
        );

        if (!existing) {
            existing = {
                id: `chat-${partnerId || Date.now()}`,
                partnerId: partnerId,
                username: item.username,
                fullName: item.fullName || item.username,
                avatar: item.avatar || initials(item.fullName, "", item.username),
                online: true,
                lastTime: "",
                messages: []
            };
            state.chats.unshift(existing);
        }

        state.activeChatPartnerId = existing.id;
        updateCounts();
        return existing;
    }

    async function handleApproveRequest(requestId, item) {
        if (!window.MessageRequestsAPI) {
            showToast("Mesaj servisi şu anda kullanılamıyor.", "error");
            return;
        }

        const proceed = async () => {
            const response = await window.MessageRequestsAPI.acceptRequest(requestId);
            if (response && response.success) {
                showToast(response.message || "İstek kabul edildi.", "success");
                const newChat = addAcceptedUserToChats(item);
                await refreshAll();

                showConfirm({
                    title: "Sohbete Başla",
                    description: `${item.fullName || item.username} kullanıcısının isteği kabul edildi ve mesajlar listenize eklendi. Şimdi sohbete geçmek ister misiniz?`,
                    type: "success",
                    buttons: [
                        { text: "Daha Sonra", variant: "secondary" },
                        { text: "Sohbete Git", variant: "primary", callback: () => renderView("chat", newChat.id) }
                    ]
                });
            } else {
                showToast((response && response.message) || "İstek kabul edilemedi.", "error");
            }
        };

        showConfirm({
            title: "İsteği Kabul Et",
            description: `${item.fullName || item.username} kullanıcısının mesaj isteğini kabul etmek istediğinize emin misiniz?`,
            type: "success",
            buttons: [
                { text: "Vazgeç", variant: "secondary" },
                { text: "Evet, Onayla", variant: "primary", callback: () => proceed() }
            ]
        });
    }

    async function handleRejectRequest(requestId, item) {
        if (!window.MessageRequestsAPI) {
            showToast("Mesaj servisi şu anda kullanılamıyor.", "error");
            return;
        }

        const proceed = async () => {
            const response = await window.MessageRequestsAPI.rejectRequest(requestId);
            if (response && response.success) {
                showToast(response.message || "İstek reddedildi.", "success");
                await refreshAll();
            } else {
                showToast((response && response.message) || "İstek reddedilemedi.", "error");
            }
        };

        showConfirm({
            title: "İsteği Reddet",
            description: `@${item.username} kullanıcısının isteğini reddetmek istediğinize emin misiniz?`,
            type: "warning",
            buttons: [
                { text: "Vazgeç", variant: "secondary" },
                { text: "Evet, Reddet", variant: "danger", callback: () => proceed() }
            ]
        });
    }

    async function handleCancelRequest(requestId, item) {
        if (!window.MessageRequestsAPI) {
            showToast("Mesaj servisi şu anda kullanılamıyor.", "error");
            return;
        }

        const proceed = async () => {
            const response = await window.MessageRequestsAPI.cancelRequest(requestId);
            if (response && response.success) {
                showToast(response.message || "İstek iptal edildi.", "success");
                await refreshAll();
            } else {
                showToast((response && response.message) || "İstek iptal edilemedi.", "error");
            }
        };

        showConfirm({
            title: "İsteği İptal Et",
            description: `@${item.username} kullanıcısına gönderdiğiniz isteği iptal etmek istediğinize emin misiniz?`,
            type: "warning",
            buttons: [
                { text: "Vazgeç", variant: "secondary" },
                { text: "Evet, İptal Et", variant: "danger", callback: () => proceed() }
            ]
        });
    }

    // -----------------------------------------------------------
    // YENİ MESAJ İSTEĞİ GÖNDERME
    // -----------------------------------------------------------

    function escapeInitials(value) {
        if (!value) return "?";
        const trimmed = String(value).trim();
        return trimmed ? trimmed.charAt(0).toUpperCase() : "?";
    }

    function normalizeFriendItem(item) {
        const id = item.FriendUserId ?? item.friendUserId ?? item.Id ?? item.id ?? item.UserId ?? item.userId;
        const username = item.Username ?? item.username ?? "";
        const name = item.Name ?? item.name ?? "";
        const surname = item.Surname ?? item.surname ?? "";
        const fullName = [name, surname].filter(Boolean).join(" ");
        const avatarText =
            (name && surname)
                ? initials(name, surname, username)
                : escapeInitials(username || fullName);
        return {
            id,
            username,
            fullName: fullName || username,
            avatarText
        };
    }

    function openComposeModal() {
        if (!window.GlobalModal) return;

        if (!window.FriendsAPI || !window.MessageRequestsAPI) {
            showToast("Mesaj servisi şu anda kullanılamıyor.", "error");
            return;
        }

        const loadingHtml = `
            <div class="msg-compose-loading">
                <i data-lucide="loader"></i>
                <span>Arkadaş listen yükleniyor...</span>
            </div>
            <p class="msg-compose-error" id="composeReceiverError" role="alert" hidden></p>`;

        window.GlobalModal.open({
            title: "Yeni Mesaj İsteği",
            description: "Mesaj isteği göndereceğin arkadaşını seç.",
            type: "info",
            html: loadingHtml,
            buttons: [
                { text: "Kapat", variant: "secondary" }
            ]
        });

        if (window.lucide) lucide.createIcons();

        window.FriendsAPI.getFriends()
            .then(response => {
                const friends = (response && response.success && Array.isArray(response.data))
                    ? response.data.map(normalizeFriendItem)
                    : [];

                const bodyHtml = friends.length === 0
                    ? `
                        <div class="msg-compose-empty">
                            <i data-lucide="user-plus"></i>
                            <h4>Henüz arkadaşın yok</h4>
                            <p>Mesaj isteği gönderebilmek için önce bir arkadaşın olmalı. Arkadaş eklemek için <a href="Friends.html" style="color:var(--msg-primary); text-decoration:underline;">Arkadaşlar sayfasına</a> gidebilirsin.</p>
                        </div>
                        <p class="msg-compose-error" id="composeReceiverError" role="alert" hidden></p>`
                    : `
                        <div class="msg-compose-friends">
                            <input type="text" id="composeFriendSearch" class="msg-compose-search" placeholder="Listede ara..." autocomplete="off">
                            <ul class="msg-compose-friend-list" id="composeFriendList" role="listbox">
                                ${friends.map(f => `
                                    <li role="option"
                                        class="msg-compose-friend-item"
                                        data-friend-id="${escapeHtml(String(f.id))}"
                                        data-search="${escapeHtml(((f.fullName || "") + " " + (f.username || "")).toLowerCase())}">
                                        <div class="msg-user-avatar">${escapeHtml(f.avatarText)}</div>
                                        <div class="msg-user-cell">
                                            <div class="msg-user-name">${escapeHtml(f.fullName || f.username)}</div>
                                            <div class="msg-user-handle">@${escapeHtml(f.username)}</div>
                                        </div>
                                        <button type="button"
                                            class="msg-action-btn approve"
                                            data-friend-id="${escapeHtml(String(f.id))}"
                                            title="Mesaj isteği gönder">
                                            <i data-lucide="send"></i>
                                            <span>Gönder</span>
                                        </button>
                                    </li>
                                `).join("")}
                            </ul>
                            <p class="msg-compose-help">Bir arkadaşının yanındaki "Gönder" düğmesine bas. Karşı taraf kabul ederse sohbet başlar.</p>
                            <p class="msg-compose-error" id="composeReceiverError" role="alert" hidden></p>
                        </div>`;

                const contentSlot = document.getElementById("globalModalBody")
                    || document.querySelector(".global-modal-body, .modal-body");

                if (!contentSlot) {
                    showToast(
                        (response && response.success)
                            ? "Arkadaş listesi yüklendi ancak modal güncellenemedi."
                            : (response && response.message) || "Arkadaş listesi yüklenemedi.",
                        response && response.success ? "warning" : "error"
                    );
                    return;
                }

                contentSlot.innerHTML = bodyHtml;

                if (window.lucide) lucide.createIcons();

                const list = document.getElementById("composeFriendList");
                const search = document.getElementById("composeFriendSearch");
                const errorEl = document.getElementById("composeReceiverError");

                if (search && list) {
                    search.addEventListener("input", () => {
                        const term = search.value.trim().toLowerCase();
                        list.querySelectorAll(".msg-compose-friend-item").forEach(li => {
                            const hay = li.dataset.search || "";
                            li.style.display = (!term || hay.includes(term)) ? "" : "none";
                        });
                    });
                    search.focus();
                }

                if (list) {
                    list.querySelectorAll('[data-friend-id]').forEach(btn => {
                        const friendId = btn.getAttribute("data-friend-id");
                        if (!friendId) return;

                        const handler = (e) => {
                            if (e) {
                                e.preventDefault();
                                e.stopPropagation();
                            }

                            const id = Number(friendId);
                            if (!Number.isFinite(id) || id <= 0) {
                                console.error("[Mesajlar] Gecersiz friendId:", friendId);
                                return;
                            }

                            // Bu liste içindeki tüm butonları disable et
                            list.querySelectorAll("button[data-friend-id]").forEach(b => {
                                if (b !== btn) b.disabled = true;
                            });
                            setButtonLoading(btn, true, "Gönderiliyor...");

                            window.MessageRequestsAPI.sendRequest(id)
                                .then(result => {
                                    if (result && result.success) {
                                        showToast(result.message || "Mesaj isteği gönderildi.", "success");
                                        refreshAll();
                                        if (typeof window.GlobalModal?.close === "function") {
                                            window.GlobalModal.close();
                                        }
                                    } else {
                                        if (errorEl) {
                                            errorEl.textContent = (result && result.message) || "İstek gönderilemedi.";
                                            errorEl.hidden = false;
                                        }
                                        setButtonLoading(btn, false);
                                        list.querySelectorAll("button[data-friend-id]").forEach(b => {
                                            b.disabled = false;
                                        });
                                    }
                                })
                                .catch(err => {
                                    console.error("[Mesajlar] sendRequest error:", err);
                                    if (errorEl) {
                                        errorEl.textContent = "Beklenmeyen bir hata oluştu.";
                                        errorEl.hidden = false;
                                    }
                                    setButtonLoading(btn, false);
                                    list.querySelectorAll("button[data-friend-id]").forEach(b => {
                                        b.disabled = false;
                                    });
                                });
                        };

                        btn.addEventListener("click", handler);
                    });
                }
            })
            .catch(error => {
                console.error("[Mesajlar] getFriends error:", error);
                const errorEl = document.getElementById("composeReceiverError");
                if (errorEl) {
                    errorEl.textContent = "Arkadaş listesi yüklenemedi. Lütfen tekrar deneyin.";
                    errorEl.hidden = false;
                }
            });
    }

    // -----------------------------------------------------------
    // SOHBET (CHAT) VE MESAJLAŞMA SİSTEMİ
    // -----------------------------------------------------------

    function renderActiveChat() {
        if (!state.activeChatPartnerId && state.chats.length > 0) {
            state.activeChatPartnerId = state.chats[0].id;
        }

        const activeChat = state.chats.find(c => c.id === state.activeChatPartnerId);

        if (!activeChat) {
            if (dom.breadcrumbCurrent) dom.breadcrumbCurrent.textContent = "Sohbet";
            if (dom.msgHeaderTitle) dom.msgHeaderTitle.textContent = "Mesajlarım";
            if (dom.msgHeaderSubtitle) dom.msgHeaderSubtitle.textContent = "Arkadaşlarınla anlık iletişim kur.";
            if (dom.activeChatAvatar) dom.activeChatAvatar.textContent = "?";
            if (dom.activeChatName) dom.activeChatName.textContent = "Sohbet Seçilmedi";
            if (dom.activeChatStatusText) dom.activeChatStatusText.textContent = "Çevrimdışı";
            if (dom.chatMessagesArea) {
                dom.chatMessagesArea.innerHTML = `
                    <div class="msg-empty-state" style="padding: 40px 16px;">
                        <div class="msg-empty-icon"><i data-lucide="message-square-dashed"></i></div>
                        <h3>Aktif Sohbet Bulunmuyor</h3>
                        <p>Sol menüden bir sohbet seçebilir veya yeni mesaj isteği göndererek konuşma başlatabilirsiniz.</p>
                        <button type="button" class="msg-send-btn msg-compose-btn" style="margin-top:16px;" id="emptyStateComposeBtn">
                            <i data-lucide="square-pen"></i>
                            <span>Mesaj İsteği Gönder</span>
                        </button>
                    </div>
                `;
                const btn = document.getElementById("emptyStateComposeBtn");
                if (btn) btn.addEventListener("click", openComposeModal);
                if (window.lucide) lucide.createIcons();
            }
            renderSidebarNav();
            return;
        }

        state.activeChatPartnerId = activeChat.id;

        // Başlık ve profil bilgileri
        if (dom.breadcrumbCurrent) dom.breadcrumbCurrent.textContent = `Sohbet / ${activeChat.fullName || activeChat.username}`;
        if (dom.msgHeaderTitle) dom.msgHeaderTitle.textContent = activeChat.fullName || activeChat.username;
        if (dom.msgHeaderSubtitle) dom.msgHeaderSubtitle.textContent = `@${activeChat.username} ile sohbet`;

        if (dom.activeChatAvatar) {
            dom.activeChatAvatar.textContent = activeChat.avatar || (activeChat.username || "?").charAt(0).toUpperCase();
        }
        if (dom.activeChatName) {
            dom.activeChatName.textContent = activeChat.fullName || activeChat.username;
        }
        if (dom.activeChatStatusText) {
            dom.activeChatStatusText.textContent = activeChat.online ? "Çevrimiçi" : "Çevrimdışı";
        }

        // Aktif sohbet için konuşma geçmişini arka planda yükle
        loadConversation(activeChat);
        renderMessages(activeChat);
        renderSidebarNav();
    }

    function renderMessages(chat) {
        if (!dom.chatMessagesArea) return;
        dom.chatMessagesArea.innerHTML = "";

        const conv = chat && chat.partnerId
            ? state.chatConversations[chat.partnerId]
            : null;

        // Yükleme durumu
        if (conv && conv.status === "loading") {
            dom.chatMessagesArea.innerHTML = `
                <div class="msg-empty-state" style="padding: 40px 16px;">
                    <div class="msg-empty-icon"><i data-lucide="loader"></i></div>
                    <h3>Konuşma Yükleniyor</h3>
                    <p>Mesaj geçmişi getiriliyor, lütfen bekleyin.</p>
                </div>
            `;
            if (window.lucide) lucide.createIcons();
            return;
        }

        // Hata durumu — boş-sohbet gibi gösterilmez
        if (conv && conv.status === "error") {
            dom.chatMessagesArea.innerHTML = `
                <div class="msg-empty-state" style="padding: 40px 16px;">
                    <div class="msg-empty-icon"><i data-lucide="alert-triangle"></i></div>
                    <h3>Konuşma Yüklenemedi</h3>
                    <p>${escapeHtml(conv.error || "Mesaj geçmişi alınırken bir hata oluştu.")}</p>
                    <button type="button" class="msg-send-btn msg-compose-btn" style="margin-top:16px;" id="chatRetryBtn">
                        <i data-lucide="refresh-ccw"></i>
                        <span>Tekrar Dene</span>
                    </button>
                </div>
            `;
            const retryBtn = document.getElementById("chatRetryBtn");
            if (retryBtn) {
                retryBtn.addEventListener("click", () => {
                    delete state.chatConversations[chat.partnerId];
                    loadConversation(chat);
                });
            }
            if (window.lucide) lucide.createIcons();
            return;
        }

        if (!chat.messages || chat.messages.length === 0) {
            dom.chatMessagesArea.innerHTML = `
                <div class="msg-empty-state" style="padding: 32px 16px;">
                    <div class="msg-empty-icon"><i data-lucide="message-square-dashed"></i></div>
                    <h3>Mesaj Geçmişi Boş</h3>
                    <p>Bu sohbette henüz bir mesaj yok. Aşağıdaki alana mesajınızı yazarak sohbete başlayabilirsiniz.</p>
                </div>
            `;
            if (window.lucide) lucide.createIcons();
            return;
        }

        chat.messages.forEach(msg => {
            const group = document.createElement("div");
            group.className = `msg-bubble-group ${msg.sender}`;

            group.innerHTML = `
                <div class="msg-bubble-wrapper">
                    <div class="msg-bubble">${escapeHtml(msg.text)}</div>
                    <button type="button" class="msg-bubble-delete-btn" data-msg-id="${escapeHtml(String(msg.id))}" title="Bu Mesajı Sil">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
                <div class="msg-bubble-meta">
                    <span>${escapeHtml(msg.time || "Şimdi")}</span>
                    ${msg.sender === "outgoing" ? '<i data-lucide="check-check" style="width:14px; height:14px;"></i>' : ''}
                </div>
            `;

            group.querySelector(".msg-bubble-delete-btn")?.addEventListener("click", () => {
                deleteSingleMessage(chat, msg.id);
            });

            dom.chatMessagesArea.appendChild(group);
        });

        if (window.lucide) lucide.createIcons();
        scrollToBottom();
    }

    /**
     * Backend'den iki kullanıcı arasındaki konuşma geçmişini çeker.
     * Yalnızca GET /api/messages/{otherUserId} entegrasyonu:
     *   - Sonuç başarılıysa sohbetin messages dizisi API'den dönen
     *     mesajlarla doldurulur (tarihe göre zaten sıralı gelir).
     *   - Hata durumunda kullanıcıya hata mesajı gösterilir; UI
     *     boş-sohbet mesajı gibi gösterilmez.
     *   - Yükleme sırasında loading durumu gösterilir.
     */
    async function loadConversation(chat) {
        if (!chat || !chat.partnerId) {
            return;
        }

        const partnerId = chat.partnerId;

        // Eğer bu sohbet zaten yükleniyorsa yeniden çağırma
        const existing = state.chatConversations[partnerId];
        if (existing && existing.status === "loading") {
            return;
        }

        state.chatConversations[partnerId] = {
            status: "loading",
            error: null
        };

        // Eğer aktif sohbet buysa, yükleme durumunu göster
        const isActive = state.activeChatPartnerId === chat.id;
        if (isActive) {
            renderMessages(chat);
        }

        if (!window.MessagesAPI) {
            state.chatConversations[partnerId] = {
                status: "error",
                error: "Mesaj servisi şu anda kullanılamıyor."
            };
            if (isActive) renderMessages(chat);
            return;
        }

        try {
            const result = await window.MessagesAPI.getConversation(partnerId);
            if (result && result.success && Array.isArray(result.data)) {
                const messages = result.data
                    .map(normalizeConversationMessage.bind(null, chat))
                    .filter(Boolean);
                chat.messages = messages;
                chat.lastTime = computeLastTime(messages);
                state.chatConversations[partnerId] = {
                    status: "ready",
                    error: null
                };
            } else if (result && result.data === null && result.success) {
                // Başarılı ancak mesaj yok
                chat.messages = [];
                chat.lastTime = "";
                state.chatConversations[partnerId] = {
                    status: "ready",
                    error: null
                };
            } else {
                state.chatConversations[partnerId] = {
                    status: "error",
                    error: (result && result.message) || "Konuşma geçmişi yüklenemedi."
                };
            }
        } catch (error) {
            console.error("[Mesajlar] getConversation error:", error);
            state.chatConversations[partnerId] = {
                status: "error",
                error: "Beklenmeyen bir hata oluştu."
            };
        }

        // Hâlâ aktif sohbet buysa UI'ı yenile
        if (state.activeChatPartnerId === chat.id) {
            renderMessages(chat);
            renderSidebarNav();
        }
    }

    /**
     * Backend mesaj nesnesini frontend'in mesaj modeline dönüştürür.
     * Backend alanları: Id, SenderId, ReceiverId, Content, MessageType,
     * IsRead, ReadAt, CreatedAt.
     */
    function normalizeConversationMessage(chat, item) {
        if (!item) return null;
        const senderId = item.SenderId ?? item.senderId;
        const currentUserId = state.currentUser?.userId;

        // Mevcut kullanıcının kimliği JWT'den gelir; kullanıcı
        // girişiyle veya sahte ID ile frontend tarafından üretilmez.
        let isOutgoing;
        if (currentUserId !== undefined && currentUserId !== null) {
            const parsed = Number(currentUserId);
            isOutgoing = Number.isFinite(parsed) && Number(senderId) === parsed;
        } else {
            // Auth bilgisi yoksa varsayılan: alıcı taraf mesajları incoming
            isOutgoing = false;
        }

        const createdAt = item.CreatedAt ?? item.createdAt;
        return {
            id: item.Id ?? item.id,
            text: item.Content ?? item.content ?? "",
            sender: isOutgoing ? "outgoing" : "incoming",
            time: formatTimeShort(createdAt),
            createdAt,
            read: !!(item.IsRead ?? item.isRead)
        };
    }

    function computeLastTime(messages) {
        if (!Array.isArray(messages) || messages.length === 0) return "";
        const last = messages[messages.length - 1];
        return last && last.time ? last.time : "";
    }

    function formatTimeShort(value) {
        if (!value) return "";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";
        try {
            return date.toLocaleString("tr-TR", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit"
            });
        } catch {
            return date.toLocaleString();
        }
    }

    function deleteSingleMessage(chat, msgId) {
        if (!chat || !chat.messages) return;
        chat.messages = chat.messages.filter(m => m.id !== msgId);
        renderMessages(chat);
        renderSidebarNav();
    }

    function scrollToBottom() {
        if (dom.chatMessagesArea) {
            dom.chatMessagesArea.scrollTop = dom.chatMessagesArea.scrollHeight;
        }
    }

    function handleSendMessage(e) {
        if (e) e.preventDefault();
        const text = (dom.chatInputText?.value || "").trim();
        if (!text) return;

        const activeChat = state.chats.find(c => c.id === state.activeChatPartnerId);
        if (!activeChat) {
            showToast("Mesaj göndermek için bir sohbet seçmelisiniz.", "warning");
            return;
        }

        if (!activeChat.partnerId) {
            showToast("Bu sohbete mesaj gönderilemiyor (alıcı kimliği eksik).", "error");
            return;
        }

        if (!window.MessagesAPI || typeof window.MessagesAPI.sendMessage !== "function") {
            showToast("Mesaj servisi şu anda kullanılamıyor.", "error");
            return;
        }

        // Çift tıklama / hızlı gönderim koruması
        if (state.sendingMessage) {
            return;
        }
        state.sendingMessage = true;

        const submitBtn = dom.chatForm?.querySelector("button[type='submit']");
        if (submitBtn) submitBtn.disabled = true;

        const tempText = text;
        if (dom.chatInputText) dom.chatInputText.value = "";

        showToast("Mesaj gönderiliyor...", "info");

        window.MessagesAPI.sendMessage({
            receiverId: activeChat.partnerId,
            messageType: "Text",
            content: tempText
        })
            .then(result => {
                if (result && result.success && result.data) {
                    // Backend'in döndürdüğü mesajı konuşmaya ekle.
                    // (Başarılı yanıt gelmeden UI'a ekleme YAPILMAZ.)
                    const newMessage = normalizeConversationMessage(
                        activeChat,
                        {
                            Id: result.data.messageId,
                            SenderId: result.data.senderId,
                            ReceiverId: result.data.receiverId,
                            Content: result.data.content,
                            MessageType: result.data.messageType,
                            IsRead: false,
                            CreatedAt: result.data.createdAt
                        }
                    );

                    if (newMessage) {
                        if (!Array.isArray(activeChat.messages)) {
                            activeChat.messages = [];
                        }
                        activeChat.messages.push(newMessage);
                        activeChat.lastTime = newMessage.time || "";
                        renderMessages(activeChat);
                        renderSidebarNav();
                        scrollToBottom();
                    }
                    showToast("Mesaj gönderildi.", "success");
                } else {
                    // Hata durumunda input içeriğini geri yükle
                    if (dom.chatInputText) dom.chatInputText.value = tempText;
                    const msg = (result && result.message) || "Mesaj gönderilemedi.";
                    showToast(msg, "error");
                }
            })
            .catch(err => {
                console.error("[Mesajlar] sendMessage error:", err);
                if (dom.chatInputText) dom.chatInputText.value = tempText;
                showToast(
                    "Mesaj gönderilirken beklenmeyen bir hata oluştu.",
                    "error"
                );
            })
            .finally(() => {
                state.sendingMessage = false;
                if (submitBtn) submitBtn.disabled = false;
            });
    }

    function toggleChatDropdown(e) {
        if (e) e.stopPropagation();
        const isShown = dom.chatDropdownMenu?.classList.contains("show");
        if (isShown) closeChatDropdown();
        else openChatDropdown();
    }

    function openChatDropdown() {
        if (dom.chatDropdownMenu) dom.chatDropdownMenu.classList.add("show");
        if (dom.btnChatMenuToggle) dom.btnChatMenuToggle.classList.add("active");
    }

    function closeChatDropdown() {
        if (dom.chatDropdownMenu) dom.chatDropdownMenu.classList.remove("show");
        if (dom.btnChatMenuToggle) dom.btnChatMenuToggle.classList.remove("active");
    }

    function handleClearHistory() {
        closeChatDropdown();
        const activeChat = state.chats.find(c => c.id === state.activeChatPartnerId);
        if (!activeChat || !activeChat.messages || activeChat.messages.length === 0) return;

        const partnerName = activeChat.fullName || activeChat.username;

        showConfirm({
            title: "Mesajları Temizle",
            description: `${partnerName} ile olan tüm mesaj geçmişini silmek istediğinize emin misiniz?`,
            type: "warning",
            buttons: [
                { text: "Vazgeç", variant: "secondary" },
                {
                    text: "Evet, Temizle",
                    variant: "danger",
                    callback: () => {
                        activeChat.messages = [];
                        activeChat.lastTime = "";
                        renderMessages(activeChat);
                        renderSidebarNav();
                    }
                }
            ]
        });
    }

    function handleDeleteConversation() {
        closeChatDropdown();
        const activeChat = state.chats.find(c => c.id === state.activeChatPartnerId);
        if (!activeChat) return;

        const partnerName = activeChat.fullName || activeChat.username;

        showConfirm({
            title: "Sohbeti Sil",
            description: `${partnerName} ile olan sohbeti silmek istediğinize emin misiniz?`,
            type: "danger",
            buttons: [
                { text: "Vazgeç", variant: "secondary" },
                {
                    text: "Sohbeti Sil",
                    variant: "danger",
                    callback: () => {
                        state.chats = state.chats.filter(c => c.id !== activeChat.id);
                        state.activeChatPartnerId = state.chats.length > 0 ? state.chats[0].id : null;
                        updateCounts();

                        if (state.chats.length > 0) {
                            renderView("chat", state.activeChatPartnerId);
                        } else {
                            renderView("overview");
                        }
                    }
                }
            ]
        });
    }

    // -----------------------------------------------------------
    // RESPONSIVE SIDEBAR
    // -----------------------------------------------------------

    function openMobileSidebar() {
        if (dom.msgSidebar) dom.msgSidebar.classList.add("is-open");
        if (dom.msgSidebarOverlay) dom.msgSidebarOverlay.classList.add("show");
        if (dom.msgMenuToggle) dom.msgMenuToggle.setAttribute("aria-expanded", "true");
    }

    function closeMobileSidebar() {
        if (dom.msgSidebar) dom.msgSidebar.classList.remove("is-open");
        if (dom.msgSidebarOverlay) dom.msgSidebarOverlay.classList.remove("show");
        if (dom.msgMenuToggle) dom.msgMenuToggle.setAttribute("aria-expanded", "false");
    }

    // -----------------------------------------------------------
    // EVENT BINDINGS
    // -----------------------------------------------------------

    function initEventListeners() {
        if (dom.msgMenuToggle) dom.msgMenuToggle.addEventListener("click", () => {
            const isOpen = dom.msgSidebar?.classList.contains("is-open");
            if (isOpen) closeMobileSidebar(); else openMobileSidebar();
        });
        if (dom.msgSidebarClose) dom.msgSidebarClose.addEventListener("click", closeMobileSidebar);
        if (dom.msgSidebarOverlay) dom.msgSidebarOverlay.addEventListener("click", closeMobileSidebar);

        if (dom.msgBackBtn) {
            dom.msgBackBtn.addEventListener("click", () => {
                window.location.href = "index.html";
            });
        }

        if (dom.bcHomeBtn) dom.bcHomeBtn.addEventListener("click", () => renderView("overview"));

        if (dom.cardGoToRequests) dom.cardGoToRequests.addEventListener("click", () => {
            state.activeChatFilter = "incoming";
            renderView("requests");
        });
        if (dom.cardGoToChats) dom.cardGoToChats.addEventListener("click", () => renderView("chat"));
        if (dom.cardGoToFindFriends) dom.cardGoToFindFriends.addEventListener("click", () => renderView("requests"));
        if (dom.bannerOpenRequestsBtn) dom.bannerOpenRequestsBtn.addEventListener("click", () => {
            state.activeChatFilter = "incoming";
            renderView("requests");
        });
        if (dom.bannerOpenRequestsLink) {
            dom.bannerOpenRequestsLink.addEventListener("click", (event) => {
                event.preventDefault();
                state.activeChatFilter = "incoming";
                renderView("requests");
            });
        }
        [dom.btnOpenComposeModal, dom.bannerOpenComposeBtn, dom.toolbarOpenComposeBtn]
            .filter(Boolean)
            .forEach(btn => btn.addEventListener("click", openComposeModal));

        [dom.cardGoToRequests, dom.cardGoToChats, dom.cardGoToFindFriends]
            .filter(Boolean)
            .forEach((card) => card.addEventListener("keydown", (event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    card.click();
                }
            }));

        if (dom.requestSearchInput) {
            dom.requestSearchInput.addEventListener("input", renderRequestsTable);
        }

        // Mesaj Gönderme Formu
        if (dom.chatMessageForm) {
            dom.chatMessageForm.addEventListener("submit", handleSendMessage);
        }

        // Sohbet 3 Nokta Menüsü
        if (dom.btnChatMenuToggle) {
            dom.btnChatMenuToggle.addEventListener("click", toggleChatDropdown);
        }

        // Dropdown İçi Eylemler
        if (dom.btnClearChatHistory) {
            dom.btnClearChatHistory.addEventListener("click", handleClearHistory);
        }

        if (dom.btnDeleteConversation) {
            dom.btnDeleteConversation.addEventListener("click", handleDeleteConversation);
        }

        // Dropdown dışı tıklandığında kapat
        document.addEventListener("click", (e) => {
            if (!e.target.closest(".msg-dropdown-wrapper")) {
                closeChatDropdown();
            }
        });
    }

    // -----------------------------------------------------------
    // BAŞLANGIÇ
    // -----------------------------------------------------------

    async function init() {
        // Auth guard
        if (window.Auth && typeof window.Auth.requireAuth === "function") {
            if (!window.Auth.requireAuth()) return;
        }

        if (!window.MessageRequestsAPI) {
            console.error(
                "[Mesajlar] window.MessageRequestsAPI bulunamadi. MessageRequestEndpoint.js yuklendiginden emin olun."
            );
        }

        resolveCurrentUser();
        initEventListeners();
        renderView("overview");

        await refreshAll();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
