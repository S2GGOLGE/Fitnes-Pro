// FITNESS PRO - GLOBAL MODAL MANAGER
// Central, feature-agnostic modal infrastructure.
(function () {
    "use strict";

    const FOCUSABLE = ['button:not([disabled]):not([aria-hidden="true"])', '[href]:not([aria-hidden="true"])', 'input:not([disabled]):not([type="hidden"])', 'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])'].join(",");

    class GlobalModalManager {
        constructor() {
            this.modal = null;
            this.overlay = null;
            this.dialog = null;
            this.closeButton = null;
            this.titleElement = null;
            this.descriptionElement = null;
            this.contentElement = null;
            this.iconElement = null;
            this.actionsElement = null;
            this.currentOptions = null;
            this.lastFocusedElement = null;
            this.previousBodyOverflow = "";
            this.buttonConfigs = [];
            this.initialized = false;
            this.boundKeydown = this.handleKeydown.bind(this);
            this.boundOverlayClick = this.handleOverlayClick.bind(this);
            this.boundClick = this.handleClick.bind(this);
        }

        initialize() {
            if (this.initialized) return this;
            this.createStructure();
            this.modal.addEventListener("click", this.boundClick);
            this.overlay.addEventListener("click", this.boundOverlayClick);
            document.addEventListener("keydown", this.boundKeydown);
            this.initialized = true;
            return this;
        }

        createStructure() {
            const existing = document.getElementById("globalModal");
            if (existing) {
                this.modal = existing;
                this.overlay = existing.querySelector(".global-modal-overlay");
                this.dialog = existing.querySelector(".global-modal-content");
                this.closeButton = existing.querySelector(".global-modal-close");
                this.titleElement = existing.querySelector(".global-modal-title");
                this.descriptionElement = existing.querySelector(".global-modal-description");
                this.contentElement = existing.querySelector(".global-modal-body");
                this.iconElement = existing.querySelector(".global-modal-icon");
                this.actionsElement = existing.querySelector(".global-modal-actions");
                if (this.overlay && this.dialog && this.closeButton && this.titleElement && this.descriptionElement && this.contentElement && this.iconElement && this.actionsElement) return;
                existing.remove();
            }

            const modal = document.createElement("div");
            modal.id = "globalModal";
            modal.className = "global-modal";
            modal.setAttribute("aria-hidden", "true");
            const overlay = document.createElement("div");
            overlay.className = "global-modal-overlay";
            overlay.setAttribute("aria-hidden", "true");
            const dialog = document.createElement("section");
            dialog.className = "global-modal-content";
            dialog.setAttribute("role", "dialog");
            dialog.setAttribute("aria-modal", "true");
            dialog.setAttribute("aria-labelledby", "globalModalTitle");
            dialog.setAttribute("tabindex", "-1");
            const closeButton = document.createElement("button");
            closeButton.className = "global-modal-close";
            closeButton.type = "button";
            closeButton.dataset.globalModalClose = "true";
            closeButton.setAttribute("aria-label", "Modalı kapat");
            closeButton.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6L18 18M6 18L18 6"/></svg>';
            const header = document.createElement("header");
            header.className = "global-modal-header";
            const icon = document.createElement("div");
            icon.className = "global-modal-icon";
            icon.setAttribute("aria-hidden", "true");
            const heading = document.createElement("div");
            heading.className = "global-modal-title-container";
            const title = document.createElement("h2");
            title.className = "global-modal-title";
            title.id = "globalModalTitle";
            const description = document.createElement("p");
            description.className = "global-modal-description";
            description.id = "globalModalDescription";
            heading.append(title, description);
            header.append(icon, heading);
            const body = document.createElement("div");
            body.className = "global-modal-body";
            body.id = "globalModalBody";
            const actions = document.createElement("footer");
            actions.className = "global-modal-actions";
            actions.id = "globalModalActions";
            dialog.append(closeButton, header, body, actions);
            modal.append(overlay, dialog);
            document.body.appendChild(modal);
            this.modal = modal;
            this.overlay = overlay;
            this.dialog = dialog;
            this.closeButton = closeButton;
            this.titleElement = title;
            this.descriptionElement = description;
            this.contentElement = body;
            this.iconElement = icon;
            this.actionsElement = actions;
        }

        open(options = {}) {
            this.initialize();
            const isReplacing = this.isOpen();
            const originalTrigger = this.lastFocusedElement;
            if (isReplacing) this.finishCurrent("replace", false);
            const isLoading = options.loading === true || options.type === "loading";
            this.currentOptions = {
                closeOnOverlay: !isLoading,
                closeOnEscape: !isLoading,
                closeButton: !isLoading,
                ...options
            };
            this.lastFocusedElement = isReplacing
                ? originalTrigger
                : (document.activeElement instanceof HTMLElement ? document.activeElement : null);
            this.render(this.currentOptions);
            this.previousBodyOverflow = document.body.style.overflow;
            document.body.style.overflow = "hidden";
            this.modal.classList.add("show");
            this.modal.setAttribute("aria-hidden", "false");
            requestAnimationFrame(() => this.focusInitialElement());
            return this;
        }

        close(reason = "close") {
            if (this.isOpen()) this.finishCurrent(reason, true);
        }

        finishCurrent(reason, restoreFocus) {
            const options = this.currentOptions;
            this.modal.classList.remove("show");
            this.modal.setAttribute("aria-hidden", "true");
            document.body.style.overflow = this.previousBodyOverflow;
            this.buttonConfigs = [];
            this.currentOptions = null;
            if (restoreFocus && this.lastFocusedElement && document.contains(this.lastFocusedElement)) this.lastFocusedElement.focus();
            this.lastFocusedElement = null;
            if (typeof options?.onClose === "function") options.onClose(reason);
        }

        isOpen() { return Boolean(this.modal && this.modal.classList.contains("show")); }

        render(options) {
            const type = options.type || "custom";
            this.modal.dataset.type = type;
            this.dialog.className = `global-modal-content size-${options.size || "default"}`;
            this.setText(this.titleElement, options.title);
            this.setText(this.descriptionElement, options.description);
            if (options.description) this.dialog.setAttribute("aria-describedby", "globalModalDescription");
            else this.dialog.removeAttribute("aria-describedby");
            if (options.title) {
                this.dialog.setAttribute("aria-labelledby", "globalModalTitle");
                this.dialog.removeAttribute("aria-label");
            } else {
                this.dialog.removeAttribute("aria-labelledby");
                this.dialog.setAttribute("aria-label", options.ariaLabel || "Modal");
            }
            this.setIcon(options.icon, type);
            const isLoading = options.loading === true || type === "loading";
            this.closeButton.hidden = options.closeButton === false || isLoading;
            this.closeButton.disabled = options.closeButton === false || isLoading;
            const content = options.html ?? options.content;
            this.contentElement.replaceChildren();
            if (content instanceof Node) this.contentElement.appendChild(content);
            else if (content !== undefined && content !== null && content !== "") this.contentElement.innerHTML = String(content);
            this.contentElement.hidden = !this.contentElement.hasChildNodes();
            const buttons = options.buttons || [];
            this.buttonConfigs = buttons;
            this.actionsElement.replaceChildren();
            buttons.forEach((config, index) => this.actionsElement.appendChild(this.createButton(config, index)));
            this.actionsElement.hidden = buttons.length === 0;
        }

        setText(element, value) {
            const hasValue = value !== undefined && value !== null && value !== "";
            element.textContent = hasValue ? String(value) : "";
            element.hidden = !hasValue;
        }

        setIcon(icon, type) {
            const iconHtml = icon === false ? "" : (icon || this.getDefaultIcon(type));
            this.iconElement.innerHTML = iconHtml || "";
            this.iconElement.hidden = !iconHtml;
        }

        getDefaultIcon(type) {
            const icons = {
                info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
                success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 12 4 4L19 6"/></svg>',
                warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3 2 21h20L12 3Z"/><path d="M12 9v4m0 4h.01"/></svg>',
                error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6m0-6 6 6"/></svg>',
                confirmation: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3 2 21h20L12 3Z"/><path d="M12 9v4m0 4h.01"/></svg>',
                delete: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2m-9 0 1 15h8l1-15"/></svg>',
                loading: '<span class="global-modal-loader" aria-label="Yükleniyor"></span>'
            };
            return icons[type] || "";
        }

        createButton(config = {}, index) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = `global-modal-button ${config.className || this.classForButton(config.variant) || ""}`.trim();
            button.dataset.globalModalAction = String(index);
            button.textContent = config.text || "Tamam";
            button.disabled = Boolean(config.disabled || config.loading);
            button.setAttribute("aria-busy", String(Boolean(config.loading)));
            if (config.loading) button.innerHTML = `<span class="global-modal-button-spinner" aria-hidden="true"></span>${this.escapeText(config.loadingText || config.text || "Yükleniyor...")}`;
            return button;
        }

        classForButton(variant) { return { primary: "global-modal-button-primary", secondary: "global-modal-button-secondary", danger: "global-modal-button-danger" }[variant] || ""; }
        escapeText(value) { const span = document.createElement("span"); span.textContent = String(value); return span.innerHTML; }

        async runAction(index, button) {
            const config = this.buttonConfigs[index];
            if (!config || button.disabled) return;
            let result;
            try {
                if (typeof config.callback === "function") {
                    result = config.callback({ close: (reason) => this.close(reason), setLoading: (value) => this.setLoading(index, value) });
                    if (result && typeof result.then === "function") { this.setLoading(index, true); result = await result; }
                }
                // A callback may intentionally replace this modal. In that case,
                // never close the newly opened instance from the old action.
                if (this.buttonConfigs[index] === config && result !== false && config.closeOnClick !== false) {
                    this.close("action");
                }
            } catch (error) {
                this.setLoading(index, false);
                console.error("[GlobalModal] Button callback failed:", error);
            }
        }

        setLoading(target, loading = true) {
            const index = typeof target === "number" ? target : this.buttonConfigs.findIndex((item) => item.id === target);
            const config = this.buttonConfigs[index];
            const button = this.actionsElement.querySelector(`[data-global-modal-action="${index}"]`);
            if (!config || !button) return;
            config.loading = loading;
            button.disabled = loading;
            button.setAttribute("aria-busy", String(loading));
            button.innerHTML = loading ? `<span class="global-modal-button-spinner" aria-hidden="true"></span>${this.escapeText(config.loadingText || config.text || "Yükleniyor...")}` : this.escapeText(config.text || "Tamam");
        }

        handleClick(event) {
            const closeButton = event.target.closest("[data-global-modal-close]");
            if (closeButton && !closeButton.disabled) this.close("close-button");
            const action = event.target.closest("[data-global-modal-action]");
            if (action) this.runAction(Number(action.dataset.globalModalAction), action);
        }

        handleOverlayClick(event) { if (event.target === this.overlay && this.currentOptions?.closeOnOverlay !== false) this.close("overlay"); }
        handleKeydown(event) {
            if (!this.isOpen()) return;
            if (event.key === "Escape" && this.currentOptions?.closeOnEscape !== false) { event.preventDefault(); this.close("escape"); }
            else if (event.key === "Tab") this.trapFocus(event);
        }

        trapFocus(event) {
            const focusable = Array.from(this.dialog.querySelectorAll(FOCUSABLE));
            if (!focusable.length) { event.preventDefault(); this.dialog.focus(); return; }
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }

        focusInitialElement() {
            if (!this.isOpen()) return;
            const selector = this.currentOptions?.initialFocus;
            const initial = selector && this.dialog.querySelector(selector);
            const focusable = Array.from(this.dialog.querySelectorAll(FOCUSABLE));
            (initial || focusable[0] || this.dialog).focus();
        }

        confirm(options = {}) {
            const { onConfirm, onCancel, ...rest } = options;
            return this.open({ type: "confirmation", title: "Emin misiniz?", description: "Bu işlemi gerçekleştirmek istediğinize emin misiniz?", buttons: [{ text: "İptal", variant: "secondary", callback: onCancel }, { text: "Onayla", variant: "primary", callback: onConfirm }], ...rest });
        }

        alert(options = {}) {
            const { message, ...rest } = options;
            return this.open({ type: "info", title: "Bilgi", description: message || "", buttons: [{ text: "Tamam", variant: "primary" }], ...rest });
        }
    }

    // Script accidentally included twice? Reuse the same manager so document
    // keyboard and delegated click listeners are never duplicated.
    const manager = window.__fitnessProGlobalModalManager || new GlobalModalManager();
    window.__fitnessProGlobalModalManager = manager;
    const expose = () => {
        manager.initialize();
        window.GlobalModal = { open: (options) => manager.open(options), close: (reason) => manager.close(reason), confirm: (options) => manager.confirm(options), alert: (options) => manager.alert(options), setLoading: (target, loading) => manager.setLoading(target, loading), isOpen: () => manager.isOpen() };
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", expose, { once: true });
    else expose();
})();
