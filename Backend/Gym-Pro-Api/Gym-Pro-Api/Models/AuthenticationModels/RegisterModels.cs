namespace Apı.Model
{
    public class RegisterModel
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Surname { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string PasswordRepeat { get; set; } = string.Empty;

        // Kullanıcı fitness seviyesi (Role sisteminden bağımsız).
        // Varsayılan: "Acemi". Sadece "Acemi", "Orta", "Uzman" kabul edilir.
        public string Level { get; set; } = "Acemi";
    }
}