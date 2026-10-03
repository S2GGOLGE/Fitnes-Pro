namespace Apı.Service;

using Apı.Dtos;
using Microsoft.Data.SqlClient;

public partial class MessageRequestService : IMessageRequestService
{
    public async Task<PrivacySettingsResponseDto> GetPrivacySettingsAsync(int userId)
    {
        await using var connection = new SqlConnection(GetConnectionString());
        await connection.OpenAsync();

        const string selectSql = """
            SELECT
                UserId,
                MessageRequestPermission,
                UpdatedAt
            FROM UserPrivacySettings
            WHERE UserId = @UserId;
            """;

        await using (var selectCommand = new SqlCommand(selectSql, connection))
        {
            selectCommand.Parameters.AddWithValue("@UserId", userId);

            await using var reader = await selectCommand.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                return new PrivacySettingsResponseDto
                {
                    UserId = reader.GetInt32(0),
                    MessageRequestPermission = reader.GetString(1),
                    UpdatedAt = reader.GetDateTime(2)
                };
            }
        }

        // --------------------------------------------------------
        // KAYIT YOKSA VARSAYILAN OLUŞTUR
        //
        // UserPrivacySettings.UserId PRIMARY KEY olduğu için iki
        // eşzamanlı istek aynı userId için INSERT denerse unique
        // violation olur. Aşağıdaki try/catch bu yarış koşulunu
        // defansif olarak yakalar; sonrasında SELECT tekrarı ile
        // doğru satırı okuruz.
        // --------------------------------------------------------
        const string insertSql = """
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

        try
        {
            await using var insertCommand = new SqlCommand(insertSql, connection);
            insertCommand.Parameters.AddWithValue("@UserId", userId);
            await insertCommand.ExecuteNonQueryAsync();
        }
        catch (SqlException ex)
            when (ex.Number == 2627 || ex.Number == 2601)
        {
            // Yarış koşulu: başka bir thread bu kullanıcı için
            // kaydı az önce oluşturdu. Sessizce yutulur; alttaki
            // SELECT ile nihai değer okunur.
        }

        // INSERT başarılı olduysa ya da rakip thread araya girdiyse,
        // güncel değeri döndürmek için tekrar okuyalım.
        await using (var rereadCommand = new SqlCommand(selectSql, connection))
        {
            rereadCommand.Parameters.AddWithValue("@UserId", userId);

            await using var reader = await rereadCommand.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                return new PrivacySettingsResponseDto
                {
                    UserId = reader.GetInt32(0),
                    MessageRequestPermission = reader.GetString(1),
                    UpdatedAt = reader.GetDateTime(2)
                };
            }
        }

        // Hiçbir koşulda buraya düşmemeli; düşersek güvenli varsayılan dön.
        return new PrivacySettingsResponseDto
        {
            UserId = userId,
            MessageRequestPermission = "Everyone",
            UpdatedAt = DateTime.UtcNow
        };
    }
}