namespace Apı.Service;

public interface ITwoFactorService
{
    Task SendCodeAsync(
        int userıd,
        string email
    );
    Task<bool> VerifyCodeAsync(
        int userId,
        string code
    );
}