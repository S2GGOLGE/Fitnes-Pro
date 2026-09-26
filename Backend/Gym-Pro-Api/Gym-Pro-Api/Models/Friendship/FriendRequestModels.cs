namespace Apı.Model;

public class FriendRequestModel
{
    public int Id { get; set; }

    public int SenderId { get; set; }

    public int ReceiverId { get; set; }

    public string Status { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    public DateTime? RespondedAt { get; set; }

    public string SenderUsername { get; set; } = string.Empty;

    public string SenderName { get; set; } = string.Empty;

    public string SenderSurname { get; set; } = string.Empty;

    public string ReceiverUsername { get; set; } = string.Empty;

    public string ReceiverName { get; set; } = string.Empty;

    public string ReceiverSurname { get; set; } = string.Empty;
}