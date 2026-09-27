using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace Apı.Model
{
    [Table("UserPrivacySettings")]
    public class UserPrivacySettings
    {
        [Key]
        public int UserId { get; set; }
        [MaxLength(20)]
        public string MessageRequestPermission { get; set; } = "MessageRequestPermission";
        public DateTime UpdateAt { get; set; }
    }
}
