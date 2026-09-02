# LoginBlockSystem Duzeltme Simülasyonu
# Yerel storage ve fonksiyon davranışlarını simüle eder.

$ErrorActionPreference = 'Stop'

# =========================================================
# STATE STORE (localStorage simülasyonu)
# =========================================================
$script:STORE = @{
    attemptCount = 0
    blocked      = $false
    blockLevel   = $null
    blockStartedAt = $null
    blockUntil   = $null
}

function Get-InitialState {
    return @{
        attemptCount = 0
        blocked      = $false
        blockLevel   = $null
        blockStartedAt = $null
        blockUntil   = $null
    }
}

function Get-State {
    return $script:STORE
}

function Save-State($s) {
    $script:STORE = $s
}

function Is-BlockExpired($state) {
    if (-not $state.blocked) { return $false }
    if (-not $state.blockUntil) { return $false }
    return (Get-Date).Ticks / 10000 -ge $state.blockUntil
}

function Is-Blocked {
    $s = Get-State
    if (-not $s.blocked) { return $false }
    if (Is-BlockExpired $s) { return $false }
    return $true
}

function Increment-Attempt {
    $s = Get-State
    $s.attemptCount = $s.attemptCount + 1
    Save-State $s
    Write-Host "  [LOGIN BLOCK] Current attempt count: $($s.attemptCount)" -ForegroundColor DarkGray
    return $s.attemptCount
}

function Reset-Attempt {
    $s = Get-State
    $old = $s.attemptCount
    $s.attemptCount = 0
    Save-State $s
    Write-Host "  [LOGIN BLOCK] Attempt counter reset: $old -> 0" -ForegroundColor DarkGray
}

function Start-Block($level) {
    $s = Get-State
    $duration = if ($level -eq "FIVE_MINUTES") { 5 * 60 * 1000 } else { 10 * 60 * 1000 }

    # Downgrade koruması
    if ($s.blocked) {
        $currentDuration = if ($s.blockLevel -eq "FIVE_MINUTES") { 5 * 60 * 1000 } else { 10 * 60 * 1000 }
        if ($currentDuration -gt $duration) {
            Write-Host "  [LOGIN BLOCK] Block already at higher level ($($s.blockLevel)), not downgrading to $level" -ForegroundColor Yellow
            return
        }
        if ($s.blockLevel -eq $level) {
            Write-Host "  [LOGIN BLOCK] Block already at level $level, not restarting" -ForegroundColor Yellow
            return
        }
    }

    Write-Host "  [LOGIN BLOCK] Starting $level block" -ForegroundColor Cyan
    $s.blocked = $true
    $s.blockLevel = $level
    $s.blockStartedAt = (Get-Date).Ticks / 10000
    $s.blockUntil = (Get-Date).Ticks / 10000 + $duration
    Save-State $s
}

function Stop-Block {
    $s = Get-State
    if (-not $s.blocked) { return }

    $previousLevel = $s.blockLevel
    $preservedCount = $s.attemptCount

    Write-Host "  [LOGIN BLOCK] Stopping block: $previousLevel" -ForegroundColor DarkGray

    if ($previousLevel -eq "TEN_MINUTES") {
        Write-Host "  [LOGIN BLOCK] TEN_MINUTES block expired - resetting attemptCount to 0" -ForegroundColor DarkGray
        $s.attemptCount = 0
    } elseif ($previousLevel -eq "FIVE_MINUTES") {
        Write-Host "  [LOGIN BLOCK] FIVE_MINUTES block expired - preserving attemptCount: $preservedCount" -ForegroundColor DarkGray
    }

    $s.blocked = $false
    $s.blockLevel = $null
    $s.blockStartedAt = $null
    $s.blockUntil = $null
    Save-State $s
}

function Restore-State {
    Write-Host "[LOGIN BLOCK] Restoring state on page load" -ForegroundColor DarkCyan
    $s = Get-State

    if (Is-BlockExpired $s) {
        Write-Host "[LOGIN BLOCK] Block expired on page load, cleaning block state (attemptCount preserved)" -ForegroundColor Yellow
        Stop-Block
        $r = Get-State
        Write-Host "[LOGIN BLOCK] Current attempt count after cleanup: $($r.attemptCount)" -ForegroundColor DarkGray
        return
    }

    if ($s.blocked) {
        Write-Host "[LOGIN BLOCK] Block active: $($s.blockLevel)" -ForegroundColor Cyan
    } else {
        Write-Host "[LOGIN BLOCK] No active block" -ForegroundColor DarkGray
    }
}

function Handle-FailedLogin {
    Write-Host "[LOGIN BLOCK] Backend/Frontend attempt state checked" -ForegroundColor DarkCyan
    $s = Get-State
    Write-Host "[LOGIN BLOCK] Current attempt count: $($s.attemptCount)" -ForegroundColor DarkGray

    if (Is-Blocked) {
        Write-Host "[LOGIN BLOCK] Block already active, not incrementing counter" -ForegroundColor Yellow
        return
    }

    $count = Increment-Attempt

    if ($count -eq 5) {
        Write-Host "[LOGIN BLOCK] Starting FIVE_MINUTES block" -ForegroundColor Green
        Start-Block "FIVE_MINUTES"
        return
    }

    if ($count -eq 10) {
        Write-Host "[LOGIN BLOCK] Starting TEN_MINUTES block" -ForegroundColor Green
        Start-Block "TEN_MINUTES"
        return
    }
}

function Handle-SuccessfulLogin {
    Write-Host "[LOGIN BLOCK] Successful login - State reset" -ForegroundColor DarkCyan
    $script:STORE = Get-InitialState
}

function Reset-Simulation {
    $script:STORE = Get-InitialState
}

function Show-State($label) {
    $s = Get-State
    $status = if ($s.blocked) { "BLOCKED ($($s.blockLevel))" } else { "active" }
    Write-Host "  >> State after $label : count=$($s.attemptCount), status=$status" -ForegroundColor White
}

# =========================================================
# TESTLER
# =========================================================

function Test-Scenario($name, $scriptBlock) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Magenta
    Write-Host "  TEST: $name" -ForegroundColor Magenta
    Write-Host "========================================" -ForegroundColor Magenta
    Reset-Simulation
    & $scriptBlock
    Write-Host ""
}

Test-Scenario "TEST 1: İlk 5 deneme" {
    for ($i = 1; $i -le 5; $i++) {
        Write-Host ""
        Write-Host "  --- Deneme $i ---" -ForegroundColor Gray
        Handle-FailedLogin
    }
    Show-State "TEST 1"
    $s = Get-State
    if ($s.attemptCount -eq 5 -and $s.blocked -and $s.blockLevel -eq "FIVE_MINUTES") {
        Write-Host "  >>> PASS: 5. denemede 5 dakika blok tetiklendi" -ForegroundColor Green
    } else {
        Write-Host "  >>> FAIL" -ForegroundColor Red
    }
}

Test-Scenario "TEST 2: 5 dk sonrası, sayaç korunmalı" {
    # 5 deneme yap
    for ($i = 1; $i -le 5; $i++) { Handle-FailedLogin | Out-Null }
    # 5 dk bloğu zorla expire et
    $s = Get-State
    $s.blockUntil = ((Get-Date).Ticks / 10000) - 1000
    Save-State $s
    # Restore simülasyonu
    Restore-State
    Show-State "TEST 2 (after expire cleanup)"
    $s = Get-State
    if ($s.attemptCount -eq 5 -and -not $s.blocked) {
        Write-Host "  >>> Sayaç korundu (5'te kaldı)" -ForegroundColor Green
    } else {
        Write-Host "  >>> FAIL: Sayaç korunmadı" -ForegroundColor Red
    }
    # 6. deneme
    Write-Host ""
    Write-Host "  --- 6. deneme ---" -ForegroundColor Gray
    Handle-FailedLogin
    Show-State "TEST 2 (after 6th attempt)"
    $s = Get-State
    if ($s.attemptCount -eq 6 -and -not $s.blocked) {
        Write-Host "  >>> PASS: Sayaç 6'ya ilerledi, blok yok" -ForegroundColor Green
    } else {
        Write-Host "  >>> FAIL" -ForegroundColor Red
    }
}

Test-Scenario "TEST 3: 9'dan 10'a, doğrudan 10 dk blok" {
    Reset-Simulation
    # Manuel state: attemptCount=9
    $s = Get-State
    $s.attemptCount = 9
    Save-State $s
    Show-State "TEST 3 (initial: 9)"
    # 10. deneme
    Write-Host ""
    Write-Host "  --- 10. deneme ---" -ForegroundColor Gray
    Handle-FailedLogin
    Show-State "TEST 3 (after 10th attempt)"
    $s = Get-State
    if ($s.attemptCount -eq 10 -and $s.blocked -and $s.blockLevel -eq "TEN_MINUTES") {
        Write-Host "  >>> PASS: 9->10 geçişi doğrudan 10 dakika blok tetikledi" -ForegroundColor Green
    } else {
        Write-Host "  >>> FAIL" -ForegroundColor Red
    }
}

Test-Scenario "TEST 4: Çift blok tetiklenmemeli" {
    Reset-Simulation
    $s = Get-State
    $s.attemptCount = 9
    Save-State $s
    # 10. deneme — sadece TEN_MINUTES tetiklenmeli, FIVE_MINUTES değil
    Handle-FailedLogin
    $s = Get-State
    if ($s.blockLevel -eq "TEN_MINUTES") {
        Write-Host "  >>> PASS: Sadece TEN_MINUTES tetiklendi, FIVE_MINUTES yok" -ForegroundColor Green
    } else {
        Write-Host "  >>> FAIL" -ForegroundColor Red
    }
}

Test-Scenario "TEST 5: Sayaç 5'teyken 5 dk blok tekrar tetiklenmemeli" {
    Reset-Simulation
    # State'i 5'e ayarla (önceki 5 dk blok sonrası simülasyonu)
    $s = Get-State
    $s.attemptCount = 5
    Save-State $s
    Show-State "TEST 5 (initial: 5, no block)"
    # Yeni deneme — sayaç 6 olmalı, blok tetiklenmemeli
    Write-Host ""
    Write-Host "  --- 6. deneme (sayaç 5'te) ---" -ForegroundColor Gray
    Handle-FailedLogin
    $s = Get-State
    if ($s.attemptCount -eq 6 -and -not $s.blocked) {
        Write-Host "  >>> PASS: Sayaç 5->6 ilerledi, 5 dk blok YOK" -ForegroundColor Green
    } else {
        Write-Host "  >>> FAIL: attemptCount=$($s.attemptCount), blocked=$($s.blocked)" -ForegroundColor Red
    }
    # 4 deneme daha yap
    for ($i = 0; $i -lt 4; $i++) { Handle-FailedLogin | Out-Null }
    $s = Get-State
    Show-State "TEST 5 (10. deneme sonrası)"
    if ($s.attemptCount -eq 10 -and $s.blocked -and $s.blockLevel -eq "TEN_MINUTES") {
        Write-Host "  >>> PASS: Sayaç 10'a ulaştı, 10 dakika blok tetiklendi" -ForegroundColor Green
    } else {
        Write-Host "  >>> FAIL" -ForegroundColor Red
    }
}

Test-Scenario "TEST 6: Sayfa yenileme, 5 dk blok expire olmuş" {
    Reset-Simulation
    $s = Get-State
    $s.attemptCount = 5
    $s.blocked = $true
    $s.blockLevel = "FIVE_MINUTES"
    $s.blockStartedAt = ((Get-Date).Ticks / 10000) - (6 * 60 * 1000)
    $s.blockUntil = ((Get-Date).Ticks / 10000) - (1 * 60 * 1000)  # 1 dk önce expire olmuş
    Save-State $s
    Show-State "TEST 6 (expired 5 min block in localStorage)"
    # Sayfa yenileme simülasyonu
    Restore-State
    Show-State "TEST 6 (after restore)"
    $s = Get-State
    if ($s.attemptCount -eq 5 -and -not $s.blocked) {
        Write-Host "  >>> PASS: Sayaç korundu (5), blok temizlendi" -ForegroundColor Green
    } else {
        Write-Host "  >>> FAIL: Sayaç korunmadı" -ForegroundColor Red
    }
    # Şimdi yeni deneme — sayaç 6 olmalı
    Write-Host ""
    Write-Host "  --- Yeni deneme ---" -ForegroundColor Gray
    Handle-FailedLogin
    $s = Get-State
    if ($s.attemptCount -eq 6 -and -not $s.blocked) {
        Write-Host "  >>> PASS: Sayaç 5->6, 5 dk blok YOK (10 dk blok için 6->7->8->9->10 beklenir)" -ForegroundColor Green
    } else {
        Write-Host "  >>> FAIL" -ForegroundColor Red
    }
}

Test-Scenario "TEST 7: Başarılı login sonrası sıfırlama" {
    Reset-Simulation
    # 3 başarısız
    for ($i = 1; $i -le 3; $i++) { Handle-FailedLogin | Out-Null }
    Show-State "TEST 7 (3 failed)"
    # Başarılı
    Handle-SuccessfulLogin
    Show-State "TEST 7 (after success)"
    $s = Get-State
    if ($s.attemptCount -eq 0 -and -not $s.blocked -and $null -eq $s.blockLevel) {
        Write-Host "  >>> PASS: Tüm state sıfırlandı" -ForegroundColor Green
    } else {
        Write-Host "  >>> FAIL" -ForegroundColor Red
    }
}

Test-Scenario "TEST 8: 10 dk blok sonrası sayaç sıfırlanmalı" {
    Reset-Simulation
    $s = Get-State
    $s.attemptCount = 10
    $s.blocked = $true
    $s.blockLevel = "TEN_MINUTES"
    $s.blockStartedAt = ((Get-Date).Ticks / 10000) - (11 * 60 * 1000)
    $s.blockUntil = ((Get-Date).Ticks / 10000) - (1 * 60 * 1000)
    Save-State $s
    Show-State "TEST 8 (expired 10 min block)"
    Restore-State
    Show-State "TEST 8 (after restore)"
    $s = Get-State
    if ($s.attemptCount -eq 0 -and -not $s.blocked) {
        Write-Host "  >>> PASS: 10 dk bloktan sonra sayaç 0'a sıfırlandı" -ForegroundColor Green
    } else {
        Write-Host "  >>> FAIL" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "  TÜM TESTLER TAMAMLANDI" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
