namespace Apı.Model;

public class JwtModel
{
    public int UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Role { get; set; } = "User";
}