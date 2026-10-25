using System.ComponentModel.DataAnnotations;

namespace Apı.Dtos;

public class SendMessageDto
{
    [Required]
    [Range(1, int.MaxValue)]
    public int ReceiverId { get; set; }
    [Required]
    [RegularExpression("^(Text|Image|File)$")]
    public string MessageType { get; set; } = "Text";
    [Required]
    [StringLength(10000, MinimumLength = 1)]
    public string Content { get; set; } = string.Empty;
}