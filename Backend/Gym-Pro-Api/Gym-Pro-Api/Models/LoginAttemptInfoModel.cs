namespace Apı.Model;

public sealed class LoginAttemptInfoModel
{
    public int FailedAttempts { get; set; }

    public DateTime? BlockedUntil { get; set; }

    public bool IsPermanentlyLocked { get; set; }

    /// <summary>
    /// Bu entry hangi kullanıcı adına ait? (Admin unlock'ta username ile
    /// in-memory entry bulmak için kullanılır.) Mevcut akışta opsiyonel
    /// olarak set edilir; mevcut IP-key davranışını bozmaz.
    /// </summary>
    public string? Username { get; set; }
}
