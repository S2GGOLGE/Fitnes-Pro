// =========================================================
// FITNESS PRO - LOGIN BLOCK SYSTEM (DISABLED STUB)
// =========================================================
//
// Bu dosya artık aktif değil.
//
// Rate limit / hesap bloklama kararları tamamen backend
// tarafından yönetilmektedir. Backend response yapısı:
//
//   {
//     success:          boolean,
//     message:          string,
//     data:             object | null,
//     rateLimited:      boolean,
//     remainingSeconds: number | null,
//     accountLocked:    boolean
//   }
//
// Frontend bu body alanlarına göre hareket eder (bkz.
// LoginEndpoint.js). Eski frontend-tabanlı sayaç, localStorage
// state ve countdown mantığı devre dışı bırakıldı.
//
// Bu stub SADECE geriye uyumluluk içindir:
// Başka sayfalar veya scriptler eski public API'yi
// (window.LoginBlockSystem.isBlocked, .handleFailedLogin vb.)
// çağırırsa hata fırlatmasın diye boş no-op fonksiyonlar
// olarak tutuluyor. Hiçbir yan etkisi yoktur.
// =========================================================

(function () {
    "use strict";

    function noop() {
        return undefined;
    }

    function alwaysFalse() {
        return false;
    }

    function alwaysZero() {
        return 0;
    }

    window.LoginBlockSystem = {
        // State
        getState: alwaysFalse,
        saveState: noop,
        clearState: noop,

        // Sayaç
        getAttemptCount: alwaysZero,
        incrementAttempt: alwaysZero,
        resetAttempt: noop,

        // Engel
        startBlock: noop,
        stopBlock: noop,
        isBlocked: alwaysFalse,
        getRemainingTime: alwaysZero,

        // Login
        handleFailedLogin: noop,
        handleSuccessfulLogin: noop,

        // UI
        updateBlockUI: noop
    };

    // NOT: Sayfa yüklendiğinde restoreState çağrısı YAPILMAZ.
    // Tüm rate-limit UI yönetimi artık LoginRateLimitUI.js
    // üzerinden backend body alanlarına göre yapılmaktadır.

})();
