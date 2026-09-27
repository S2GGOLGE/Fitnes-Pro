namespace Apı.Dtos;

public class PrivacySettingsResponseDto
{
    public int UserId { get; set; }
    public string MessageRequestPermission { get; set; } = "Everyone";
    public DateTime UpdatedAt { get; set; }
}