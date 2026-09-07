namespace Apı.Model;

public sealed class LoginRateStatusModel
{
    public bool IsBlocked { get; set; }

    public int? RemainingSeconds { get; set; }

    public int FailedAttempts { get; set; }

    public bool IsPermanentlyLocked { get; set; }
}