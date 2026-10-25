# ============================================================
# FITNESS PRO - CLOUDFLARE QUICK TUNELLERINI DURDURMA BETIGI
# ============================================================
# Yalnizca bu otomasyon tarafindan baslatilan Frontend ve Backend
# tunellerini PID dogrulamasi yaparak guvenle durdurur.
# Docker konteynerlerine, SQL Server'a veya sistemdeki diger
# cloudflared sureclerine dokunmaz.
# ============================================================

[CmdletBinding()]
param()

$ProjectRoot = $PSScriptRoot
$CloudflareDir = Join-Path $ProjectRoot ".cloudflare"
$StateFile = Join-Path $CloudflareDir "tunnels.json"

Write-Host ""
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host "  FITNESS PRO - CLOUDFLARE TUNELLERINI DURDURMA" -ForegroundColor Cyan
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $StateFile)) {
    Write-Host "[BILGI] Aktif Cloudflare tunel durum dosyasi bulunamadi." -ForegroundColor Yellow
    Write-Host "        Durdurulacak kayitli tunel yok." -ForegroundColor Yellow
    Write-Host "===========================================================" -ForegroundColor Cyan
    exit 0
}

try {
    $stateContent = [System.IO.File]::ReadAllText($StateFile, [System.Text.Encoding]::UTF8)
    $state = $stateContent | ConvertFrom-Json
} catch {
    Write-Warning "Durum dosyasi okunamadi, temizleniyor: $_"
    Remove-Item $StateFile -Force -ErrorAction SilentlyContinue
    exit 1
}

function Stop-TrackedProcess {
    param(
        [string]$Name,
        [int]$PidToStop
    )
    if (-not $PidToStop -or $PidToStop -le 0) {
        Write-Host "  [$Name] Kayitli PID gecersiz veya bos." -ForegroundColor DarkGray
        return
    }

    $proc = Get-Process -Id $PidToStop -ErrorAction SilentlyContinue
    if ($proc) {
        if ($proc.ProcessName -ieq "cloudflared") {
            Write-Host "  [$Name] Tunel sureci durduruluyor (PID: $PidToStop)..." -ForegroundColor Yellow
            try {
                Stop-Process -Id $PidToStop -Force -ErrorAction Stop
                Write-Host "  [$Name] Basariyla durduruldu." -ForegroundColor Green
            } catch {
                Write-Warning "  [$Name] Surec durdurulamadi: $_"
            }
        } else {
            Write-Warning "  [$Name] PID $PidToStop baska bir uygulamaya ait ($($proc.ProcessName)). Guvenlik nedeniyle sonlandirilmadi."
        }
    } else {
        Write-Host "  [$Name] PID $PidToStop zaten calismiyor." -ForegroundColor DarkGray
    }
}

Stop-TrackedProcess -Name "Backend Tunnel" -PidToStop $state.BackendPid
Stop-TrackedProcess -Name "Frontend Tunnel" -PidToStop $state.FrontendPid

# Durum dosyasini kaldir
Remove-Item $StateFile -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "[OK] Cloudflare tunelleri durduruldu ve durum temizlendi." -ForegroundColor Green
Write-Host "     Docker konteynerleri ve SQL Server calismaya devam ediyor." -ForegroundColor DarkCyan
Write-Host "===========================================================" -ForegroundColor Cyan
