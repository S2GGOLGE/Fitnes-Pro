namespace Apı.Service;

using Apı.Dtos;
using Microsoft.Data.SqlClient;

public partial class MessageRequestService:IMessageRequestService
{
    public async Task<PrivacySettingsResponseDto> GetPrivacySettingsAsync(int userId)
    {
        await using var connection = new SqlConnection(GetConnectionString());
        await connection.OpenAsync();
        const string sql = """
        SELECT
        UserId,
        MessageRequestPermission,
        UpdatedAt
        FROM UserPrivacySettings
        WHERE UserId = @UserId;
        """;
        await using var command = new SqlCommand(sql, connection);
        command.Parameters.AddWithValue("@UserId", userId);
        await using var reader = await command.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            return new PrivacySettingsResponseDto
            {
                UserId = reader.GetInt32(0),
                MessageRequestPermission = reader.GetString(1),
                UpdatedAt = reader.GetDateTime(2)
            };
        }
        await reader.CloseAsync();
        // Kullanıcının henüz ayarı yoksa varsayılan:
        // Everyone
        const string insertsql = """
         INSERT INTO UserPrivacySettings
                (
                    UserId,
                    MessageRequestPermission,
                    UpdatedAt
                )
                VALUES
                (
                    @UserId,
                    N'Everyone',
                    GETUTCDATE()
                );
        """;
        await using var insercommand = new SqlCommand(insertsql, connection);
        insercommand.Parameters.AddWithValue("@UserId", userId);
        await insercommand.ExecuteNonQueryAsync();
        return new PrivacySettingsResponseDto
        {
            UserId = userId,
            MessageRequestPermission = "Everyone",
            UpdatedAt = DateTime.UtcNow
        };
    }
}