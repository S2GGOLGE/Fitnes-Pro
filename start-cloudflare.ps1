# ============================================================
# FITNESS PRO - CLOUDFLARE QUICK TUNNEL BASLATMA VE OTOMASYON BETIGI
# ============================================================
# 1. Yerel servislerin (Backend :8081, Frontend :3000) hazir oldugunu kontrol eder.
# 2. Varsa eski Cloudflare tunel sureclerini guvenle sonlandirir.
# 3. Backend icin Cloudflare Quick Tunnel acar ve dinamik URL'yi tespit eder.
# 4. Fronted/JavaScripts/config.js dosyasini yeni Backend URL'si ile guvenle gunceller.
# 5. Frontend icin Cloudflare Quick Tunnel acar ve dinamik URL'yi tespit eder.
# 6. Her iki tunelin erisilebilir oldugunu dogrular.
# 7. Surec PID'lerini .cloudflare/tunnels.json dosyasina kaydeder.
# 8. Kullanicinin tarayicisinda Frontend tunel adresini acar ve ozet tablosu sunar.
# ============================================================

[CmdletBinding()]
param(
    [switch]$SkipBrowserOpen
)

$ErrorActionPreference = "Stop"

$ProjectRoot = $PSScriptRoot
$FrontendDir = Join-Path $ProjectRoot "Fronted"
$ConfigFile = Join-Path $FrontendDir "JavaScripts\config.js"
$CloudflareDir = Join-Path $ProjectRoot ".cloudflare"
$StateFile = Join-Path $CloudflareDir "tunnels.json"
$BackendLog = Join-Path $CloudflareDir "backend.log"
$FrontendLog = Join-Path $CloudflareDir "frontend.log"

$BackendLocalUrl = "http://127.0.0.1:8081"
$FrontendLocalUrl = "http://127.0.0.1:3000"

# HTML dosyasini dosya sisteminden dinamik olarak tespit et
$htmlFileItem = Get-ChildItem -Path $FrontendDir -Filter "*.html" | Select-Object -First 1
if (-not $htmlFileItem) {
    Write-Host "  [HATA] Frontend klasorunde .html dosyasi bulunamadi: $FrontendDir" -ForegroundColor Red
    exit 1
}
$HtmlFileName = $htmlFileItem.Name
$EncodedHtmlName = [System.Uri]::EscapeDataString($HtmlFileName)

Write-Host ""
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host "  FITNESS PRO  -  CLOUDFLARE QUICK TUNNEL OTOMASYONU" -ForegroundColor Cyan
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host ""

# ------------------------------------------------------------
# [01] Cloudflared executable tespiti
# ------------------------------------------------------------
Write-Host "[01] cloudflared.exe kontrol ediliyor..." -ForegroundColor DarkCyan
$cfCandidates = @(
    "C:\Program Files (x86)\cloudflared\cloudflared.exe",
    "C:\Program Files\cloudflared\cloudflared.exe"
)
$cfExe = $null
foreach ($cand in $cfCandidates) {
    if (Test-Path $cand) {
        $cfExe = $cand
        break
    }
}
if (-not $cfExe) {
    $fromPath = Get-Command "cloudflared" -ErrorAction SilentlyContinue
    if ($fromPath) {
        $cfExe = $fromPath.Source
    }
}
if (-not $cfExe) {
    Write-Host "  [HATA] cloudflared.exe bulunamadi!" -ForegroundColor Red
    Write-Host "  Lutfen Cloudflare CLI aracinin kurulu oldugundan emin olun." -ForegroundColor Red
    exit 1
}
Write-Host "  OK: $cfExe" -ForegroundColor Green

# ------------------------------------------------------------
# [02] Yerel servislerin hazir oldugunun dogrulanmasi
# ------------------------------------------------------------
Write-Host "[02] Yerel servisler kontrol ediliyor..." -ForegroundColor DarkCyan

# Backend Health Kontrolu
$backendStatus = (curl.exe -s --max-time 5 --connect-timeout 3 -o NUL -w "%{http_code}" "$BackendLocalUrl/health")
if ($backendStatus -eq "200") {
    Write-Host "  OK: Yerel Backend saglikli ($BackendLocalUrl/health -> 200 OK)" -ForegroundColor Green
} else {
    Write-Host "  [HATA] Yerel Backend ($BackendLocalUrl/health) erisilemez durumda! HTTP=$backendStatus" -ForegroundColor Red
    Write-Host "         Lutfen once start-all.bat ile Docker servislerini baslatin." -ForegroundColor Yellow
    exit 1
}

# Frontend HTTP Kontrolu
$frontendStatus = (curl.exe -s --max-time 5 --connect-timeout 3 -o NUL -w "%{http_code}" "$FrontendLocalUrl/$EncodedHtmlName")
if ($frontendStatus -ne "200") {
    $frontendStatus = (curl.exe -s --max-time 5 --connect-timeout 3 -o NUL -w "%{http_code}" "$FrontendLocalUrl/")
}
if ($frontendStatus -eq "200") {
    Write-Host "  OK: Yerel Frontend yayinda ($FrontendLocalUrl/$EncodedHtmlName -> 200 OK)" -ForegroundColor Green
} else {
    Write-Host "  [HATA] Yerel Frontend ($FrontendLocalUrl) erisilemez durumda! HTTP=$frontendStatus" -ForegroundColor Red
    Write-Host "         Lutfen once Frontend HTTP sunucusunu baslatin." -ForegroundColor Yellow
    exit 1
}

# ------------------------------------------------------------
# [03] Onceki Cloudflare sureclerinin temizlenmesi
# ------------------------------------------------------------
Write-Host "[03] Onceki Cloudflare surecleri kontrol ediliyor..." -ForegroundColor DarkCyan
if (-not (Test-Path $CloudflareDir)) {
    New-Item -ItemType Directory -Path $CloudflareDir -Force | Out-Null
}

if (Test-Path $StateFile) {
    try {
        $oldState = [System.IO.File]::ReadAllText($StateFile, [System.Text.Encoding]::UTF8) | ConvertFrom-Json
        if ($oldState.BackendPid) {
            $p = Get-Process -Id $oldState.BackendPid -ErrorAction SilentlyContinue
            if ($p -and $p.ProcessName -ieq "cloudflared") {
                Write-Host "  Eski Backend Cloudflare tuneli durduruluyor (PID: $($oldState.BackendPid))..." -ForegroundColor Yellow
                Stop-Process -Id $oldState.BackendPid -Force -ErrorAction SilentlyContinue
            }
        }
        if ($oldState.FrontendPid) {
            $p = Get-Process -Id $oldState.FrontendPid -ErrorAction SilentlyContinue
            if ($p -and $p.ProcessName -ieq "cloudflared") {
                Write-Host "  Eski Frontend Cloudflare tuneli durduruluyor (PID: $($oldState.FrontendPid))..." -ForegroundColor Yellow
                Stop-Process -Id $oldState.FrontendPid -Force -ErrorAction SilentlyContinue
            }
        }
    } catch {
        Write-Warning "Eski durum dosyasi okunurken hata olustu: $_"
    }
    Remove-Item $StateFile -Force -ErrorAction SilentlyContinue
}

# Eski gunlukleri temizle (eski URL'lerin yanlislikla okunmamasi icin)
if (Test-Path $BackendLog) { Remove-Item $BackendLog -Force -ErrorAction SilentlyContinue }
if (Test-Path $FrontendLog) { Remove-Item $FrontendLog -Force -ErrorAction SilentlyContinue }
Write-Host "  OK: Temizlik tamamlandi." -ForegroundColor Green

# ------------------------------------------------------------
# Fonksiyon: Gunlukten TryCloudflare URL Tespiti
# ------------------------------------------------------------
function Get-TunnelUrlFromLog {
    param(
        [string]$LogPath,
        [System.Diagnostics.Process]$Process,
        [int]$TimeoutSeconds = 45,
        [string]$ServiceName
    )

    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $urlRegex = 'https://([a-zA-Z0-9-]+\.trycloudflare\.com)'

    while ($sw.Elapsed.TotalSeconds -lt $TimeoutSeconds) {
        if ($Process.HasExited) {
            $exitLog = ""
            if (Test-Path $LogPath) {
                $exitLog = [System.IO.File]::ReadAllText($LogPath, [System.Text.Encoding]::UTF8)
            }
            throw "cloudflared ($ServiceName) sureci beklenmedik sekilde kapandi (ExitCode: $($Process.ExitCode)).`nGunluk:`n$exitLog"
        }

        if (Test-Path $LogPath) {
            try {
                $fs = [System.IO.FileStream]::new($LogPath, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
                $sr = [System.IO.StreamReader]::new($fs, [System.Text.Encoding]::UTF8)
                $content = $sr.ReadToEnd()
                $sr.Close()
                $fs.Close()

                if ($content -match $urlRegex) {
                    $foundUrl = $Matches[0].Trim()
                    if ($foundUrl -match '^https://[a-zA-Z0-9-]+\.trycloudflare\.com$') {
                        return $foundUrl
                    }
                }
            } catch {
                # Dosya kilitli olabilir, bir sonraki dongude tekrar dene
            }
        }
        Start-Sleep -Milliseconds 600
    }

    $lastLog = ""
    if (Test-Path $LogPath) {
        $lastLog = [System.IO.File]::ReadAllText($LogPath, [System.Text.Encoding]::UTF8)
    }
    throw "$ServiceName Cloudflare tunel URL'si $TimeoutSeconds saniye icinde tespit edilemedi!`nSon gunluk:`n$lastLog"
}

# ------------------------------------------------------------
# [04] Backend Cloudflare Quick Tunnel Baslatma
# ------------------------------------------------------------
Write-Host "[04] Backend Cloudflare Quick Tunnel baslatiliyor ($BackendLocalUrl)..." -ForegroundColor DarkCyan
$backendProc = Start-Process -FilePath $cfExe `
    -ArgumentList "tunnel", "--no-prechecks", "--edge-ip-version", "4", "--protocol", "http2", "--no-autoupdate", "--logfile", "`"$BackendLog`"", "--url", $BackendLocalUrl `
    -PassThru -WindowStyle Hidden

try {
    $backendUrl = Get-TunnelUrlFromLog -LogPath $BackendLog -Process $backendProc -TimeoutSeconds 45 -ServiceName "Backend"
    Write-Host "  OK: Backend Cloudflare URL tespit edildi:" -ForegroundColor Green
    Write-Host "      $backendUrl" -ForegroundColor Cyan
} catch {
    Write-Host "  [HATA] Backend tuneli baslatilamadi!" -ForegroundColor Red
    Write-Host "  $($_)" -ForegroundColor Red
    if (-not $backendProc.HasExited) { Stop-Process -Id $backendProc.Id -Force }
    exit 1
}

# ------------------------------------------------------------
# [05] config.js Dosyasinin Guvenli Guncellenmesi
# ------------------------------------------------------------
Write-Host "[05] Fronted/JavaScripts/config.js guncelleniyor..." -ForegroundColor DarkCyan

if (-not (Test-Path $ConfigFile)) {
    Write-Host "  [HATA] config.js dosyasi bulunamadi: $ConfigFile" -ForegroundColor Red
    if (-not $backendProc.HasExited) { Stop-Process -Id $backendProc.Id -Force }
    exit 1
}

# Yedek olustur
$backupFile = "$ConfigFile.bak"
Copy-Item -Path $ConfigFile -Destination $backupFile -Force
Write-Host "  Yedek olusturuldu: config.js.bak" -ForegroundColor DarkGray

try {
    # UTF-8 ile oku
    $configContent = [System.IO.File]::ReadAllText($ConfigFile, [System.Text.Encoding]::UTF8)

    # window.API_BASE_URL desenini tespit et
    $pattern = '(?m)^(\s*window\.API_BASE_URL\s*=\s*["''])[^"'']*(["''];?\s*)$'
    if (-not ($configContent -match $pattern)) {
        throw "config.js icinde 'window.API_BASE_URL = ...' atamasi bulunamadi! Dosya butunlugunu korumak icin guncelleme iptal edildi."
    }

    # MatchEvaluator ile guvenli degisim (PowerShell $ kacis sorunlarini onler)
    $evaluator = [System.Text.RegularExpressions.MatchEvaluator]{
        param($m)
        return $m.Groups[1].Value + $backendUrl + $m.Groups[2].Value
    }
    $updatedContent = [System.Text.RegularExpressions.Regex]::Replace($configContent, $pattern, $evaluator)

    # UTF-8 (BOM'suz) yaz
    $utf8NoBom = [System.Text.UTF8Encoding]::new($false)
    [System.IO.File]::WriteAllText($ConfigFile, $updatedContent, $utf8NoBom)

    # Yeniden okuyup dogrula
    $verifiedContent = [System.IO.File]::ReadAllText($ConfigFile, [System.Text.Encoding]::UTF8)
    if (-not $verifiedContent.Contains($backendUrl)) {
        throw "Guncelleme dogrulamasi basarisiz: Yeni Backend URL'si dosyada bulunamadi!"
    }
    Write-Host "  OK: config.js basariyla guncellendi ve dogrulandi." -ForegroundColor Green
} catch {
    Write-Host "  [HATA] config.js guncellenirken hata olustu: $_" -ForegroundColor Red
    Write-Host "  Backend Tunnel URL: $backendUrl" -ForegroundColor Yellow
    if (-not $backendProc.HasExited) { Stop-Process -Id $backendProc.Id -Force }
    exit 1
}

# ------------------------------------------------------------
# [06] Frontend Cloudflare Quick Tunnel Baslatma
# ------------------------------------------------------------
Write-Host "[06] Frontend Cloudflare Quick Tunnel baslatiliyor ($FrontendLocalUrl)..." -ForegroundColor DarkCyan
$frontendProc = Start-Process -FilePath $cfExe `
    -ArgumentList "tunnel", "--no-prechecks", "--edge-ip-version", "4", "--protocol", "http2", "--no-autoupdate", "--logfile", "`"$FrontendLog`"", "--url", $FrontendLocalUrl `
    -PassThru -WindowStyle Hidden

try {
    $frontendUrl = Get-TunnelUrlFromLog -LogPath $FrontendLog -Process $frontendProc -TimeoutSeconds 45 -ServiceName "Frontend"
    Write-Host "  OK: Frontend Cloudflare URL tespit edildi:" -ForegroundColor Green
    Write-Host "      $frontendUrl" -ForegroundColor Cyan
} catch {
    Write-Host "  [HATA] Frontend tuneli baslatilamadi!" -ForegroundColor Red
    Write-Host "  $($_)" -ForegroundColor Red
    if (-not $backendProc.HasExited) { Stop-Process -Id $backendProc.Id -Force }
    if (-not $frontendProc.HasExited) { Stop-Process -Id $frontendProc.Id -Force }
    exit 1
}

# ------------------------------------------------------------
# [07] Surec Durumunun Kaydedilmesi (tunnels.json)
# ------------------------------------------------------------
$stateData = @{
    BackendPid = $backendProc.Id
    FrontendPid = $frontendProc.Id
    BackendUrl = $backendUrl
    FrontendUrl = $frontendUrl
    StartedAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:sszzz")
    Status = "Running"
}
$stateJson = $stateData | ConvertTo-Json -Depth 3
[System.IO.File]::WriteAllText($StateFile, $stateJson, [System.Text.UTF8Encoding]::new($false))

# ------------------------------------------------------------
# [08] Tunel Erisilebilirlik Dogrulamalari
# ------------------------------------------------------------
Write-Host "[08] Cloudflare uzerinden uctan uca baglanti dogrulaniyor..." -ForegroundColor DarkCyan

# Backend /health dogrulamasi
$backendHealthCheck = $false
$swHealth = [System.Diagnostics.Stopwatch]::StartNew()
while ($swHealth.Elapsed.TotalSeconds -lt 25) {
    $code = (curl.exe -s --max-time 5 --connect-timeout 3 -o NUL -w "%{http_code}" "$backendUrl/health")
    if ($code -eq "200") {
        $backendHealthCheck = $true
        break
    }
    Start-Sleep -Seconds 2
}
if ($backendHealthCheck) {
    Write-Host "  OK: Backend tuneli dis erisime yanit veriyor ($backendUrl/health -> 200 OK)" -ForegroundColor Green
} else {
    Write-Host "  [UYARI] Backend tuneli henuz yanit vermedi (Cloudflare edge DNS yayilimi biraz surebilir)." -ForegroundColor Yellow
}

# Frontend Baslangic.html dogrulamasi
$frontendPageCheck = $false
$frontendFullUrl = "$frontendUrl/$EncodedHtmlName"
$swFront = [System.Diagnostics.Stopwatch]::StartNew()
while ($swFront.Elapsed.TotalSeconds -lt 25) {
    $code = (curl.exe -s --max-time 5 --connect-timeout 3 -o NUL -w "%{http_code}" $frontendFullUrl)
    if ($code -eq "200") {
        $frontendPageCheck = $true
        break
    }
    Start-Sleep -Seconds 2
}
if ($frontendPageCheck) {
    Write-Host "  OK: Frontend tuneli dis erisime yanit veriyor ($frontendFullUrl -> 200 OK)" -ForegroundColor Green
} else {
    Write-Host "  [UYARI] Frontend tuneli henuz yanit vermedi (Cloudflare edge DNS yayilimi biraz surebilir)." -ForegroundColor Yellow
}

# ------------------------------------------------------------
# [09] Tarayici Acma
# ------------------------------------------------------------
if (-not $SkipBrowserOpen) {
    Write-Host "[09] Tarayici baslatiliyor: $frontendFullUrl" -ForegroundColor DarkCyan
    try {
        Start-Process $frontendFullUrl
    } catch {
        Write-Warning "Tarayici otomatik acilamadi: $_"
    }
}

# ------------------------------------------------------------
# [10] Durum Ozeti
# ------------------------------------------------------------
Write-Host ""
Write-Host "===========================================================" -ForegroundColor Green
Write-Host "  FITNESS PRO  -  SISTEM VE TUNEL BASARIYLA HAZIRLANDI" -ForegroundColor Green
Write-Host "===========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  YEREL BAGLANTILAR:" -ForegroundColor Yellow
Write-Host "    Backend API     : $BackendLocalUrl"
Write-Host "    Backend Health  : $BackendLocalUrl/health"
Write-Host "    Backend Swagger : $BackendLocalUrl/swagger"
Write-Host "    Frontend Yerel  : $FrontendLocalUrl/$EncodedHtmlName"
Write-Host ""
Write-Host "  CLOUDFLARE QUICK TUNNEL BAGLANTILARI (DIS ERISIM):" -ForegroundColor Yellow
Write-Host "    Frontend Sayfa  : $frontendFullUrl" -ForegroundColor Cyan
Write-Host "    Backend API     : $backendUrl" -ForegroundColor Cyan
Write-Host "    Backend Health  : $backendUrl/health"
Write-Host "    Backend Swagger : $backendUrl/swagger"
Write-Host ""
Write-Host "  YAPILANDIRMA:" -ForegroundColor Yellow
Write-Host "    config.js URL   : $backendUrl"
Write-Host "    Backend PID     : $($backendProc.Id)"
Write-Host "    Frontend PID    : $($frontendProc.Id)"
Write-Host "    Gunlukler       : $CloudflareDir"
Write-Host ""
Write-Host "  YONETIM KOMUTLARI:" -ForegroundColor Yellow
Write-Host "    Tunelleri Kapat : stop-cloudflare.bat (Docker ve SQL calismaya devam eder)"
Write-Host "    Sistemi Kapat   : Sistemi Kapat.bat"
Write-Host "===========================================================" -ForegroundColor Green
Write-Host ""
