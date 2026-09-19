using Microsoft.Data.SqlClient;

namespace Apı.Service;

public class TwoFactorSettingsService : ITwoFactorSettingsService
{
    private readonly IConfiguration _configuration;

    public TwoFactorSettingsService(
        IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public async Task<bool> IsEnabledAsync(int userId)
    {
        string connectionString =
            _configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException(
                "DefaultConnection bulunamadı.");

        const string sql = """
            SELECT [IsEnabled]
            FROM [dbo].[UserTwoFactorSettings]
            WHERE [UserId] = @UserId;
            """;

        using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync();

        using var command = new SqlCommand(sql, connection);

        command.Parameters.AddWithValue("@UserId", userId);

        object? result = await command.ExecuteScalarAsync();

        return result != null && result != DBNull.Value
            && Convert.ToBoolean(result);
    }

    public async Task EnableAsync(
        int userId,
        string method = "Email")
    {
        string connectionString =
            _configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException(
                "DefaultConnection bulunamadı.");

        const string sql = """
            IF EXISTS
            (
                SELECT 1
                FROM [dbo].[UserTwoFactorSettings]
                WHERE [UserId] = @UserId
            )
            BEGIN
                UPDATE [dbo].[UserTwoFactorSettings]
                SET
                    [IsEnabled] = 1,
                    [Method] = @Method,
                    [EnabledAt] = COALESCE(
                        [EnabledAt],
                        GETUTCDATE()
                    ),
                    [UpdatedAt] = GETUTCDATE()
                WHERE [UserId] = @UserId;
            END
            ELSE
            BEGIN
                INSERT INTO [dbo].[UserTwoFactorSettings]
                (
                    [UserId],
                    [IsEnabled],
                    [Method],
                    [EnabledAt],
                    [UpdatedAt]
                )
                VALUES
                (
                    @UserId,
                    1,
                    @Method,
                    GETUTCDATE(),
                    GETUTCDATE()
                );
            END
            """;

        using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync();

        using var command = new SqlCommand(sql, connection);

        command.Parameters.AddWithValue("@UserId", userId);
        command.Parameters.AddWithValue("@Method", method);

        await command.ExecuteNonQueryAsync();
    }

    public async Task DisableAsync(int userId)
    {
        string connectionString =
            _configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException(
                "DefaultConnection bulunamadı.");

        const string sql = """
            UPDATE [dbo].[UserTwoFactorSettings]
            SET
                [IsEnabled] = 0,
                [UpdatedAt] = GETUTCDATE()
            WHERE [UserId] = @UserId;
            """;

        using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync();

        using var command = new SqlCommand(sql, connection);

        command.Parameters.AddWithValue("@UserId", userId);

        await command.ExecuteNonQueryAsync();
    }
}