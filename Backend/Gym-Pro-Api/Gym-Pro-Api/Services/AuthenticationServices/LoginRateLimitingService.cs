namespace Apı.Service;

using System.Collections.Concurrent;

public class LoginRateLimitingService
{
    // =========================================================
    // RATE LIMIT AYARLARI
    // =========================================================

    private const int FirstBlockAttempts = 5;
    private const int SecondBlockAttempts = 10;
    private const int PermanentLockAttempts = 15;

    private static readonly TimeSpan FirstBlockDuration =
        TimeSpan.FromMinutes(5);

    private static readonly TimeSpan SecondBlockDuration =
        TimeSpan.FromMinutes(10);

    // =========================================================
    // RATE STORAGE
    // =========================================================

    private readonly ConcurrentDictionary<string, LoginAttemptInfo> _attempts = new();

    // =========================================================
    // GENEL DURUM
    // =========================================================

    public bool IsBlocked(string key, out TimeSpan remaining)
    {
        remaining = TimeSpan.Zero;

        if (!_attempts.TryGetValue(key, out var info))
        {
            Console.WriteLine(
                $"[RATE LIMIT] KEY YOK | {key}"
            );

            return false;
        }

        lock (info)
        {
            Console.WriteLine(
                $"[RATE LIMIT] CHECK | " +
                $"Key={key} | " +
                $"Attempts={info.FailedAttempts} | " +
                $"BlockedUntil={info.BlockedUntil} | " +
                $"Permanent={info.IsPermanentlyLocked}"
            );

            // =====================================================
            // KALICI BLOK
            // =====================================================

            if (info.IsPermanentlyLocked)
            {
                Console.WriteLine(
                    $"[RATE LIMIT] PERMANENT BLOCK | Key={key}"
                );

                return true;
            }

            // =====================================================
            // AKTİF BLOK YOK
            // =====================================================

            if (!info.BlockedUntil.HasValue)
            {
                return false;
            }

            // =====================================================
            // GEÇİCİ BLOK AKTİF
            // =====================================================

            if (info.BlockedUntil.Value > DateTime.UtcNow)
            {
                remaining =
                    info.BlockedUntil.Value - DateTime.UtcNow;

                Console.WriteLine(
                    $"[RATE LIMIT] BLOCKED | " +
                    $"Key={key} | " +
                    $"Attempts={info.FailedAttempts} | " +
                    $"Remaining={remaining.TotalSeconds:F0}s"
                );

                return true;
            }

            // =====================================================
            // BLOK SÜRESİ DOLDU
            // =====================================================

            Console.WriteLine(
                $"[RATE LIMIT] BLOCK EXPIRED | " +
                $"Key={key} | " +
                $"Attempts={info.FailedAttempts}"
            );

            info.BlockedUntil = null;

            return false;
        }
    }

    // =========================================================
    // RATE DURUMUNU GETİR
    // =========================================================

    public LoginRateStatus GetStatus(string key)
    {
        // =====================================================
        // KEY YOK
        // =====================================================

        if (!_attempts.TryGetValue(key, out var info))
        {
            Console.WriteLine(
                $"[RATE LIMIT] STATUS | KEY YOK | Key={key}"
            );

            return new LoginRateStatus
            {
                IsBlocked = false,
                RemainingSeconds = 0,
                FailedAttempts = 0,
                IsPermanentlyLocked = false
            };
        }

        lock (info)
        {
            var now = DateTime.UtcNow;

            // =================================================
            // KALICI KİLİT
            // =================================================

            if (info.IsPermanentlyLocked)
            {
                Console.WriteLine(
                    $"[RATE LIMIT] STATUS | PERMANENT | " +
                    $"Key={key} | " +
                    $"Attempts={info.FailedAttempts}"
                );

                return new LoginRateStatus
                {
                    IsBlocked = true,
                    RemainingSeconds = null,
                    FailedAttempts = info.FailedAttempts,
                    IsPermanentlyLocked = true
                };
            }

            // =================================================
            // GEÇİCİ BLOK
            // =================================================

            if (info.BlockedUntil.HasValue &&
                info.BlockedUntil.Value > now)
            {
                var remainingSeconds =
                    (int)Math.Ceiling(
                        (info.BlockedUntil.Value - now).TotalSeconds
                    );

                Console.WriteLine(
                    $"[RATE LIMIT] STATUS | BLOCKED | " +
                    $"Key={key} | " +
                    $"Attempts={info.FailedAttempts} | " +
                    $"Remaining={remainingSeconds}s"
                );

                return new LoginRateStatus
                {
                    IsBlocked = true,
                    RemainingSeconds = remainingSeconds,
                    FailedAttempts = info.FailedAttempts,
                    IsPermanentlyLocked = false
                };
            }

            // =================================================
            // BLOK SÜRESİ DOLMUŞ
            // =================================================

            if (info.BlockedUntil.HasValue &&
                info.BlockedUntil.Value <= now)
            {
                Console.WriteLine(
                    $"[RATE LIMIT] STATUS | BLOCK EXPIRED | " +
                    $"Key={key}"
                );

                info.BlockedUntil = null;
            }

            // =================================================
            // NORMAL
            // =================================================

            return new LoginRateStatus
            {
                IsBlocked = false,
                RemainingSeconds = 0,
                FailedAttempts = info.FailedAttempts,
                IsPermanentlyLocked = false
            };
        }
    }

    // =========================================================
    // KALICI BLOK KONTROLÜ
    // =========================================================

    public bool IsPermanentlyLocked(string key)
    {
        if (!_attempts.TryGetValue(key, out var info))
        {
            return false;
        }

        lock (info)
        {
            return info.IsPermanentlyLocked;
        }
    }

    // =========================================================
    // BAŞARISIZ LOGIN
    // =========================================================

    public int RegisterFailedAttempt(string key)
    {
        var info = _attempts.GetOrAdd(
            key,
            _ => new LoginAttemptInfo()
        );

        lock (info)
        {
            info.FailedAttempts++;

            var attempts = info.FailedAttempts;

            Console.WriteLine(
                $"[RATE LIMIT] FAILED | " +
                $"Key={key} | " +
                $"Attempts={attempts}"
            );

            // =================================================
            // 5 DENEME → 5 DAKİKA
            // =================================================

            if (attempts == FirstBlockAttempts)
            {
                info.BlockedUntil =
                    DateTime.UtcNow.Add(FirstBlockDuration);

                Console.WriteLine(
                    $"[RATE LIMIT] 5 DK BLOK | Key={key}"
                );
            }

            // =================================================
            // 10 DENEME → 10 DAKİKA
            // =================================================

            else if (attempts == SecondBlockAttempts)
            {
                info.BlockedUntil =
                    DateTime.UtcNow.Add(SecondBlockDuration);

                Console.WriteLine(
                    $"[RATE LIMIT] 10 DK BLOK | Key={key}"
                );
            }

            // =================================================
            // 15 DENEME → KALICI
            // =================================================

            else if (attempts >= PermanentLockAttempts)
            {
                info.IsPermanentlyLocked = true;
                info.BlockedUntil = null;

                Console.WriteLine(
                    $"[RATE LIMIT] KALICI BLOK | Key={key}"
                );
            }

            return attempts;
        }
    }

    // =========================================================
    // BAŞARILI LOGIN
    // =========================================================

    public void Reset(string key)
    {
        if (_attempts.TryRemove(key, out _))
        {
            Console.WriteLine(
                $"[RATE LIMIT] RESET | Key={key}"
            );
        }
    }

    // =========================================================
    // INTERNAL MODEL
    // =========================================================

    private sealed class LoginAttemptInfo
    {
        public int FailedAttempts { get; set; }

        public DateTime? BlockedUntil { get; set; }

        public bool IsPermanentlyLocked { get; set; }
    }
}


// =============================================================
// RATE STATUS MODEL
// =============================================================

public sealed class LoginRateStatus
{
    public bool IsBlocked { get; set; }

    public int? RemainingSeconds { get; set; }

    public int FailedAttempts { get; set; }

    public bool IsPermanentlyLocked { get; set; }
}