using Microsoft.Data.SqlClient;

namespace Apı.Service;

public sealed class NotificationSettingsService(IConfiguration configuration)
{
    private readonly string _connectionString = configuration.GetConnectionString("DefaultConnection")
        ?? throw new InvalidOperationException("DefaultConnection bulunamadı.");

    public async Task<(string Channel, string Priority)> GetAsync(int userId)
    {
        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync();
        await using var command = new SqlCommand("SELECT [Channel], [Priority] FROM [dbo].[UserNotificationSettings] WHERE [UserId] = @UserId", connection);
        command.Parameters.AddWithValue("@UserId", userId);
        await using var reader = await command.ExecuteReaderAsync();
        return await reader.ReadAsync() ? (reader.GetString(0), reader.GetString(1)) : ("InApp", "All");
    }

    public async Task SaveAsync(int userId, string channel, string priority)
    {
        if (channel == "Email" && !await IsEmailVerifiedAsync(userId))
            throw new InvalidOperationException("E-posta bildirimleri için doğrulanmış e-posta adresi gereklidir.");
        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync();
        const string sql = """
            IF EXISTS (SELECT 1 FROM [dbo].[UserNotificationSettings] WHERE [UserId] = @UserId)
                UPDATE [dbo].[UserNotificationSettings] SET [Channel] = @Channel, [Priority] = @Priority, [UpdatedAt] = GETUTCDATE() WHERE [UserId] = @UserId;
            ELSE
                INSERT INTO [dbo].[UserNotificationSettings] ([UserId], [Channel], [Priority]) VALUES (@UserId, @Channel, @Priority);
            """;
        await using var command = new SqlCommand(sql, connection);
        command.Parameters.AddWithValue("@UserId", userId);
        command.Parameters.AddWithValue("@Channel", channel);
        command.Parameters.AddWithValue("@Priority", priority);
        await command.ExecuteNonQueryAsync();
    }

    public async Task<bool> IsEmailVerifiedAsync(int userId)
    {
        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync();
        await using var command = new SqlCommand("SELECT [EmailVerified] FROM [dbo].[Users] WHERE [Id] = @UserId", connection);
        command.Parameters.AddWithValue("@UserId", userId);
        var result = await command.ExecuteScalarAsync();
        return result is not null and not DBNull && Convert.ToBoolean(result);
    }
}
