namespace Apı.Service;

public class EmailModel
{
    public int UserId { get; set; }

    public string Subject { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;
}