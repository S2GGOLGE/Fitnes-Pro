using Apı.Model;
using Apı.Services;
using Microsoft.Data.SqlClient;

namespace Apı.Service;

public class LogService : ILogService
{
    private readonly IConfiguration _configuration;

    public LogService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    #region Connection

    private SqlConnection CreateConnection()
    {
        var connectionString =
            _configuration.GetConnectionString("DefaultConnection");

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "Bağlantı dizesi bulunamadı."
            );
        }

        return new SqlConnection(connectionString);
    }

    #endregion

    #region System Log

    public async Task LogSystemAsync(
        string level,
        string action,
        string message,
        string? source = null,
        string? ipAddress = null)
    {
        const string sql = """
            INSERT INTO SystemLogs
            (
                Level,
                Action,
                Message,
                Source,
                IpAddress
            )
            VALUES
            (
                @Level,
                @Action,
                @Message,
                @Source,
                @IpAddress
            );
            """;

        await using var connection = CreateConnection();
        await using var command = new SqlCommand(sql, connection);

        command.Parameters.AddWithValue("@Level", level);
        command.Parameters.AddWithValue("@Action", action);
        command.Parameters.AddWithValue("@Message", message);
        command.Parameters.AddWithValue(
            "@Source",
            (object?)source ?? DBNull.Value
        );
        command.Parameters.AddWithValue(
            "@IpAddress",
            (object?)ipAddress ?? DBNull.Value
        );

        await connection.OpenAsync();
        await command.ExecuteNonQueryAsync();
    }

    #endregion

    #region User Log

    public async Task LogUserAsync(
        int? userId,
        string? username,
        string action,
        string message,
        string? ipAddress = null)
    {
        const string sql = """
            INSERT INTO UserLogs
            (
                UserId,
                Username,
                Action,
                Message,
                IpAddress
            )
            VALUES
            (
                @UserId,
                @Username,
                @Action,
                @Message,
                @IpAddress
            );
            """;

        await using var connection = CreateConnection();
        await using var command = new SqlCommand(sql, connection);

        command.Parameters.AddWithValue(
            "@UserId",
            (object?)userId ?? DBNull.Value
        );

        command.Parameters.AddWithValue(
            "@Username",
            (object?)username ?? DBNull.Value
        );

        command.Parameters.AddWithValue("@Action", action);
        command.Parameters.AddWithValue("@Message", message);

        command.Parameters.AddWithValue(
            "@IpAddress",
            (object?)ipAddress ?? DBNull.Value
        );

        await connection.OpenAsync();
        await command.ExecuteNonQueryAsync();
    }

    #endregion

    #region Appeal Log

    public async Task LogAppealAsync(
        int? appealId,
        string? username,
        string action,
        string message,
        string? performedBy = null,
        string? ipAddress = null)
    {
        const string sql = """
            INSERT INTO AppealLogs
            (
                AppealId,
                Username,
                Action,
                Message,
                PerformedBy,
                IpAddress
            )
            VALUES
            (
                @AppealId,
                @Username,
                @Action,
                @Message,
                @PerformedBy,
                @IpAddress
            );
            """;

        await using var connection = CreateConnection();
        await using var command = new SqlCommand(sql, connection);

        command.Parameters.AddWithValue(
            "@AppealId",
            (object?)appealId ?? DBNull.Value
        );

        command.Parameters.AddWithValue(
            "@Username",
            (object?)username ?? DBNull.Value
        );

        command.Parameters.AddWithValue("@Action", action);
        command.Parameters.AddWithValue("@Message", message);

        command.Parameters.AddWithValue(
            "@PerformedBy",
            (object?)performedBy ?? DBNull.Value
        );

        command.Parameters.AddWithValue(
            "@IpAddress",
            (object?)ipAddress ?? DBNull.Value
        );

        await connection.OpenAsync();
        await command.ExecuteNonQueryAsync();
    }

    #endregion

    #region Admin Log

    public async Task LogAdminAsync(
        string adminUsername,
        string action,
        string message,
        string? targetUsername = null,
        string? ipAddress = null)
    {
        const string sql = """
            INSERT INTO AdminLogs
            (
                AdminUsername,
                Action,
                TargetUsername,
                Message,
                IpAddress
            )
            VALUES
            (
                @AdminUsername,
                @Action,
                @TargetUsername,
                @Message,
                @IpAddress
            );
            """;

        await using var connection = CreateConnection();
        await using var command = new SqlCommand(sql, connection);

        command.Parameters.AddWithValue(
            "@AdminUsername",
            adminUsername
        );

        command.Parameters.AddWithValue(
            "@Action",
            action
        );

        command.Parameters.AddWithValue(
            "@TargetUsername",
            (object?)targetUsername ?? DBNull.Value
        );

        command.Parameters.AddWithValue(
            "@Message",
            message
        );

        command.Parameters.AddWithValue(
            "@IpAddress",
            (object?)ipAddress ?? DBNull.Value
        );

        await connection.OpenAsync();
        await command.ExecuteNonQueryAsync();
    }

    #endregion

    #region General Log

    public async Task LogGeneralAsync(
        string category,
        string action,
        string message,
        string? username = null,
        string? ipAddress = null)
    {
        const string sql = """
            INSERT INTO GeneralLogs
            (
                Category,
                Action,
                Message,
                Username,
                IpAddress
            )
            VALUES
            (
                @Category,
                @Action,
                @Message,
                @Username,
                @IpAddress
            );
            """;

        await using var connection = CreateConnection();
        await using var command = new SqlCommand(sql, connection);

        command.Parameters.AddWithValue(
            "@Category",
            category
        );

        command.Parameters.AddWithValue(
            "@Action",
            action
        );

        command.Parameters.AddWithValue(
            "@Message",
            message
        );

        command.Parameters.AddWithValue(
            "@Username",
            (object?)username ?? DBNull.Value
        );

        command.Parameters.AddWithValue(
            "@IpAddress",
            (object?)ipAddress ?? DBNull.Value
        );

        await connection.OpenAsync();
        await command.ExecuteNonQueryAsync();
    }

    #endregion

    #region Get All Logs

    public async Task<GetLogModel> GetAllLogAsync()
    {
        var result = new GetLogModel();

        result.SystemLogs = await GetSystemLogsAsync();
        result.UserLogs = await GetUserLogsAsync();
        result.AppealLogs = await GetAppealLogsAsync();
        result.AdminLogs = await GetAdminLogsAsync();
        result.GeneralLogs = await GetGeneralLogsAsync();

        return result;
    }

    #endregion

    #region Get System Logs

    private async Task<List<SystemLogModel>> GetSystemLogsAsync()
    {
        const string sql = """
            SELECT
                Id,
                Level,
                Action,
                Message,
                Source,
                IpAddress,
                CreatedAt
            FROM SystemLogs
            ORDER BY CreatedAt DESC;
            """;

        var logs = new List<SystemLogModel>();

        await using var connection = CreateConnection();
        await using var command = new SqlCommand(sql, connection);

        await connection.OpenAsync();

        await using var reader =
            await command.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            logs.Add(new SystemLogModel
            {
                Id = reader.GetInt32(
                    reader.GetOrdinal("Id")
                ),

                Level = reader.GetString(
                    reader.GetOrdinal("Level")
                ),

                Action = reader.GetString(
                    reader.GetOrdinal("Action")
                ),

                Message = reader.GetString(
                    reader.GetOrdinal("Message")
                ),

                Source = reader.IsDBNull(
                    reader.GetOrdinal("Source")
                )
                    ? null
                    : reader.GetString(
                        reader.GetOrdinal("Source")
                    ),

                IpAddress = reader.IsDBNull(
                    reader.GetOrdinal("IpAddress")
                )
                    ? null
                    : reader.GetString(
                        reader.GetOrdinal("IpAddress")
                    ),

                CreatedAt = reader.GetDateTime(
                    reader.GetOrdinal("CreatedAt")
                )
            });
        }

        return logs;
    }

    #endregion

    #region Get User Logs

    private async Task<List<UserLogModel>> GetUserLogsAsync()
    {
        const string sql = """
            SELECT
                Id,
                UserId,
                Username,
                Action,
                Message,
                IpAddress,
                CreatedAt
            FROM UserLogs
            ORDER BY CreatedAt DESC;
            """;

        var logs = new List<UserLogModel>();

        await using var connection = CreateConnection();
        await using var command = new SqlCommand(sql, connection);

        await connection.OpenAsync();

        await using var reader =
            await command.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            logs.Add(new UserLogModel
            {
                Id = reader.GetInt32(
                    reader.GetOrdinal("Id")
                ),

                UserId = reader.IsDBNull(
                    reader.GetOrdinal("UserId")
                )
                    ? null
                    : reader.GetInt32(
                        reader.GetOrdinal("UserId")
                    ),

                Username = reader.IsDBNull(
                    reader.GetOrdinal("Username")
                )
                    ? null
                    : reader.GetString(
                        reader.GetOrdinal("Username")
                    ),

                Action = reader.GetString(
                    reader.GetOrdinal("Action")
                ),

                Message = reader.GetString(
                    reader.GetOrdinal("Message")
                ),

                IpAddress = reader.IsDBNull(
                    reader.GetOrdinal("IpAddress")
                )
                    ? null
                    : reader.GetString(
                        reader.GetOrdinal("IpAddress")
                    ),

                CreatedAt = reader.GetDateTime(
                    reader.GetOrdinal("CreatedAt")
                )
            });
        }

        return logs;
    }

    #endregion

    #region Get Appeal Logs

    private async Task<List<AppealLogModel>> GetAppealLogsAsync()
    {
        const string sql = """
            SELECT
                Id,
                AppealId,
                Username,
                Action,
                Message,
                PerformedBy,
                IpAddress,
                CreatedAt
            FROM AppealLogs
            ORDER BY CreatedAt DESC;
            """;

        var logs = new List<AppealLogModel>();

        await using var connection = CreateConnection();
        await using var command = new SqlCommand(sql, connection);

        await connection.OpenAsync();

        await using var reader =
            await command.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            logs.Add(new AppealLogModel
            {
                Id = reader.GetInt32(
                    reader.GetOrdinal("Id")
                ),

                AppealId = reader.IsDBNull(
                    reader.GetOrdinal("AppealId")
                )
                    ? null
                    : reader.GetInt32(
                        reader.GetOrdinal("AppealId")
                    ),

                Username = reader.IsDBNull(
                    reader.GetOrdinal("Username")
                )
                    ? null
                    : reader.GetString(
                        reader.GetOrdinal("Username")
                    ),

                Action = reader.GetString(
                    reader.GetOrdinal("Action")
                ),

                Message = reader.GetString(
                    reader.GetOrdinal("Message")
                ),

                PerformedBy = reader.IsDBNull(
                    reader.GetOrdinal("PerformedBy")
                )
                    ? null
                    : reader.GetString(
                        reader.GetOrdinal("PerformedBy")
                    ),

                IpAddress = reader.IsDBNull(
                    reader.GetOrdinal("IpAddress")
                )
                    ? null
                    : reader.GetString(
                        reader.GetOrdinal("IpAddress")
                    ),

                CreatedAt = reader.GetDateTime(
                    reader.GetOrdinal("CreatedAt")
                )
            });
        }

        return logs;
    }

    #endregion

    #region Get Admin Logs

    private async Task<List<AdminLogModel>> GetAdminLogsAsync()
    {
        const string sql = """
            SELECT
                Id,
                AdminUsername,
                Action,
                TargetUsername,
                Message,
                IpAddress,
                CreatedAt
            FROM AdminLogs
            ORDER BY CreatedAt DESC;
            """;

        var logs = new List<AdminLogModel>();

        await using var connection = CreateConnection();
        await using var command = new SqlCommand(sql, connection);

        await connection.OpenAsync();

        await using var reader =
            await command.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            logs.Add(new AdminLogModel
            {
                Id = reader.GetInt32(
                    reader.GetOrdinal("Id")
                ),

                AdminUsername = reader.GetString(
                    reader.GetOrdinal("AdminUsername")
                ),

                Action = reader.GetString(
                    reader.GetOrdinal("Action")
                ),

                TargetUsername = reader.IsDBNull(
                    reader.GetOrdinal("TargetUsername")
                )
                    ? null
                    : reader.GetString(
                        reader.GetOrdinal("TargetUsername")
                    ),

                Message = reader.GetString(
                    reader.GetOrdinal("Message")
                ),

                IpAddress = reader.IsDBNull(
                    reader.GetOrdinal("IpAddress")
                )
                    ? null
                    : reader.GetString(
                        reader.GetOrdinal("IpAddress")
                    ),

                CreatedAt = reader.GetDateTime(
                    reader.GetOrdinal("CreatedAt")
                )
            });
        }

        return logs;
    }

    #endregion

    #region Get General Logs

    private async Task<List<GeneralLogModel>> GetGeneralLogsAsync()
    {
        const string sql = """
            SELECT
                Id,
                Category,
                Action,
                Message,
                Username,
                IpAddress,
                CreatedAt
            FROM GeneralLogs
            ORDER BY CreatedAt DESC;
            """;

        var logs = new List<GeneralLogModel>();

        await using var connection = CreateConnection();
        await using var command = new SqlCommand(sql, connection);

        await connection.OpenAsync();

        await using var reader =
            await command.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            logs.Add(new GeneralLogModel
            {
                Id = reader.GetInt32(
                    reader.GetOrdinal("Id")
                ),

                Category = reader.GetString(
                    reader.GetOrdinal("Category")
                ),

                Action = reader.GetString(
                    reader.GetOrdinal("Action")
                ),

                Message = reader.GetString(
                    reader.GetOrdinal("Message")
                ),

                Username = reader.IsDBNull(
                    reader.GetOrdinal("Username")
                )
                    ? null
                    : reader.GetString(
                        reader.GetOrdinal("Username")
                    ),

                IpAddress = reader.IsDBNull(
                    reader.GetOrdinal("IpAddress")
                )
                    ? null
                    : reader.GetString(
                        reader.GetOrdinal("IpAddress")
                    ),

                CreatedAt = reader.GetDateTime(
                    reader.GetOrdinal("CreatedAt")
                )
            });
        }

        return logs;
    }

    #endregion
}