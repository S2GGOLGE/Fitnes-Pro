namespace Apı.Service;

using Microsoft.Data.SqlClient;
public partial class MessageRequestService : IMessageRequestService
{
    public async Task<bool> UpdatePrivacySettingsAsync(int UserId, string permison)
    {
        string[] allowPermison =
        {
            "Everyone",
            "FriendsOnly",
            "Nobody"
        };
        if (!allowPermison.Contains(permison))
            return false;
        await using var connection = new SqlConnection(GetConnectionString());
        await connection.OpenAsync();
        const string sql = """
                IF EXISTS
                (
                    SELECT 1
                    FROM UserPrivacySettings
                    WHERE UserId = @UserId
                )
                BEGIN
                    UPDATE UserPrivacySettings
                    SET
                        MessageRequestPermission = @Permission,
                        UpdatedAt = GETUTCDATE()
                    WHERE UserId = @UserId;
                END
                ELSE
                BEGIN
                INSERT INTO UserPrivacySettings
                    (
                        UserId,
                        MessageRequestPermission,
                        UpdatedAt
                    )
                VALUES
                    (
                        @UserId,
                        @Permission,
                        GETUTCDATE()
                    );
                END
        """;
        await using var command = new SqlCommand(sql, connection);
        command.Parameters.AddWithValue("@UserId", UserId);
        command.Parameters.AddWithValue("@Permission", permison);
        await command.ExecuteNonQueryAsync();
        return true;

    }
}