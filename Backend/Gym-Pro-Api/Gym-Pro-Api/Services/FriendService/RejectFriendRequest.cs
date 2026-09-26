namespace Apı.Service;

using Microsoft.Data.SqlClient;
using Apı.Model;
public partial class FriendService
{
    // =========================================================
    // ARKADAŞLIK İSTEĞİNİ REDDET
    // =========================================================

    public async Task<ApiResponseModel> RejectRequestAsync(
        int requestId,
        int userId)
    {
        await using var connection =
            new SqlConnection(_connectionString);

        await connection.OpenAsync();

        const string query = """
        UPDATE dbo.FriendRequests
        SET
            Status = N'Rejected',
            RespondedAt = GETUTCDATE()
        WHERE Id = @RequestId
          AND ReceiverId = @UserId
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
                "Arkadaşlık isteği bulunamadı veya bu isteği reddetme yetkiniz yok."
            );
        }

        return ApiResponseModel.Ok(
            "Arkadaşlık isteği reddedildi."
        );
    }
}