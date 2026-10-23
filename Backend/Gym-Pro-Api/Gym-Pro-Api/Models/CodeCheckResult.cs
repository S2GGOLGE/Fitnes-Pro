
namespace Apı.Model;

public enum CodeCheckStatus
{
    Success,
    InvalidCode,
    Expired,
    AlreadyUsedOrNotFound,
    TooManyAttempts
}

public sealed class CodeCheckResult
{
    public bool Success { get; init; }
    public CodeCheckStatus Status { get; init; }

    public static CodeCheckResult From(CodeCheckStatus status)
    {
        return new CodeCheckResult
        {
            Success = status == CodeCheckStatus.Success,
            Status = status
        };
    }
}
