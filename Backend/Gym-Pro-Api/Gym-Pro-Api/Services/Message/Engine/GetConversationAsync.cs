namespace Apı.Service;

using Apı.Dtos;
using Apı.Model;
using Microsoft.Data.SqlClient;

public partial class MessageService : IMessageService
{
    public async Task<ApiResponseModel> GetConversationAsync(int userId, int otherUserId)
    {
        if (userId <= 0 || otherUserId <= 0 || userId == otherUserId)
            return ApiResponseModel.Fail("Geçersiz Kullanıcı");
        await using var connection =
        new SqlConnection(GetConnectionString());
        await connection.OpenAsync();
        const string sql = """
        SELECT Id, SenderId, ReceiverId, Content, MessageType,
                   IsRead, ReadAt, CreatedAt
            FROM dbo.Messages
            WHERE
                (
                    (SenderId = @UserId AND ReceiverId = @OtherUserId)
                    OR
                    (SenderId = @OtherUserId AND ReceiverId = @UserId)
                )
                AND IsDeleted = 0
            ORDER BY CreatedAt ASC, Id ASC;
        """;
        await using var command = new SqlCommand(sql, connection);
        command.Parameters.AddWithValue("@UserId", userId);
        command.Parameters.AddWithValue("@OtherUserId", otherUserId);
        var message = new List<object>();
        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            // Sorgu kolon sirasi:
            //   0:Id, 1:SenderId, 2:ReceiverId, 3:Content,
            //   4:MessageType, 5:IsRead (BIT NOT NULL), 6:ReadAt (DATETIME2 NULL),
            //   7:CreatedAt
            // IsRead BIT NOT NULL DEFAULT 0 oldugu icin GetBoolean güvenli.
            // ReadAt nullable oldugu icin IsDBNull ile korunmali.
            bool isRead = reader.GetBoolean(5);
            DateTime? readAt = reader.IsDBNull(6)
                ? (DateTime?)null
                : reader.GetDateTime(6);

            message.Add(new
            {
                Id = reader.GetInt32(0),
                SenderId = reader.GetInt32(1),
                ReceiverId = reader.GetInt32(2),
                Content = reader.GetString(3),
                MessageType = reader.GetString(4),
                IsRead = isRead,
                ReadAt = readAt,
                CreatedAt = reader.GetDateTime(7)
            });
        }
        return ApiResponseModel.Ok("Konuşma Geçmişi getirildi", message);
    }
}