# LoginBlockSystem Duzeltme-2 Simülasyonu
# 6. denemede 5 dakika blok tetiklenmemesi + LoginRateLimitUI koordinasyonu

$ErrorActionPreference = 'Stop'

# =========================================================
# STATE STORE (LoginBlockSystem + LoginRateLimitUI simülasyonu)
# =========================================================
$script:LBS_STORE = @{
    attemptCount   = 0
    blocked        = $false
    blockLevel     = $null
    blockStartedAt = $null
    blockUntil     = $null
}

$script:LRU_STORE = @{
    active         = $false
    duration       = 0
    until          = 0
    message        = $null
    suppressed     = $false  # 5dk countdown'un bastırılıp bastırılmadığı
}

# =========================================================
# LoginBlockSystem fonksiyonları
# =========================================================
function LBS-Get-InitialState { return @{attemptCount=0;blocked=$false;blockLevel=$null;blockStartedAt=$null;blockUntil=$null} }
function LBS-Get-State { return $script:LBS_STORE }
function LBS-Save-State($s) { $script:LBS_STORE = $s }
function LBS-Is-BlockExpired($s) { if (-not $s.blocked) { return $false }; if (-not $s.blockUntil) { return $false }; return (Get-Date).Ticks / 10000 -ge $s.blockUntil }
function LBS-Is-Blocked { $s = LBS-Get-State; if (-not $s.blocked) { return $false }; if (LBS-Is-BlockExpired $s) { return $false }; return $true }
function LBS-Get-AttemptCount { $s = LBS-Get-State; return $s.attemptCount }

function LBS-Increment-Attempt {
    $s = LBS-Get-State
    $s.attemptCount = $s.attemptCount + 1
    LBS-Save-State $s
    Write-Host "  [LOGIN BLOCK] Current attempt count: $($s.attemptCount)" -ForegroundColor DarkGray
    return $s.attemptCount
}

function LBS-Reset-Attempt {
    $s = LBS-Get-State; $old = $s.attemptCount; $s.attemptCount = 0; LBS-Save-State $s
    Write-Host "  [LOGIN BLOCK] Attempt counter reset: $old -> 0" -ForegroundColor DarkGray
}

function LBS-Start-Block($level) {
    $s = LBS-Get-State
    $duration = if ($level -eq "FIVE_MINUTES") { 5 * 60 * 1000 } else { 10 * 60 * 1000 }
    if ($s.blocked) {
        $currentDuration = if ($s.blockLevel -eq "FIVE_MINUTES") { 5 * 60 * 1000 } else { 10 * 60 * 1000 }
        if ($currentDuration -gt $duration) { Write-Host "  [LOGIN BLOCK] Block already at higher level, not downgrading" -ForegroundColor Yellow; return }
        if ($s.blockLevel -eq $level) { Write-Host "  [LOGIN BLOCK] Block already at level $level" -ForegroundColor Yellow; return }
    }
    Write-Host "  [LOGIN BLOCK] Starting $level block" -ForegroundColor Cyan
    $s.blocked = $true; $s.blockLevel = $level; $s.blockStartedAt = (Get-Date).Ticks/10000; $s.blockUntil = (Get-Date).Ticks/10000 + $duration
    LBS-Save-State $s
}

function LBS-Stop-Block {
    $s = LBS-Get-State; if (-not $s.blocked) { return }
    $previousLevel = $s.blockLevel; $preservedCount = $s.attemptCount
    Write-Host "  [LOGIN BLOCK] Stopping block: $previousLevel" -ForegroundColor DarkGray
    if ($previousLevel -eq "TEN_MINUTES") {
        Write-Host "  [LOGIN BLOCK] TEN_MINUTES block expired - resetting attemptCount to 0" -ForegroundColor DarkGray
        $s.attemptCount = 0
    } elseif ($previousLevel -eq "FIVE_MINUTES") {
        Write-Host "  [LOGIN BLOCK] FIVE_MINUTES block expired - preserving attemptCount: $preservedCount" -ForegroundColor DarkGray
    }
    $s.blocked = $false; $s.blockLevel = $null; $s.blockStartedAt = $null; $s.blockUntil = $null
    LBS-Save-State $s
}

function LBS-Restore-State {
    Write-Host "[LOGIN BLOCK] Restoring state on page load" -ForegroundColor DarkCyan
    $s = LBS-Get-State
    if (LBS-Is-BlockExpired $s) {
        Write-Host "[LOGIN BLOCK] Block expired on page load, cleaning block state" -ForegroundColor Yellow
        LBS-Stop-Block
        $r = LBS-Get-State
        Write-Host "[LOGIN BLOCK] Current attempt count after cleanup: $($r.attemptCount)" -ForegroundColor DarkGray
        return
    }
    if ($s.blocked) { Write-Host "[LOGIN BLOCK] Block active: $($s.blockLevel)" -ForegroundColor Cyan }
    else { Write-Host "[LOGIN BLOCK] No active block" -ForegroundColor DarkGray }
}

function LBS-Handle-FailedLogin {
    Write-Host "[LOGIN BLOCK] Backend/Frontend attempt state checked" -ForegroundColor DarkCyan
    $s = LBS-Get-State
    Write-Host "[LOGIN BLOCK] Current attempt count: $($s.attemptCount)" -ForegroundColor DarkGray
    if (LBS-Is-Blocked) {
        Write-Host "[LOGIN BLOCK] Block already active, not incrementing counter" -ForegroundColor Yellow
        return
    }
    $count = LBS-Increment-Attempt
    if ($count -eq 5) {
        Write-Host "[LOGIN BLOCK] Starting FIVE_MINUTES block" -ForegroundColor Green
        LBS-Start-Block "FIVE_MINUTES"
        return
    }
    if ($count -eq 10) {
        Write-Host "[LOGIN BLOCK] Starting TEN_MINUTES block" -ForegroundColor Green
        LBS-Start-Block "TEN_MINUTES"
        return
    }
    if ($count -gt 5 -and $count -lt 10) {
        Write-Host "[LOGIN BLOCK] No block triggered (between 5 and 10)" -ForegroundColor DarkYellow
    }
}

function LBS-Handle-SuccessfulLogin {
    Write-Host "[LOGIN BLOCK] Successful login - State reset" -ForegroundColor DarkCyan
    $script:LBS_STORE = LBS-Get-InitialState
}

# =========================================================
# LoginRateLimitUI.startRateLimit (5dk countdown korumali)
# =========================================================
function LRU-Start-RateLimit($durationSeconds, $message) {
    Write-Host "  [RATE LIMIT UI] START: $durationSeconds" -ForegroundColor DarkMagenta
    $duration = [double]$durationSeconds
    if ([double]::IsNaN($duration) -or [double]::IsInfinity($duration) -or $duration -le 0) {
        Write-Host "  [RATE LIMIT UI] Backend geçerli bir remainingSeconds göndermedi" -ForegroundColor Yellow
        return
    }
    # 5dk countdown korumasi
    if ($duration -gt 240 -and $duration -le 360) {
        if ($script:LBS_STORE.attemptCount -ge 5) {
            Write-Host "  [RATE LIMIT UI] 5-MIN COUNTDOWN SUPPRESSED: LoginBlockSystem attemptCount=$($script:LBS_STORE.attemptCount) (5. deneme zaten geçti)" -ForegroundColor Yellow
            $script:LRU_STORE.suppressed = $true
            return
        }
    }
    if ($script:LRU_STORE.active) {
        Write-Host "  [RATE LIMIT UI] ALREADY ACTIVE - preserving existing countdown" -ForegroundColor Yellow
        return
    }
    Write-Host "  [RATE LIMIT UI] NEW LIMIT CREATED: ${duration}s" -ForegroundColor Magenta
    $script:LRU_STORE.active = $true
    $script:LRU_STORE.duration = $duration
    $script:LRU_STORE.until = (Get-Date).Ticks/10000 + ($duration * 1000)
    $script:LRU_STORE.message = $message
    $script:LRU_STORE.suppressed = $false
}

function LRU-Stop-RateLimit {
    Write-Host "  [RATE LIMIT UI] STOP" -ForegroundColor DarkMagenta
    $script:LRU_STORE.active = $false
    $script:LRU_STORE.duration = 0
    $script:LRU_STORE.until = 0
}

# =========================================================
# Yardimci
# =========================================================
function Reset-All {
    $script:LBS_STORE = LBS-Get-InitialState
    $script:LRU_STORE = @{ active=$false; duration=0; until=0; message=$null; suppressed=$false }
}

function Show-State($label) {
    $s = LBS-Get-State
    $status = if ($s.blocked) { "BLOCKED ($($s.blockLevel))" } else { "active" }
    $lru = if ($script:LRU_STORE.active) { "LRU=ACTIVE($($script:LRU_STORE.duration)s)" } else { "LRU=inactive" }
    Write-Host "  >> State after ${label}: count=$($s.attemptCount), LBS=$status, $lru" -ForegroundColor White
}

function Pass($msg) { Write-Host "  >>> PASS: $msg" -ForegroundColor Green }
function Fail($msg) { Write-Host "  >>> FAIL: $msg" -ForegroundColor Red }

function Test-Scenario($name, $scriptBlock) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Magenta
    Write-Host "  TEST: $name" -ForegroundColor Magenta
    Write-Host "========================================" -ForegroundColor Magenta
    Reset-All
    & $scriptBlock
    Write-Host ""
}

# =========================================================
# TESTLER
# =========================================================

Test-Scenario "TEST 1: İlk 5 deneme" {
    for ($i = 1; $i -le 5; $i++) {
        Write-Host ""
        Write-Host "  --- Deneme $i ---" -ForegroundColor Gray
        LBS-Handle-FailedLogin
    }
    Show-State "TEST 1"
    $s = LBS-Get-State
    if ($s.attemptCount -eq 5 -and $s.blocked -and $s.blockLevel -eq "FIVE_MINUTES") {
        Pass "5. denemede 5 dakika blok tetiklendi"
    } else { Fail "Beklenen: count=5, blocked=FIVE_MINUTES" }
}

Test-Scenario "TEST 2: 5 dk sonrası sayaç korunmalı" {
    for ($i = 1; $i -le 5; $i++) { LBS-Handle-FailedLogin | Out-Null }
    $s = LBS-Get-State
    $s.blockUntil = ((Get-Date).Ticks / 10000) - 1000
    LBS-Save-State $s
    LBS-Restore-State
    Show-State "TEST 2 (after expire)"
    $s = LBS-Get-State
    if ($s.attemptCount -eq 5 -and -not $s.blocked) { Pass "Sayaç 5'te kaldı, blok temizlendi" }
    else { Fail "Sayaç korunmadı" }
}

Test-Scenario "TEST 3: 6. DENEME KRİTİK (sayaç 5'teyken 5dk blok YOK)" {
    Reset-All
    $s = LBS-Get-State; $s.attemptCount = 5; LBS-Save-State $s
    Show-State "TEST 3 (initial: count=5, no block)"
    Write-Host ""
    Write-Host "  --- 6. deneme (sayaç 5'te) ---" -ForegroundColor Gray
    LBS-Handle-FailedLogin
    Show-State "TEST 3 (after 6th attempt)"
    $s = LBS-Get-State
    if ($s.attemptCount -eq 6 -and -not $s.blocked) {
        Pass "Sayaç 5->6 ilerledi, 5 dk blok YOK"
    } else {
        Fail "Sayaç=$($s.attemptCount), blocked=$($s.blocked)"
    }
}

Test-Scenario "TEST 4: 7, 8, 9. denemeler (hiçbir blok yok)" {
    Reset-All
    $s = LBS-Get-State; $s.attemptCount = 5; LBS-Save-State $s
    for ($i = 6; $i -le 9; $i++) {
        Write-Host ""
        Write-Host "  --- $i. deneme ---" -ForegroundColor Gray
        LBS-Handle-FailedLogin
    }
    Show-State "TEST 4 (after 9 attempts)"
    $s = LBS-Get-State
    if ($s.attemptCount -eq 9 -and -not $s.blocked) {
        Pass "Sayaç 5->6->7->8->9 ilerledi, hiçbir blok tetiklenmedi"
    } else {
        Fail "Sayaç=$($s.attemptCount), blocked=$($s.blocked)"
    }
}

Test-Scenario "TEST 5: 10. deneme TEN_MINUTES" {
    Reset-All
    $s = LBS-Get-State; $s.attemptCount = 9; LBS-Save-State $s
    Show-State "TEST 5 (initial: count=9)"
    Write-Host ""
    Write-Host "  --- 10. deneme ---" -ForegroundColor Gray
    LBS-Handle-FailedLogin
    Show-State "TEST 5 (after 10th attempt)"
    $s = LBS-Get-State
    if ($s.attemptCount -eq 10 -and $s.blocked -and $s.blockLevel -eq "TEN_MINUTES") {
        Pass "9->10 geçişi doğrudan 10 dakika blok tetikledi"
    } else { Fail "Sayaç=$($s.attemptCount), level=$($s.blockLevel)" }
}

Test-Scenario "TEST 6: LoginRateLimitUI 5dk countdown 6. denemede BASTIRILMALI" {
    Reset-All
    $s = LBS-Get-State; $s.attemptCount = 5; LBS-Save-State $s
    Show-State "TEST 6 (initial: count=5, no block)"
    Write-Host ""
    Write-Host "  --- 6. deneme + backend 429 (300s) ---" -ForegroundColor Gray
    LBS-Handle-FailedLogin
    LRU-Start-RateLimit 300 "5 dakika engellendiniz"
    Show-State "TEST 6"
    if (-not $script:LRU_STORE.active -and $script:LRU_STORE.suppressed) {
        Pass "6. denemede 5dk countdown BASTIRILDI (LoginBlockSystem yönetiyor)"
    } else {
        Fail "5dk countdown bastırılmadı: active=$($script:LRU_STORE.active), suppressed=$($script:LRU_STORE.suppressed)"
    }
}

Test-Scenario "TEST 7: LoginRateLimitUI 5dk countdown 5. denemede BASTIRILMALI (sayaç zaten 5 olduğu için)" {
    Reset-All
    for ($i = 1; $i -le 4; $i++) { LBS-Handle-FailedLogin | Out-Null }
    Show-State "TEST 7 (initial: count=4)"
    Write-Host ""
    Write-Host "  --- 5. deneme + backend 429 (300s) ---" -ForegroundColor Gray
    LBS-Handle-FailedLogin
    # Sayaç artık 5. LoginRateLimitUI 5dk countdown BASTIRMALI çünkü
    # LoginBlockSystem zaten 5dk bloğu yönetiyor, redundant UI olmamalı.
    LRU-Start-RateLimit 300 "5 dakika engellendiniz"
    Show-State "TEST 7"
    if (-not $script:LRU_STORE.active -and $script:LRU_STORE.suppressed) {
        Pass "5. denemede 5dk countdown BASTIRILDI (LoginBlockSystem zaten yönetiyor)"
    } else {
        Fail "5dk countdown bastırılmadı: active=$($script:LRU_STORE.active), suppressed=$($script:LRU_STORE.suppressed)"
    }
}

Test-Scenario "TEST 8: LoginRateLimitUI 10dk countdown 10. denemede GÖSTERİLMELİ" {
    Reset-All
    $s = LBS-Get-State; $s.attemptCount = 9; LBS-Save-State $s
    Show-State "TEST 8 (initial: count=9)"
    Write-Host ""
    Write-Host "  --- 10. deneme + backend 429 (600s) ---" -ForegroundColor Gray
    LBS-Handle-FailedLogin
    LRU-Start-RateLimit 600 "10 dakika engellendiniz"
    Show-State "TEST 8"
    if ($script:LRU_STORE.active -and $script:LRU_STORE.duration -eq 600) {
        Pass "10. denemede 10dk countdown GÖSTERİLDİ (sayaç 9'dan 10'a geçti)"
    } else {
        Fail "10dk countdown gösterilmedi"
    }
}

Test-Scenario "TEST 9: 10dk blok sonrası sayaç sıfırlanmalı" {
    Reset-All
    $s = LBS-Get-State; $s.attemptCount = 10; $s.blocked = $true; $s.blockLevel = "TEN_MINUTES"
    $s.blockStartedAt = ((Get-Date).Ticks/10000) - (11*60*1000); $s.blockUntil = ((Get-Date).Ticks/10000) - (1*60*1000)
    LBS-Save-State $s
    LBS-Restore-State
    Show-State "TEST 9"
    $s = LBS-Get-State
    if ($s.attemptCount -eq 0 -and -not $s.blocked) { Pass "10dk bloktan sonra sayaç 0'a sıfırlandı" }
    else { Fail "Sayaç sıfırlanmadı" }
}

Test-Scenario "TEST 10: Başarılı login sonrası full reset" {
    Reset-All
    for ($i = 1; $i -le 6; $i++) { LBS-Handle-FailedLogin | Out-Null }
    Show-State "TEST 10 (after 6 failed)"
    LBS-Handle-SuccessfulLogin
    Show-State "TEST 10 (after success)"
    $s = LBS-Get-State
    if ($s.attemptCount -eq 0 -and -not $s.blocked -and $null -eq $s.blockLevel) {
        Pass "Tüm state sıfırlandı"
    } else { Fail "State sıfırlanmadı" }
}

Test-Scenario "TEST 11: Sayfa yenileme 5dk sonrası sayaç korunmalı" {
    Reset-All
    $s = LBS-Get-State; $s.attemptCount = 5; $s.blocked = $true; $s.blockLevel = "FIVE_MINUTES"
    $s.blockStartedAt = ((Get-Date).Ticks/10000) - (6*60*1000); $s.blockUntil = ((Get-Date).Ticks/10000) - (1*60*1000)
    LBS-Save-State $s
    Show-State "TEST 11 (expired 5min block in localStorage)"
    LBS-Restore-State
    Show-State "TEST 11 (after restore)"
    $s = LBS-Get-State
    if ($s.attemptCount -eq 5 -and -not $s.blocked) {
        Pass "Sayaç korundu (5), blok temizlendi"
    } else { Fail "Sayaç korunmadı" }
    Write-Host ""
    Write-Host "  --- Yeni deneme ---" -ForegroundColor Gray
    LBS-Handle-FailedLogin
    $s = LBS-Get-State
    if ($s.attemptCount -eq 6 -and -not $s.blocked) {
        Pass "Sayaç 5->6, 5dk blok YOK (10dk blok için 6->7->8->9->10 beklenir)"
    } else { Fail "Sayaç=$($s.attemptCount), blocked=$($s.blocked)" }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "  TÜM TESTLER TAMAMLANDI" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
