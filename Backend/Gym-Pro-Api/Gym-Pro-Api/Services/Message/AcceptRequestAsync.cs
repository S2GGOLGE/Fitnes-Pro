namespace Apı.Service;

using Apı.Model;
using Microsoft.Data.SqlClient;

public partial class MessageRequestService : IMessageRequestService
{
    // =========================================================
    // MESAJ İSTEĞİNİ KABUL ET
    // Yalnızca alıcı (ReceiverId == userId) ve yalnızca
    // durumu Pending olan istekler kabul edilebilir.
    // =========================================================
    public async Task<ApiResponseModel> AcceptRequestAsync(
        int requestId,
        int userId)
    {
        await using var connection =
            new SqlConnection(GetConnectionString());

        await connection.OpenAsync();

        const string query = """
            UPDATE MessageRequests
            SET
                Status = N'Accepted',
                RespondedAt = GETUTCDATE()
            WHERE Id = @RequestId
              AND ReceiverId = @UserId
              AND Status = N'Pending';
            """;

        await using var command =
            new SqlCommand(query, connection);

        command.Parameters.AddWithValue("@RequestId", requestId);
        command.Parameters.AddWithValue("@UserId", userId);

        var affected =
            await command.ExecuteNonQueryAsync();

        if (affected == 0)
        {
            return ApiResponseModel.Fail(
                "Mesaj isteği bulunamadı, zaten yanıtlanmış veya bu isteği kabul etme yetkiniz yok.");
        }

        return ApiResponseModel.Ok(
            "Mesaj isteği kabul edildi.");
    }
}