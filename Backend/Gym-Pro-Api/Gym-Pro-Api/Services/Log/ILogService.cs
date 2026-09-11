using Apı.Model;

namespace Apı.Services;

public interface ILogService
{
    #region System Log

    Task LogSystemAsync(
        string level,
        string action,
        string message,
        string? source = null,
        string? ipAddress = null
    );

    #endregion

    #region User Log

    Task LogUserAsync(
        int? userId,
        string? username,
        string action,
        string message,
        string? ipAddress = null
    );

    #endregion

    #region Appeal Log

    Task LogAppealAsync(
        int? appealId,
        string? username,
        string action,
        string message,
        string? performedBy = null,
        string? ipAddress = null
    );

    #endregion

    #region Admin Log

    Task LogAdminAsync(
        string adminUsername,
        string action,
        string message,
        string? targetUsername = null,
        string? ipAddress = null
    );

    #endregion

    #region General Log

    Task LogGeneralAsync(
        string category,
        string action,
        string message,
        string? username = null,
        string? ipAddress = null
    );

    #endregion

    #region Get All Logs

    Task<GetLogModel> GetAllLogAsync();

    #endregion
}