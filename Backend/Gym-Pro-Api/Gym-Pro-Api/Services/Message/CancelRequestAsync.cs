namespace Apı.Service;

using Apı.Model;
using Microsoft.Data.SqlClient;

public partial class MessageRequestService : IMessageRequestService
{
    // =========================================================
    // GÖNDERİLEN MESAJ İSTEĞİNİ İPTAL ET
    // Yalnızca gönderen (SenderId == userId) ve yalnızca
    // durumu Pending olan istekler iptal edilebilir.
    // =========================================================
    public async Task<ApiResponseModel> CancelRequestAsync(
        int requestId,
        int userId)
    {
        await using var connection =
            new SqlConnection(GetConnectionString());

        await connection.OpenAsync();

        const string query = """
            UPDATE MessageRequests
            SET
                Status = N'Cancelled',
                RespondedAt = GETUTCDATE()
            WHERE Id = @RequestId
              AND SenderId = @UserId
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
                "Mesaj isteği bulunamadı, zaten yanıtlanmış veya bu isteği iptal etme yetkiniz yok.");
        }

        return ApiResponseModel.Ok(
            "Mesaj isteği iptal edildi.");
    }
}