namespace Apı.Service;

public interface ITwoFactorSettingsService
{
    Task<bool> IsEnabledAsync(int userId);

    Task EnableAsync(int userId, string method = "Email");

    Task DisableAsync(int userId);
}