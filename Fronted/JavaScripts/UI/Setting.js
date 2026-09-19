(() => {
    const content = document.getElementById('dynamic-content');
    const navButtons = [...document.querySelectorAll('.nav-btn')];
    const sidebar = document.getElementById('settings-sidebar');
    const toggle = document.querySelector('[data-sidebar-open]');
    let twoFactorEnabled = false;
    let currentView = null;
    const avatar = (letters = 'US') => `<div class="avatar avatar-medium" aria-hidden="true">${letters}</div>`;
    const header = (tag, title, text) => `<header class="page-header"><p class="eyebrow">${tag}</p><h1>${title}</h1><p>${text}</p></header>`;
    const status = (text, type = 'success') => `<span class="status status-${type}"><i></i>${text}</span>`;
    const listItem = (letters, title, description, end) => `<div class="list-item">${avatar(letters)}<div class="list-copy"><h3>${title}</h3><p>${description}</p></div>${end}</div>`;
    const twoFactorVerification = () => twoFactorEnabled
        ? `<div class="two-factor-verification"><div class="two-factor-verification-header"><div><h3>E-posta doğrulaması</h3><p>Doğrulama kodunu e-posta adresinize gönderin.</p></div><button type="button" class="button button-primary" id="twoFactorSendCodeButton">Doğrulama Kodu Gönder</button></div></div>`
        : '';
    const account = () => `${header('HESABIM', 'Hesap ayarları', 'Profilini ve güvenlik tercihlerini tek yerden yönet.')}<div class="settings-stack"><article class="card profile-summary"><div class="profile-summary-main">${avatar('NS')}<div class="profile-details"><span class="card-kicker">PROFİL</span><h2>Name Surname</h2><p>Fitness Pro üyesi</p></div></div><div class="progress-block" aria-label="Profil ilerlemesi yüzde 65"><div class="progress-copy"><span>Profil tamamlanma</span><strong>%65</strong></div><div class="progress-track"><span style="width:65%"></span></div></div></article><article class="card security-card"><div class="card-heading"><div><span class="card-kicker">GÜVENLİK</span><h2>Hesap güvenliği</h2><p>Hesabına ek bir doğrulama katmanı ekle.</p></div><b class="security-icon" aria-hidden="true">⌑</b></div><div class="setting-row"><div><h3>İki faktörlü doğrulama</h3><p>Giriş sırasında ek doğrulama iste.</p></div>${status(twoFactorEnabled ? 'Etkin' : 'Kapalı', twoFactorEnabled ? 'success' : 'muted')}<button type="button" class="button button-secondary" id="twoFactorButton">${twoFactorEnabled ? '2FA’yı Kapat' : '2FA’yı Aç'}</button></div>${twoFactorVerification()}</article></div>`;
    const password = () => `${header('GÜVENLİK', 'Şifre güncelle', 'Güçlü ve yalnızca senin kullandığın bir şifre seç.')}<article class="card form-card"><div class="card-heading"><div><span class="card-kicker">ŞİFRE</span><h2>Yeni şifre oluştur</h2><p>Değişiklik sonrası uygulama tercihlerin korunur.</p></div></div><form id="passwordForm"><label class="form-group"><span>Mevcut şifre</span><input class="form-input" type="password" autocomplete="current-password" placeholder="Mevcut şifrenizi giriniz" required></label><label class="form-group"><span>Yeni şifre</span><input class="form-input" type="password" autocomplete="new-password" placeholder="Yeni şifrenizi giriniz" required></label><label class="form-group"><span>Yeni şifre tekrarı</span><input class="form-input" type="password" autocomplete="new-password" placeholder="Yeni şifrenizi tekrar giriniz" required></label><div class="form-actions"><button class="button button-primary" type="submit">Şifreyi Güncelle</button></div></form></article>`;
    const applications = () => `${header('BAŞVURULAR', 'Başvurularım', 'Gönderdiğin başvuruların güncel durumunu takip et.')}<article class="card"><div class="list-container">${listItem('FP', 'Fitness Pro Başvurusu', 'Başvuru tarihi: 02.09.2026', status('Değerlendiriliyor', 'warning'))}${listItem('AT', 'Antrenör Başvurusu', 'Başvuru tarihi: 28.08.2026', status('Aktif'))}</div></article>`;
    const subscriptions = () => `${header('ABONELİK', 'Aboneliklerim', 'Planının ve üyeliğinin ayrıntılarını görüntüle.')}<article class="card"><div class="list-container">${listItem('◆', 'Fitness Pro Premium', 'Aylık Premium üyelik', status('Aktif'))}${listItem('◷', 'Üyelik başlangıcı', '01.09.2026', status('Aktif'))}</div></article>`;
    const coaches = () => `${header('EKİBİM', 'Hocalarım', 'Bağlı olduğun antrenörlere hızlıca ulaş.')}<article class="card"><div class="list-container">${listItem('CN', 'Coach Name', 'Fitness antrenörü', '<button class="button button-secondary" type="button">Profili Gör</button>')}${listItem('CS', 'Coach Surname', 'Personal trainer', '<button class="button button-secondary" type="button">Profili Gör</button>')}</div></article>`;
    const messages = () => `${header('MESAJLAR', 'Mesaj isteklerim', 'Sana ulaşmak isteyen üyelerin isteklerini yönet.')}<article class="card"><div class="request-list"><div class="request-item"><div class="request-meta">${avatar('NS')}<div><h3>Name Surname</h3><time datetime="2026-09-02">02.09.2026</time></div></div><p>Size mesaj göndermek istiyor.</p><button class="button button-primary" type="button">Kabul Et</button></div><div class="request-item"><div class="request-meta">${avatar('UE')}<div><h3>User Example</h3><time datetime="2026-09-01">01.09.2026</time></div></div><p>Yeni bir mesaj isteği gönderdi.</p><button class="button button-primary" type="button">Kabul Et</button></div></div></article>`;
    const views = { account, password, applications, subscriptions, coaches, messages };
    const closeSidebar = () => { sidebar.classList.remove('is-open'); document.body.classList.remove('sidebar-is-open'); toggle?.setAttribute('aria-expanded', 'false'); };
    function showToast(message, type) {
        if (!window.GlobalModal || typeof window.GlobalModal.alert !== "function") return;
        const safeMessage = message || "İşlem tamamlandı.";
        const safeType = type === "success" || type === "error" || type === "warning" || type === "info" ? type : "info";
        const title = safeType === "success" ? "İşlem Başarılı" : safeType === "error" ? "Hata" : "Bilgi";
        window.GlobalModal.alert({ type: safeType, title, message: safeMessage });
    }

    async function handleTwoFactorToggle(event) {
        const button = event && event.currentTarget;
        if (!button) return;

        if (!window.TwoFactorEndpoint) {
            showToast("2FA servisi şu anda kullanılamıyor.", "error");
            return;
        }

        const previousState = twoFactorEnabled;
        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = "İşleniyor...";

        try {
            const payload = previousState
                ? await window.TwoFactorEndpoint.disable()
                : await window.TwoFactorEndpoint.enable();

            const nextState = !!(payload && payload.isEnabled);
            twoFactorEnabled = nextState;
            loadView('account');
            const successMessage = (payload && payload.message)
                || (previousState ? "İki faktörlü doğrulama devre dışı bırakıldı." : "İki faktörlü doğrulama etkinleştirildi.");
            showToast(successMessage, "success");
        } catch (error) {
            twoFactorEnabled = previousState;
            button.disabled = false;
            button.textContent = originalText;
            const errorMessage = (error && error.message) || "2FA durumu güncellenemedi.";
            showToast(errorMessage, "error");
        }
    }

    async function handleSendTwoFactorCode(event) {
        const button = event && event.currentTarget;
        if (!button || !window.TwoFactorEndpoint) return;

        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = 'Gönderiliyor...';

        try {
            const payload = await window.TwoFactorEndpoint.sendCode();
            button.disabled = false;
            button.textContent = originalText;
            openTwoFactorVerificationModal(
                (payload && payload.message) || 'Doğrulama kodu e-posta adresinize gönderildi.'
            );
        } catch (error) {
            button.disabled = false;
            button.textContent = originalText;
            showToast((error && error.message) || 'Doğrulama kodu gönderilemedi.', 'error');
        }
    }

    function keepOnlySixDigits(event) {
        const input = event.currentTarget;
        input.value = input.value.replace(/\D/g, '').slice(0, 6);
    }

    function setTwoFactorModalError(message) {
        const error = document.getElementById('twoFactorModalError');
        if (!error) return;
        error.textContent = message;
        error.hidden = false;
    }

    function openTwoFactorVerificationModal(sentMessage) {
        if (!window.GlobalModal || typeof window.GlobalModal.open !== 'function') {
            showToast('Doğrulama ekranı açılamadı.', 'error');
            return;
        }

        window.GlobalModal.open({
            type: 'info',
            title: 'E-posta doğrulaması',
            description: sentMessage,
            closeOnOverlay: false,
            closeOnEscape: false,
            closeButton: false,
            initialFocus: '#twoFactorModalCode',
            html: '<div class="two-factor-modal-code"><label class="form-group"><span>6 haneli doğrulama kodu</span><input class="form-input two-factor-code-input" id="twoFactorModalCode" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" placeholder="123456" aria-describedby="twoFactorModalCodeHelp twoFactorModalError" required><small id="twoFactorModalCodeHelp">E-posta adresinize gönderilen 6 haneli kodu girin.</small></label><p class="two-factor-modal-error" id="twoFactorModalError" role="alert" hidden></p></div>',
            buttons: [{
                text: 'Kodu Doğrula',
                loadingText: 'Doğrulanıyor...',
                variant: 'primary',
                closeOnClick: false,
                callback: ({ close, setLoading }) => {
                    const input = document.getElementById('twoFactorModalCode');
                    const code = input ? input.value.trim() : '';

                    if (!/^\d{6}$/.test(code)) {
                        setTwoFactorModalError('Lütfen 6 haneli doğrulama kodunu girin.');
                        input?.focus();
                        return false;
                    }

                    input.disabled = true;
                    return window.TwoFactorEndpoint.verify(code)
                        .then(payload => {
                            if (!payload || payload.verified !== true) {
                                throw new Error((payload && payload.message) || 'Doğrulama tamamlanamadı.');
                            }

                            input.value = '';
                            close('verified');
                            showToast('İki faktörlü doğrulama başarılı.', 'success');
                            return false;
                        })
                        .catch(error => {
                            input.disabled = false;
                            setLoading(false);
                            setTwoFactorModalError((error && error.message) || 'Doğrulama kodu geçersiz veya süresi dolmuş.');
                            input.focus();
                            return false;
                        });
                }
            }]
        });

        document.getElementById('twoFactorModalCode')?.addEventListener('input', keepOnlySixDigits);
    }

    function bindEvents() {
        document.getElementById('twoFactorButton')?.addEventListener('click', handleTwoFactorToggle);
        document.getElementById('twoFactorSendCodeButton')?.addEventListener('click', handleSendTwoFactorCode);
        document.getElementById('passwordForm')?.addEventListener('submit', event => {
            event.preventDefault();
            const submitButton = event.currentTarget.querySelector('button');
            submitButton.textContent = 'Kaydedildi';
            submitButton.disabled = true;
        });
    }

    function loadView(name) {
        if (!views[name]) return;
        currentView = name;
        content.classList.add('is-changing');
        setTimeout(() => {
            content.innerHTML = views[name]();
            navButtons.forEach(btn => {
                const active = btn.dataset.view === name;
                btn.classList.toggle('active', active);
                btn.setAttribute('aria-current', active ? 'page' : 'false');
            });
            bindEvents();
            requestAnimationFrame(() => content.classList.remove('is-changing'));
        }, 120);
        closeSidebar();
    }

    async function fetchInitialTwoFactorStatus() {
        if (!window.TwoFactorEndpoint) return;
        try {
            const payload = await window.TwoFactorEndpoint.fetchStatus();
            const nextState = !!(payload && payload.isEnabled);
            if (nextState !== twoFactorEnabled) {
                twoFactorEnabled = nextState;
                if (currentView === 'account') {
                    loadView('account');
                }
            }
        } catch (error) {
            console.warn("2FA durumu alınamadı:", error);
        }
    }

    navButtons.forEach(btn => btn.addEventListener('click', () => loadView(btn.dataset.view)));
    toggle?.addEventListener('click', () => { sidebar.classList.add('is-open'); document.body.classList.add('sidebar-is-open'); toggle.setAttribute('aria-expanded', 'true'); });
    document.querySelectorAll('[data-sidebar-close]').forEach(el => el.addEventListener('click', closeSidebar));
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closeSidebar(); });
    loadView('account');
    fetchInitialTwoFactorStatus();
})();
