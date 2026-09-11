namespace Apı.Service;

using System.Collections.Concurrent;
using Apı.Model;

public class LoginRateLimitingService
{
    #region RATE LIMIT AYARLARI

    private const int FirstBlockAttempts = 5;
    private const int SecondBlockAttempts = 10;
    private const int PermanentLockAttempts = 15;

    private static readonly TimeSpan FirstBlockDuration =
        TimeSpan.FromMinutes(5);

    private static readonly TimeSpan SecondBlockDuration =
        TimeSpan.FromMinutes(10);

    #endregion


    #region RATE STORAGE

    private readonly ConcurrentDictionary<string, LoginAttemptInfoModel> _attempts = new();

    private readonly Apı.Service.Authentication.BanStorageService _banStorage;

    #endregion


    #region CONSTRUCTOR

    public LoginRateLimitingService(
        Apı.Service.Authentication.BanStorageService banStorage)
    {
        _banStorage = banStorage
            ?? throw new ArgumentNullException(nameof(banStorage));
    }

    #endregion


    #region GENEL DURUM

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


            #region KALICI BLOK

            if (info.IsPermanentlyLocked)
            {
                Console.WriteLine(
                    $"[RATE LIMIT] PERMANENT BLOCK | Key={key}"
                );

                return true;
            }

            #endregion


            #region AKTİF BLOK YOK

            if (!info.BlockedUntil.HasValue)
            {
                return false;
            }

            #endregion


            #region GEÇİCİ BLOK AKTİF

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

            #endregion


            #region BLOK SÜRESİ DOLDU

            Console.WriteLine(
                $"[RATE LIMIT] BLOCK EXPIRED | " +
                $"Key={key} | " +
                $"Attempts={info.FailedAttempts}"
            );

            info.BlockedUntil = null;

            return false;

            #endregion
        }
    }

    #endregion


    #region RATE DURUMUNU GETİR

    public LoginRateStatusModel GetStatus(string key)
    {
        #region KEY YOK

        if (!_attempts.TryGetValue(key, out var info))
        {
            Console.WriteLine(
                $"[RATE LIMIT] STATUS | KEY YOK | Key={key}"
            );

            return new LoginRateStatusModel
            {
                IsBlocked = false,
                RemainingSeconds = 0,
                FailedAttempts = 0,
                IsPermanentlyLocked = false
            };
        }

        #endregion


        lock (info)
        {
            var now = DateTime.UtcNow;


            #region KALICI KİLİT

            if (info.IsPermanentlyLocked)
            {
                Console.WriteLine(
                    $"[RATE LIMIT] STATUS | PERMANENT | " +
                    $"Key={key} | " +
                    $"Attempts={info.FailedAttempts}"
                );

                return new LoginRateStatusModel
                {
                    IsBlocked = true,
                    RemainingSeconds = null,
                    FailedAttempts = info.FailedAttempts,
                    IsPermanentlyLocked = true
                };
            }

            #endregion


            #region GEÇİCİ BLOK

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

                return new LoginRateStatusModel
                {
                    IsBlocked = true,
                    RemainingSeconds = remainingSeconds,
                    FailedAttempts = info.FailedAttempts,
                    IsPermanentlyLocked = false
                };
            }

            #endregion


            #region BLOK SÜRESİ DOLMUŞ

            if (info.BlockedUntil.HasValue &&
                info.BlockedUntil.Value <= now)
            {
                Console.WriteLine(
                    $"[RATE LIMIT] STATUS | BLOCK EXPIRED | " +
                    $"Key={key}"
                );

                info.BlockedUntil = null;
            }

            #endregion


            #region NORMAL

            return new LoginRateStatusModel
            {
                IsBlocked = false,
                RemainingSeconds = 0,
                FailedAttempts = info.FailedAttempts,
                IsPermanentlyLocked = false
            };

            #endregion
        }
    }

    #endregion


    #region KALICI BLOK KONTROLÜ

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

    #endregion


    #region BAŞARISIZ LOGIN

    /// <summary>
    /// Başarısız login denemesini kaydeder. 15. denemede:
    ///   1) In-memory flag'i set eder (mevcut davranış).
    ///   2) username verilmişse DB'ye kalıcı ban yazar (yeni).
    /// Bu sayede backend restart'ta bile kalıcı ban korunur.
    /// </summary>
    public async Task<int> RegisterFailedAttempt(
        string key,
        string? username = null)
    {
        var info = _attempts.GetOrAdd(
            key,
            _ => new LoginAttemptInfoModel()
        );

        int attempts;

        lock (info)
        {
            info.FailedAttempts++;

            attempts = info.FailedAttempts;

            if (!string.IsNullOrWhiteSpace(username))
            {
                info.Username = username;
            }

            Console.WriteLine(
                $"[RATE LIMIT] FAILED | " +
                $"Key={key} | " +
                $"Username={info.Username ?? "-"} | " +
                $"Attempts={attempts}"
            );


            #region 5 DENEME → 5 DAKİKA

            if (attempts == FirstBlockAttempts)
            {
                info.BlockedUntil =
                    DateTime.UtcNow.Add(FirstBlockDuration);

                Console.WriteLine(
                    $"[RATE LIMIT] 5 DK BLOK | Key={key}"
                );
            }

            #endregion


            #region 10 DENEME → 10 DAKİKA

            else if (attempts == SecondBlockAttempts)
            {
                info.BlockedUntil =
                    DateTime.UtcNow.Add(SecondBlockDuration);

                Console.WriteLine(
                    $"[RATE LIMIT] 10 DK BLOK | Key={key}"
                );
            }

            #endregion


            #region 15 DENEME → KALICI

            else if (attempts >= PermanentLockAttempts)
            {
                info.IsPermanentlyLocked = true;
                info.BlockedUntil = null;

                Console.WriteLine(
                    $"[RATE LIMIT] KALICI BLOK | Key={key} | " +
                    $"Username={info.Username ?? "-"}"
                );
            }

            #endregion
        }

        // 15. denemede DB'ye kalıcı ban yaz (in-memory lock'un dışında,
        // deadlock riski yok). Username yoksa eski davranışa düşer.
        if (attempts >= PermanentLockAttempts &&
            !string.IsNullOrWhiteSpace(username))
        {
            try
            {
                await _banStorage.InsertBanAsync(
                    username!,
                    "15 başarısız login denemesi"
                );

                Console.WriteLine(
                    $"[RATE LIMIT] DB KALICI BAN YAZILDI | Username={username}"
                );
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    $"[RATE LIMIT] DB BAN YAZIM HATASI | " +
                    $"Username={username} | {ex.Message}"
                );
            }
        }

        return attempts;
    }

    #endregion


    #region BAŞARILI LOGIN

    public void Reset(string key)
    {
        if (_attempts.TryGetValue(key, out var info))
        {
            lock (info)
            {
                if (info.IsPermanentlyLocked)
                {
                    Console.WriteLine(
                        $"[RATE LIMIT] RESET REDDEDILDI (KALICI BLOK) | Key={key}"
                    );

                    return;
                }
            }
        }

        if (_attempts.TryRemove(key, out _))
        {
            Console.WriteLine(
                $"[RATE LIMIT] RESET | Key={key}"
            );
        }
    }

    #endregion


    #region ADMIN: KALICI KİLİT KALDIRMA

    /// <summary>
    /// Admin'in onayladığı appeal sonrası çağrılır.
    /// Hem DB'den banı siler hem de bu kullanıcıya ait tüm in-memory
    /// entry'leri temizler. Mevcut 5/10 dk'lık geçici bloklar da bu yolla
    /// kalkar; admin yeni onay verdiyse kullanıcı temiz başlar.
    /// </summary>
    public async Task RemovePermanentLockAsync(string username)
    {
        if (string.IsNullOrWhiteSpace(username))
        {
            return;
        }

        try
        {
            await _banStorage.RemoveBanAsync(username);

            Console.WriteLine(
                $"[RATE LIMIT] DB KALICI BAN SİLİNDİ | Username={username}"
            );
        }
        catch (Exception ex)
        {
            Console.WriteLine(
                $"[RATE LIMIT] DB BAN SİLME HATASI | " +
                $"Username={username} | {ex.Message}"
            );
        }

        // Username eşleşmesiyle tüm in-memory entry'leri temizle.
        // Bir kullanıcı birden fazla IP'den deneme yapmış olabilir; hepsi silinir.
        foreach (var pair in _attempts)
        {
            if (_attempts.TryGetValue(pair.Key, out var info))
            {
                lock (info)
                {
                    if (string.Equals(
                            info.Username,
                            username,
                            StringComparison.Ordinal))
                    {
                        _attempts.TryRemove(pair.Key, out _);

                        Console.WriteLine(
                            $"[RATE LIMIT] IN-MEMORY ENTRY SİLİNDİ | " +
                            $"Key={pair.Key} | Username={username}"
                        );
                    }
                }
            }
        }
    }

    #endregion
}
