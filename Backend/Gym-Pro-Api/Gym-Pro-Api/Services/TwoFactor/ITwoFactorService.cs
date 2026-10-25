namespace Apı.Service;

public interface ITwoFactorService
{
    Task<DateTime> SendCodeAsync(
        int userıd,
        string email
    );
    Task<bool> VerifyCodeAsync(
        int userId,
        string code
    );
}
