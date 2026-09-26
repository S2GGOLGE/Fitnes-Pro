namespace Apı.Service;

using Microsoft.Data.SqlClient;
using Apı.Model;
public partial class FriendService
{
    // =========================================================
    // GÖNDERİLEN ARKADAŞLIK İSTEĞİNİ İPTAL ET
    // =========================================================

    public async Task<ApiResponseModel> CancelRequestAsync(
        int requestId,
        int userId)
    {
        await using var connection =
            new SqlConnection(_connectionString);

        await connection.OpenAsync();

        const string query = """
        UPDATE dbo.FriendRequests
        SET
            Status = N'Cancelled',
            RespondedAt = GETUTCDATE()
        WHERE Id = @RequestId
          AND SenderId = @UserId
          AND Status = N'Pending';
        """;

        await using var command =
            new SqlCommand(query, connection);

        command.Parameters.Add(
            "@RequestId",
            System.Data.SqlDbType.Int
        ).Value = requestId;

        command.Parameters.Add(
            "@UserId",
            System.Data.SqlDbType.Int
        ).Value = userId;

        var affectedRows =
            await command.ExecuteNonQueryAsync();

        if (affectedRows == 0)
        {
            return ApiResponseModel.Fail(
                "Arkadaşlık isteği bulunamadı veya bu isteği iptal etme yetkiniz yok."
            );
        }

        return ApiResponseModel.Ok(
            "Arkadaşlık isteği iptal edildi."
        );
    }
}