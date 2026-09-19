/**
 * ==========================================================================
 * FITNESS PRO - MESAJLAR PANELİ KONTROL VE ETKİLEŞİM YÖNETİCİSİ
 * Raporlar/Tasarım/Mesajlar (1.png, 2.png, 3.png) ve Kurallar.txt gereksinimleri:
 * 
 * 1 Nolu Resim:
 *   - Bağlantı istekleri tek bir akışta incelenir ve sohbetlere dönüştürülür.
 *   - Sidebar butonları: Arkadaş Bul, İsteklerim, Mesajlarım, Geri Dön
 * 
 * 2 Nolu Resim:
 *   - Mesaj istekleri Table içinde gösterilecek
 *   - Sağda Onay / Red butonları olacak
 *   - Onay verildiğinde 3 nolu resimde (Mesajlarım) görünecek
 * 
 * 3 Nolu Resim:
 *   - Mesajlar kısmında butonlar olmayacak; buton kısmında (sidebar) mevcut mesajlar/sohbetler olacak
 *   - Content kısmında ise mesaj akışı, input ve Mesaj Gönder butonu olacak
 * ==========================================================================
 */

(function () {
    "use strict";

    // Uygulama Durumu
    const state = {
        currentView: "overview", // "overview" (1.png) | "requests" (2.png) | "chat" (3.png)
        currentUser: null,
        activeChatPartnerId: null,

        // 2 Nolu Resim: Gelen Mesaj / Arkadaşlık İstekleri
        requests: [
            {
                id: 1,
                userId: 201,
                username: "ali_demir",
                fullName: "Ali Demir",
                avatar: "A",
                date: "Bugün 14:20",
                note: "Selam! Kadıköy sahilinde sabah koşu partneri arıyordun, beraber koşabiliriz.",
                status: "Pending" // Pending | Approved | Rejected
            },
            {
                id: 2,
                userId: 202,
                username: "zeynep_fit",
                fullName: "Zeynep Yılmaz",
                avatar: "Z",
                date: "Dün 18:45",
                note: "Merhaba, fitness programın hakkında birkaç soru sormak istiyorum.",
                status: "Pending"
            },
            {
                id: 3,
                userId: 203,
                username: "can_bodybuilder",
                fullName: "Can Kaya",
                avatar: "C",
                date: "3 gün önce",
                note: "Göğüs & Triceps antrenman rutinimizi karşılaştıralım mı?",
                status: "Pending"
            }
        ],

        // 3 Nolu Resim: Sohbet Edilen Kişiler ve Mesaj Akışları
        chats: [
            {
                id: "chat-1",
                partnerId: 101,
                username: "mehmet_hoca",
                fullName: "Mehmet Antrenör",
                avatar: "M",
                online: true,
                lastTime: "12:30",
                messages: [
                    { id: 1, sender: "incoming", text: "Selam! Bugünkü idman programını tamamladın mı?", time: "12:15" },
                    { id: 2, sender: "outgoing", text: "Selam hocam, evet göğüs ve triceps setlerini bitirdim.", time: "12:20" },
                    { id: 3, sender: "incoming", text: "Harika! Dinlenmeyi ve protein alımını ihmal etme.", time: "12:30" }
                ]
            },
            {
                id: "chat-2",
                partnerId: 102,
                username: "ayse_runner",
                fullName: "Ayşe Koşucu",
                avatar: "A",
                online: true,
                lastTime: "Dün",
                messages: [
                    { id: 1, sender: "incoming", text: "Cumartesi günü sabah 08:00'de Belgrad Ormanı koşusuna katılıyor musun?", time: "Dün 16:10" },
                    { id: 2, sender: "outgoing", text: "Kesinlikle katılıyorum, parkur başlangıcında buluşuruz!", time: "Dün 16:30" }
                ]
            }
        ]
    };

    // DOM Elementleri
    const dom = {
        msgSidebar: document.getElementById("msgSidebar"),
        msgSidebarOverlay: document.getElementById("msgSidebarOverlay"),
        msgSidebarClose: document.getElementById("msgSidebarClose"),
        msgMenuToggle: document.getElementById("msgMenuToggle"),
        sidebarUsername: document.getElementById("sidebarUsername"),
        msgNavGroup: document.getElementById("msgNavGroup"),
        msgBackBtn: document.getElementById("msgBackBtn"),

        // Başlıklar & Breadcrumb
        breadcrumbCurrent: document.getElementById("breadcrumbCurrent"),
        bcHomeBtn: document.getElementById("bcHomeBtn"),
        msgHeaderTitle: document.getElementById("msgHeaderTitle"),
        msgHeaderSubtitle: document.getElementById("msgHeaderSubtitle"),

        // Görünümler
        viewOverview: document.getElementById("viewOverview"),
        viewRequests: document.getElementById("viewRequests"),
        viewChat: document.getElementById("viewChat"),

        // Sayaçlar & Banner Butonları
        statPendingCount: document.getElementById("statPendingCount"),
        statChatsCount: document.getElementById("statChatsCount"),
        cardGoToRequests: document.getElementById("cardGoToRequests"),
        cardGoToChats: document.getElementById("cardGoToChats"),
        cardGoToFindFriends: document.getElementById("cardGoToFindFriends"),
        bannerOpenRequestsBtn: document.getElementById("bannerOpenRequestsBtn"),
        bannerOpenRequestsLink: document.getElementById("bannerOpenRequestsLink"),
        btnOpenComposeModal: document.getElementById("btnOpenComposeModal"),

        // İstekler (2.png)
        requestsTableBody: document.getElementById("requestsTableBody"),
        requestsEmptyState: document.getElementById("requestsEmptyState"),
        requestSearchInput: document.getElementById("requestSearchInput"),
        requestCountBadge: document.getElementById("requestCountBadge"),

        // Sohbet (3.png)
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

    // =========================================================================
    // BAŞLANGIÇ
    // =========================================================================
    function init() {
        resolveCurrentUser();
        initEventListeners();
        updateCounts();
        renderView("overview");
    }

    function resolveCurrentUser() {
        let user = null;
        if (window.Auth && typeof window.Auth.getUser === "function") {
            user = window.Auth.getUser();
        }
        if (!user) {
            const stored = localStorage.getItem("fitness_pro_user");
            if (stored) {
                try { user = JSON.parse(stored); } catch (e) {}
            }
        }
        state.currentUser = user || { username: "Emre", role: "User" };
        const username = state.currentUser.username || "Kullanıcı";
        if (dom.sidebarUsername) dom.sidebarUsername.textContent = username;
    }

    function updateCounts() {
        const pendingRequests = state.requests.filter(r => r.status === "Pending");
        if (dom.statPendingCount) dom.statPendingCount.textContent = pendingRequests.length;
        if (dom.statChatsCount) dom.statChatsCount.textContent = state.chats.length;
        if (dom.requestCountBadge) {
            dom.requestCountBadge.textContent = `Toplam: ${pendingRequests.length} Bekleyen İstek`;
        }
    }

    // =========================================================================
    // GÖRÜNÜMLER ARASI GEÇİŞ
    // =========================================================================
    function renderView(viewName, payload = null) {
        state.currentView = viewName;
        closeMobileSidebar();

        // Bölümleri gizle
        if (dom.viewOverview) dom.viewOverview.style.display = "none";
        if (dom.viewRequests) dom.viewRequests.style.display = "none";
        if (dom.viewChat) dom.viewChat.style.display = "none";

        // Sidebar içeriğini güncelle (1.png / 2.png vs 3.png kuralı)
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
                if (dom.breadcrumbCurrent) dom.breadcrumbCurrent.textContent = "İsteklerim";
                if (dom.msgHeaderTitle) dom.msgHeaderTitle.textContent = "Gelen İstekler";
                if (dom.msgHeaderSubtitle) {
                    dom.msgHeaderSubtitle.textContent = "Sizinle bağlantı kurmak ve mesajlaşmak isteyen sporcular.";
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

        if (window.lucide) {
            lucide.createIcons();
        }

        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    // =========================================================================
    // SIDEBAR NAVİGASYONU
    // Kural 1 & 2: Butonlar ("Arkadaş Bul", "İsteklerim", "Mesajlarım")
    // Kural 3: Mesajlar kısmında butonlar olmicak, sohbet listesi olacak
    // =========================================================================
    function renderSidebarNav() {
        if (!dom.msgNavGroup) return;
        dom.msgNavGroup.innerHTML = "";

        if (state.currentView === "chat") {
            // 3 NOLU RESİM KURALI:
            // "Mesajlar Kısmında btn ler olmicak btn kısmında ise mevcut mesajlar olcak"
            const chatsContainer = document.createElement("div");
            chatsContainer.className = "msg-chats-sidebar";

            const chatListTitle = document.createElement("div");
            chatListTitle.style.cssText = "font-size:12px; font-weight:700; color:var(--msg-text-muted); text-transform:uppercase; letter-spacing:0.5px; padding:0 6px 4px 6px;";
            chatListTitle.textContent = "Mevcut Sohbetler";
            chatsContainer.appendChild(chatListTitle);

            if (state.chats.length === 0) {
                const emptyChats = document.createElement("div");
                emptyChats.style.cssText = "padding:16px; font-size:13px; color:var(--msg-text-muted); text-align:center;";
                emptyChats.textContent = "Henüz bir mesajlaşma bulunmuyor.";
                chatsContainer.appendChild(emptyChats);
            } else {
                state.chats.forEach(chat => {
                    const lastMsg = chat.messages[chat.messages.length - 1];
                    const previewText = lastMsg ? (lastMsg.sender === "outgoing" ? `Sen: ${lastMsg.text}` : lastMsg.text) : "Sohbete başlayın...";
                    const isActive = chat.id === state.activeChatPartnerId;

                    const item = document.createElement("div");
                    item.className = `msg-chat-item ${isActive ? "active" : ""}`;
                    item.innerHTML = `
                        <div class="msg-chat-avatar ${chat.online ? "online" : ""}">
                            ${escapeHtml(chat.avatar || chat.username.charAt(0).toUpperCase())}
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

        } else {
            // 1 & 2 NOLU RESİM KURALI:
            // Standart Butonlar: Bağlantı İstekleri, İsteklerim, Mesajlarım
            const pendingCount = state.requests.filter(r => r.status === "Pending").length;

            // 1. Bağlantı istekleri (uygulamada olmayan bir harita sayfasına yönlendirme yapmaz)
            const findFriendLink = document.createElement("a");
            findFriendLink.href = "#requests";
            findFriendLink.className = "msg-btn-pill";
            findFriendLink.title = "Bağlantı isteklerini incele";
            findFriendLink.innerHTML = `<i data-lucide="user-plus"></i> <span>İstekleri İncele</span>`;
            findFriendLink.addEventListener("click", (event) => {
                event.preventDefault();
                renderView("requests");
            });
            dom.msgNavGroup.appendChild(findFriendLink);

            // 2. İsteklerim
            const requestsBtn = document.createElement("button");
            requestsBtn.type = "button";
            requestsBtn.className = `msg-btn-pill ${state.currentView === "requests" ? "active" : ""}`;
            requestsBtn.innerHTML = `
                <i data-lucide="user-plus"></i> 
                <span>İsteklerim</span>
                ${pendingCount > 0 ? `<span class="msg-btn-badge">${pendingCount}</span>` : ""}
            `;
            requestsBtn.addEventListener("click", () => renderView("requests"));
            dom.msgNavGroup.appendChild(requestsBtn);

            // 3. Mesajlarım
            const messagesBtn = document.createElement("button");
            messagesBtn.type = "button";
            messagesBtn.className = "msg-btn-pill";
            messagesBtn.innerHTML = `
                <i data-lucide="message-square"></i> 
                <span>Mesajlarım</span>
                <span class="msg-btn-badge" style="background:rgba(255,255,255,0.15); color:var(--msg-text-main);">${state.chats.length}</span>
            `;
            messagesBtn.addEventListener("click", () => renderView("chat"));
            dom.msgNavGroup.appendChild(messagesBtn);

            if (window.lucide) {
                lucide.createIcons();
            }
        }
    }

    // =========================================================================
    // 2 NOLU RESİM: İSTEKLERİM TABLOSU & ONAY/RED İŞLEMLERİ
    // =========================================================================
    function renderRequestsTable() {
        if (!dom.requestsTableBody) return;
        dom.requestsTableBody.innerHTML = "";

        const searchTerm = dom.requestSearchInput?.value.trim().toLowerCase() || "";
        const pendingList = state.requests.filter(r => {
            if (r.status !== "Pending") return false;
            if (!searchTerm) return true;
            return (
                r.username.toLowerCase().includes(searchTerm) ||
                (r.fullName && r.fullName.toLowerCase().includes(searchTerm)) ||
                r.note.toLowerCase().includes(searchTerm)
            );
        });

        if (pendingList.length === 0) {
            if (dom.requestsEmptyState) dom.requestsEmptyState.style.display = "flex";
        } else {
            if (dom.requestsEmptyState) dom.requestsEmptyState.style.display = "none";

            pendingList.forEach(req => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>
                        <div class="msg-user-cell">
                            <div class="msg-user-avatar">${escapeHtml(req.avatar || req.username.charAt(0).toUpperCase())}</div>
                            <div>
                                <div class="msg-user-name">${escapeHtml(req.fullName || req.username)}</div>
                                <div class="msg-user-handle">@${escapeHtml(req.username)}</div>
                            </div>
                        </div>
                    </td>
                    <td style="white-space:nowrap; color:var(--msg-text-muted);">${escapeHtml(req.date)}</td>
                    <td style="max-width: 320px; color: var(--msg-text-main);">${escapeHtml(req.note)}</td>
                    <td>
                        <span class="msg-badge msg-badge-pending">Beklemede</span>
                    </td>
                    <td>
                        <div class="msg-actions-cell">
                            <button type="button" class="msg-action-btn approve" data-action="approve" data-id="${req.id}" title="İsteği Onayla">
                                <i data-lucide="check"></i>
                                <span>Onayla</span>
                            </button>
                            <button type="button" class="msg-action-btn reject" data-action="reject" data-id="${req.id}" title="İsteği Reddet">
                                <i data-lucide="x"></i>
                                <span>Reddet</span>
                            </button>
                        </div>
                    </td>
                `;

                // Onayla Butonu Olayı (Kural 2 & 3: onay verilince 3 nolu resimde görünecek)
                tr.querySelector('[data-action="approve"]').addEventListener("click", () => {
                    handleApproveRequest(req);
                });

                // Reddet Butonu Olayı
                tr.querySelector('[data-action="reject"]').addEventListener("click", () => {
                    handleRejectRequest(req);
                });

                dom.requestsTableBody.appendChild(tr);
            });
        }

        if (window.lucide) {
            lucide.createIcons();
        }

        updateCounts();
    }

    /**
     * Kural: "onay verildimi 3 nolu resimde goruncek"
     */
    function handleApproveRequest(req) {
        req.status = "Approved";

        // Sohbetlerde bu kişi zaten var mı kontrol et, yoksa oluştur
        let existingChat = state.chats.find(c => c.partnerId === req.userId);
        if (!existingChat) {
            existingChat = {
                id: `chat-req-${req.id}`,
                partnerId: req.userId,
                username: req.username,
                fullName: req.fullName || req.username,
                avatar: req.avatar || req.username.charAt(0).toUpperCase(),
                online: true,
                lastTime: "Şimdi",
                messages: [
                    {
                        id: 1,
                        sender: "incoming",
                        text: req.note,
                        time: req.date
                    },
                    {
                        id: 2,
                        sender: "outgoing",
                        text: "İsteğini kabul ettim, tanıştığımıza memnun oldum!",
                        time: "Şimdi"
                    }
                ]
            };
            // Sohbet listesinin en başına ekle
            state.chats.unshift(existingChat);
        }

        updateCounts();

        // Modal veya bilgilendirme mesajı
        if (window.GlobalModal) {
            window.GlobalModal.open({
                title: "İstek Kabul Edildi",
                description: `${req.fullName || req.username} ile arkadaşlık ve mesajlaşma isteğini onayladınız. Şimdi mesajlaşma ekranına geçebilirsiniz.`,
                type: "success",
                buttons: [
                    { text: "Tamam", variant: "secondary" },
                    {
                        text: "Sohbete Git",
                        variant: "primary",
                        callback: () => {
                            state.activeChatPartnerId = existingChat.id;
                            renderView("chat", existingChat.id);
                        }
                    }
                ]
            });
        } else {
            // Modal yoksa doğrudan sohbete geç
            state.activeChatPartnerId = existingChat.id;
            renderView("chat", existingChat.id);
        }

        renderRequestsTable();
    }

    function handleRejectRequest(req) {
        if (window.GlobalModal) {
            window.GlobalModal.open({
                title: "İsteği Reddet",
                description: `@${req.username} kullanıcısının isteğini reddetmek istediğinizden emin misiniz?`,
                type: "warning",
                buttons: [
                    { text: "Vazgeç", variant: "secondary" },
                    {
                        text: "Evet, Reddet",
                        variant: "danger",
                        callback: () => {
                            req.status = "Rejected";
                            updateCounts();
                            renderRequestsTable();
                        }
                    }
                ]
            });
        } else {
            req.status = "Rejected";
            updateCounts();
            renderRequestsTable();
        }
    }

    // =========================================================================
    // 3 NOLU RESİM: MESAJLARIM & SOHBET AKIŞI
    // =========================================================================
    function renderActiveChat() {
        const activeChat = state.chats.find(c => c.id === state.activeChatPartnerId) || state.chats[0];
        if (!activeChat) {
            if (dom.msgHeaderTitle) dom.msgHeaderTitle.textContent = "Mesajlarım";
            if (dom.msgHeaderSubtitle) dom.msgHeaderSubtitle.textContent = "Henüz aktif bir sohbetiniz bulunmuyor.";
            if (dom.chatMessagesArea) {
                dom.chatMessagesArea.innerHTML = `
                    <div class="msg-empty-state">
                        <div class="msg-empty-icon"><i data-lucide="message-square"></i></div>
                        <h3>Sohbet Seçilmedi</h3>
                        <p>İsteklerim bölümünden yeni istekleri onaylayabilir veya sol menüden bir sohbet seçebilirsiniz.</p>
                    </div>
                `;
                if (window.lucide) lucide.createIcons();
            }
            return;
        }

        state.activeChatPartnerId = activeChat.id;

        // Başlık ve profil bilgileri
        if (dom.breadcrumbCurrent) dom.breadcrumbCurrent.textContent = `Sohbet / ${activeChat.fullName || activeChat.username}`;
        if (dom.msgHeaderTitle) dom.msgHeaderTitle.textContent = activeChat.fullName || activeChat.username;
        if (dom.msgHeaderSubtitle) dom.msgHeaderSubtitle.textContent = `@${activeChat.username} ile mesajlaşma`;

        if (dom.activeChatAvatar) {
            dom.activeChatAvatar.textContent = activeChat.avatar || activeChat.username.charAt(0).toUpperCase();
        }
        if (dom.activeChatName) {
            dom.activeChatName.textContent = activeChat.fullName || activeChat.username;
        }
        if (dom.activeChatStatusText) {
            dom.activeChatStatusText.textContent = activeChat.online ? "Çevrimiçi" : "Çevrimdışı";
        }

        // Mesaj Geçmişini Çiz
        renderMessages(activeChat);
        renderSidebarNav(); // Sohbet seçimi vurgusunu güncelle
    }

    function renderMessages(chat) {
        if (!dom.chatMessagesArea) return;
        dom.chatMessagesArea.innerHTML = "";

        if (chat.messages.length === 0) {
            dom.chatMessagesArea.innerHTML = `
                <div class="msg-empty-state" style="padding: 32px 16px;">
                    <div class="msg-empty-icon"><i data-lucide="message-square-dashed"></i></div>
                    <h3>Mesaj Geçmişi Boş</h3>
                    <p>Bu sohbetteki tüm mesajlar temizlendi. Yeni bir mesaj yazarak tekrar konuşmaya başlayabilirsiniz.</p>
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
                    <button type="button" class="msg-bubble-delete-btn" data-msg-id="${msg.id}" title="Bu Mesajı Sil">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
                <div class="msg-bubble-meta">
                    <span>${escapeHtml(msg.time || "Şimdi")}</span>
                    ${msg.sender === "outgoing" ? '<i data-lucide="check-check" style="width:14px; height:14px;"></i>' : ''}
                </div>
            `;

            // Tek tek mesaj silme butonu olayı
            group.querySelector(".msg-bubble-delete-btn")?.addEventListener("click", () => {
                deleteSingleMessage(chat, msg.id);
            });

            dom.chatMessagesArea.appendChild(group);
        });

        if (window.lucide) {
            lucide.createIcons();
        }

        // Otomatik en alta kaydır
        scrollToBottom();
    }

    /**
     * Tek bir mesajı silme
     */
    function deleteSingleMessage(chat, msgId) {
        chat.messages = chat.messages.filter(m => m.id !== msgId);
        renderMessages(chat);
        renderSidebarNav();
    }

    /**
     * Dropdown Menü Aç/Kapat
     */
    function toggleChatDropdown(e) {
        if (e) e.stopPropagation();
        const isShown = dom.chatDropdownMenu?.classList.contains("show");
        if (isShown) {
            closeChatDropdown();
        } else {
            openChatDropdown();
        }
    }

    function openChatDropdown() {
        if (dom.chatDropdownMenu) dom.chatDropdownMenu.classList.add("show");
        if (dom.btnChatMenuToggle) dom.btnChatMenuToggle.classList.add("active");
    }

    function closeChatDropdown() {
        if (dom.chatDropdownMenu) dom.chatDropdownMenu.classList.remove("show");
        if (dom.btnChatMenuToggle) dom.btnChatMenuToggle.classList.remove("active");
    }

    /**
     * Tüm mesaj geçmişini temizleme
     */
    function handleClearHistory() {
        closeChatDropdown();
        const activeChat = state.chats.find(c => c.id === state.activeChatPartnerId);
        if (!activeChat || activeChat.messages.length === 0) return;

        const partnerName = activeChat.fullName || activeChat.username;

        if (window.GlobalModal) {
            window.GlobalModal.open({
                title: "Mesajları Temizle",
                description: `${partnerName} ile olan tüm mesaj geçmişini silmek istediğinize emin misiniz? Sohbet listede kalmaya devam edecek ancak mesajlar temizlenecektir.`,
                type: "warning",
                buttons: [
                    { text: "Vazgeç", variant: "secondary" },
                    {
                        text: "Evet, Temizle",
                        variant: "danger",
                        callback: () => {
                            activeChat.messages = [];
                            activeChat.lastTime = "Temizlendi";
                            renderMessages(activeChat);
                            renderSidebarNav();
                        }
                    }
                ]
            });
        } else {
            if (confirm(`${partnerName} ile olan tüm mesajları silmek istediğinize emin misiniz?`)) {
                activeChat.messages = [];
                activeChat.lastTime = "Temizlendi";
                renderMessages(activeChat);
                renderSidebarNav();
            }
        }
    }

    /**
     * Kullanıcı ile olan sohbeti tamamen silme (Listeden ve ekrandan kaldırma)
     */
    function handleDeleteConversation() {
        closeChatDropdown();
        const activeChat = state.chats.find(c => c.id === state.activeChatPartnerId);
        if (!activeChat) return;

        const partnerName = activeChat.fullName || activeChat.username;

        if (window.GlobalModal) {
            window.GlobalModal.open({
                title: "Sohbeti Tamamen Sil",
                description: `${partnerName} ile olan sohbeti ve tüm mesajları tamamen silmek istediğinize emin misiniz? Bu kullanıcı mesajlar listenizden kaldırılacaktır.`,
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
        } else {
            if (confirm(`${partnerName} ile olan sohbeti tamamen silmek istediğinize emin misiniz?`)) {
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
    }

    function scrollToBottom() {
        if (dom.chatMessagesArea) {
            dom.chatMessagesArea.scrollTop = dom.chatMessagesArea.scrollHeight;
        }
    }

    /**
     * Ortak modal altyapısı üzerinden yeni mesaj oluşturur.
     * Mesaj gönderildiğinde ilgili sohbet açılır; kullanıcı aynı ekranda kalmaz.
     */
    function openComposeModal() {
        if (!window.GlobalModal) return;

        if (state.chats.length === 0) {
            window.GlobalModal.alert({
                title: "Mesaj Gönderilecek Kişi Yok",
                message: "Önce gelen bir bağlantı isteğini onaylayarak sohbet başlatabilirsiniz."
            });
            return;
        }

        const recipientOptions = state.chats.map((chat) => {
            const label = `${chat.fullName || chat.username} (@${chat.username})`;
            return `<option value="${escapeHtml(chat.id)}">${escapeHtml(label)}</option>`;
        }).join("");

        const modalHtml = `
            <form class="msg-compose-form" id="composeMessageForm" novalidate>
                <div class="msg-compose-field">
                    <label for="composeRecipient">Alıcı</label>
                    <select id="composeRecipient" name="recipient">${recipientOptions}</select>
                </div>
                <div class="msg-compose-field">
                    <label for="composeMessageText">Mesajın</label>
                    <textarea id="composeMessageText" name="message" maxlength="1000" placeholder="Antrenmanla ilgili bir mesaj yaz..." required></textarea>
                    <p class="msg-compose-help">En fazla 1000 karakter. Mesaj gönderildiğinde ilgili sohbet açılır.</p>
                    <p class="msg-compose-error" id="composeMessageError" role="alert" hidden></p>
                </div>
            </form>`;

        window.GlobalModal.open({
            title: "Yeni Mesaj",
            description: "Bir sohbet seçip mesajını yaz.",
            type: "info",
            html: modalHtml,
            initialFocus: "#composeRecipient",
            buttons: [
                { text: "Vazgeç", variant: "secondary" },
                {
                    text: "Mesaj Gönder",
                    variant: "primary",
                    callback: () => {
                        const recipient = document.getElementById("composeRecipient");
                        const message = document.getElementById("composeMessageText");
                        const error = document.getElementById("composeMessageError");
                        const chat = state.chats.find((item) => item.id === recipient?.value);
                        const text = message?.value.trim();

                        if (!chat || !text) {
                            if (error) {
                                error.textContent = "Mesaj göndermek için bir alıcı seçip mesajını yazmalısın.";
                                error.hidden = false;
                            }
                            if (!text) message?.focus();
                            return false;
                        }

                        const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                        chat.messages.push({ id: Date.now(), sender: "outgoing", text, time });
                        chat.lastTime = time;
                        state.activeChatPartnerId = chat.id;
                        renderView("chat", chat.id);
                    }
                }
            ]
        });
    }

    /**
     * Kural 3: Content kısmında input ve Mesaj Gönder butonu ile mesaj gönderme
     */
    function handleSendMessage(e) {
        if (e) e.preventDefault();
        const text = dom.chatInputText?.value.trim();
        if (!text) return;

        const activeChat = state.chats.find(c => c.id === state.activeChatPartnerId);
        if (!activeChat) return;

        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const newMsg = {
            id: Date.now(),
            sender: "outgoing",
            text: text,
            time: timeStr
        };

        activeChat.messages.push(newMsg);
        activeChat.lastTime = timeStr;

        // Input'u temizle
        if (dom.chatInputText) dom.chatInputText.value = "";

        // UI Güncelle
        renderMessages(activeChat);
        renderSidebarNav();

        // 1.5 saniye sonra otomatik yanıt simülasyonu
        setTimeout(() => {
            if (activeChat.id === state.activeChatPartnerId) {
                const replies = [
                    "Mesajını aldım, antrenman sonrası detayları konuşalım!",
                    "Harika fikir, programa ekleyelim.",
                    "Tamamdır, anlaştık!",
                    "Teşekkürler, iyi çalışmalar!"
                ];
                const replyText = replies[Math.floor(Math.random() * replies.length)];
                activeChat.messages.push({
                    id: Date.now() + 1,
                    sender: "incoming",
                    text: replyText,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                });
                renderMessages(activeChat);
                renderSidebarNav();
            }
        }, 1200);
    }

    // =========================================================================
    // RESPONSIVE MOBİL SIDEBAR
    // =========================================================================
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

    // =========================================================================
    // ETKİLEŞİMLER
    // =========================================================================
    function initEventListeners() {
        // Mobil Hamburger
        if (dom.msgMenuToggle) dom.msgMenuToggle.addEventListener("click", () => {
            const isOpen = dom.msgSidebar?.classList.contains("is-open");
            if (isOpen) closeMobileSidebar(); else openMobileSidebar();
        });
        if (dom.msgSidebarClose) dom.msgSidebarClose.addEventListener("click", closeMobileSidebar);
        if (dom.msgSidebarOverlay) dom.msgSidebarOverlay.addEventListener("click", closeMobileSidebar);

        // Geri Dön Butonu
        if (dom.msgBackBtn) {
            dom.msgBackBtn.addEventListener("click", () => {
                if (state.currentView !== "overview") {
                    renderView("overview");
                } else {
                    window.location.href = "index.html";
                }
            });
        }

        // Breadcrumb Anasayfa Butonu
        if (dom.bcHomeBtn) {
            dom.bcHomeBtn.addEventListener("click", () => renderView("overview"));
        }

        // Özet Kart Tıklamaları
        if (dom.cardGoToRequests) dom.cardGoToRequests.addEventListener("click", () => renderView("requests"));
        if (dom.bannerOpenRequestsBtn) dom.bannerOpenRequestsBtn.addEventListener("click", () => renderView("requests"));
        if (dom.cardGoToChats) dom.cardGoToChats.addEventListener("click", () => renderView("chat"));
        if (dom.cardGoToFindFriends) {
            dom.cardGoToFindFriends.addEventListener("click", () => renderView("requests"));
        }
        if (dom.bannerOpenRequestsLink) {
            dom.bannerOpenRequestsLink.addEventListener("click", (event) => {
                event.preventDefault();
                renderView("requests");
            });
        }
        if (dom.btnOpenComposeModal) {
            dom.btnOpenComposeModal.addEventListener("click", openComposeModal);
        }

        [dom.cardGoToRequests, dom.cardGoToChats, dom.cardGoToFindFriends]
            .filter(Boolean)
            .forEach((card) => card.addEventListener("keydown", (event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    card.click();
                }
            }));

        // İstek Arama
        if (dom.requestSearchInput) {
            dom.requestSearchInput.addEventListener("input", renderRequestsTable);
        }

        // Mesaj Gönderme Formu
        if (dom.chatMessageForm) {
            dom.chatMessageForm.addEventListener("submit", handleSendMessage);
        }

        // 3 Nokta Butonu (Aç/Kapat)
        if (dom.btnChatMenuToggle) {
            dom.btnChatMenuToggle.addEventListener("click", toggleChatDropdown);
        }

        // Dropdown İçi: Mesajları Temizle
        if (dom.btnClearChatHistory) {
            dom.btnClearChatHistory.addEventListener("click", handleClearHistory);
        }

        // Dropdown İçi: Sohbeti Tamamen Sil
        if (dom.btnDeleteConversation) {
            dom.btnDeleteConversation.addEventListener("click", handleDeleteConversation);
        }

        // Sayfa tıklandığında dropdown'ı kapat
        document.addEventListener("click", (e) => {
            if (!e.target.closest(".msg-dropdown-wrapper")) {
                closeChatDropdown();
            }
        });
    }

    function escapeHtml(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // DOM Hazır Olduğunda Başlat
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
