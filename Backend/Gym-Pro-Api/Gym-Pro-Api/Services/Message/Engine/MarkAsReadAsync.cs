namespace Apı.Service;

using Apı.Dtos;
using Apı.Model;
using Microsoft.Data.SqlClient;

public partial class MessageService : IMessageService
{
    public async Task<ApiResponseModel> MarkAsReadAsync(int userId, int messageId)
    {
        if (userId <= 0 || messageId <= 0)
            return ApiResponseModel.Fail("Geçersiz İşlem");
        await using var connection = new SqlConnection(GetConnectionString());
        await connection.OpenAsync();
        const string sql = """
         UPDATE dbo.Messages
            SET IsRead = 1, ReadAt = GETUTCDATE()
            WHERE Id = @MessageId
              AND ReceiverId = @UserId
              AND IsRead = 0
              AND IsDeleted = 0;
        """;
        await using var command = new SqlCommand(sql, connection);
        command.Parameters.AddWithValue("@MessageId", messageId);
        command.Parameters.AddWithValue("@UserId", userId);
        int affected = await command.ExecuteNonQueryAsync();
        return affected == 1
        ? ApiResponseModel.Ok("Mesaj Okundu olarak işaretlendi")
        : ApiResponseModel.Fail("Mesaj bulunamadı veya zaten okundu");
    }
}