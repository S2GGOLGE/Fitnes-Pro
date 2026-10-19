using System.ComponentModel.DataAnnotations;
namespace Apı.Dtos;

public class SendMessageDto
{
    [Required]
    [Range(1, int.MaxValue)]
    public string username { get; set; }=string.Empty;
    [Required]
    [RegularExpression(
        "^(Text|Image|Fıle)$"
    )]
    public string MessageType { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
}