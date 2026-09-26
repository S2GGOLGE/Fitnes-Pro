namespace Apı.Model;

public class FriendModel
{
    public int UserId { get; set; }

    public int FriendUserId { get; set; }

    public string Username { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Surname { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }
}