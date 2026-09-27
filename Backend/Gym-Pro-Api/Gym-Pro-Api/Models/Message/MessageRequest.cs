using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace Apı.Model
{
    [Table("MessageRequests")]
    public class MessageRequest
    {
        [Key]
        public int Id { get; set; }
        [Required]
        public int SenderId { get; set; }
        [Required]
        public int ReceiverId { get; set; }
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "Pending";
        public DateTime CreatedAt { get; set; }

        public DateTime? RespondedAt { get; set; }

        public DateTime? ExpiresAt { get; set; }
    }
}