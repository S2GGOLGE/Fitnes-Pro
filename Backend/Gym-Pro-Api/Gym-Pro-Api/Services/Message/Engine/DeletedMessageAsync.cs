namespace Apı.Service;

using Apı.Model;
using Microsoft.Data.SqlClient;

public partial class MessageService : IMessageService
{
    public async Task<ApiResponseModel> DeletedMessageAsync(int userId, int message)
    {
        if (userId <= 0 || message <= 0)
            return ApiResponseModel.Fail("Geçersiz işlem");
        await using var connection = new SqlConnection(GetConnectionString());
        await connection.OpenAsync();
        const string sql = """
        UPDATE dbo.Messages
            SET IsDeleted = 1, DeletedAt = GETUTCDATE()
            WHERE Id = @MessageId
              AND SenderId = @UserId
              AND IsDeleted = 0;
        """;
        await using var command = new SqlCommand(sql, connection);
        command.Parameters.AddWithValue("@MessageId", message);
        command.Parameters.AddWithValue("@UserId", userId);
        int affected = await command.ExecuteNonQueryAsync();
        return affected == 1
        ? ApiResponseModel.Ok("Mesaj silindi")
        : ApiResponseModel.Fail("Mesaj Bulunamadı yada bu mesaj sana ait değil");
    }
}