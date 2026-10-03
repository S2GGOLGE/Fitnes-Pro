namespace Apı.Dtos;

public class AcceptedMessageContactDto
{
    public int UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public int RequestId { get; set; }
}