namespace Apı.Model;

public class UpdateEmailModel
{
    public int UserId { get; set; }
    public string Email { get; set; } = string.Empty;
}