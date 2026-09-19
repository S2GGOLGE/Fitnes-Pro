namespace Apı.Model;

public sealed class BannedUserModel
{
    public string Username { get; set; } = string.Empty;

    public DateTime BannedAt { get; set; }

    public string? Reason { get; set; }
}
