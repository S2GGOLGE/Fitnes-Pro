namespace Apı.Model
{
    public class RegisterModel
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Surname { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public string PasswordHashRepeat { get; set; } = string.Empty;
        public string Salt{get;set;}=string.Empty;
    }
}