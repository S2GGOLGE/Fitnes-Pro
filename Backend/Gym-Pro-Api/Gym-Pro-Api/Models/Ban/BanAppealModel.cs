namespace Apı.Model;

public sealed class BanAppealModel
{
    public int Id { get; set; }

    public string Username { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;

    public string Status { get; set; } = BanAppealStatus.Pending;

    public DateTime CreatedAt { get; set; }

    public DateTime? DecidedAt { get; set; }

    public string? DecidedBy { get; set; }

    public string? AdminNote { get; set; }
}
