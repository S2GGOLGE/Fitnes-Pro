namespace Apı.Service;

using Microsoft.Data.SqlClient;
using Apı.Model;
public partial class FriendService
{
    // =========================================================
    // ARKADAŞLIK İSTEĞİNİ KABUL ET
    // =========================================================

    public async Task<ApiResponseModel> AcceptRequestAsync(
        int requestId,
        int userId)
    {
        await using var connection =
            new SqlConnection(_connectionString);

        await connection.OpenAsync();

        await using var transaction =
            await connection.BeginTransactionAsync();

        try
        {
            // =====================================================
            // ARKADAŞLIK İSTEĞİNİ BUL
            // =====================================================

            const string requestQuery = """
            SELECT
                SenderId,
                ReceiverId
            FROM dbo.FriendRequests
            WHERE Id = @RequestId
              AND ReceiverId = @UserId
              AND Status = N'Pending';
            """;

            int senderId;
            int receiverId;

            await using (var requestCommand =
                new SqlCommand(
                    requestQuery,
                    connection,
                    (SqlTransaction)transaction))
            {
                requestCommand.Parameters.Add(
                    "@RequestId",
                    System.Data.SqlDbType.Int
                ).Value = requestId;

                requestCommand.Parameters.Add(
                    "@UserId",
                    System.Data.SqlDbType.Int
                ).Value = userId;

                await using var reader =
                    await requestCommand.ExecuteReaderAsync();

                if (!await reader.ReadAsync())
                {
                    await transaction.RollbackAsync();

                    return ApiResponseModel.Fail(
                        "Arkadaşlık isteği bulunamadı veya bu isteği kabul etme yetkiniz yok."
                    );
                }

                senderId =
                    reader.GetInt32(
                        reader.GetOrdinal("SenderId")
                    );

                receiverId =
                    reader.GetInt32(
                        reader.GetOrdinal("ReceiverId")
                    );
            }

            // =====================================================
            // ARKADAŞLIK KAYITLARINI OLUŞTUR
            // =====================================================

            const string insertFriendsQuery = """
            INSERT INTO dbo.Friends
            (
                UserId,
                FriendUserId,
                CreatedAt
            )
            VALUES
            (
                @SenderId,
                @ReceiverId,
                GETUTCDATE()
            ),
            (
                @ReceiverId,
                @SenderId,
                GETUTCDATE()
            );
            """;

            await using (var friendCommand =
                new SqlCommand(
                    insertFriendsQuery,
                    connection,
                    (SqlTransaction)transaction))
            {
                friendCommand.Parameters.Add(
                    "@SenderId",
                    System.Data.SqlDbType.Int
                ).Value = senderId;

                friendCommand.Parameters.Add(
                    "@ReceiverId",
                    System.Data.SqlDbType.Int
                ).Value = receiverId;

                await friendCommand.ExecuteNonQueryAsync();
            }

            // =====================================================
            // İSTEĞİ ACCEPTED YAP
            // =====================================================

            const string updateRequestQuery = """
            UPDATE dbo.FriendRequests
            SET
                Status = N'Accepted',
                RespondedAt = GETUTCDATE()
            WHERE Id = @RequestId
              AND ReceiverId = @UserId
              AND Status = N'Pending';
            """;

            await using (var updateCommand =
                new SqlCommand(
                    updateRequestQuery,
                    connection,
                    (SqlTransaction)transaction))
            {
                updateCommand.Parameters.Add(
                    "@RequestId",
                    System.Data.SqlDbType.Int
                ).Value = requestId;

                updateCommand.Parameters.Add(
                    "@UserId",
                    System.Data.SqlDbType.Int
                ).Value = userId;

                await updateCommand.ExecuteNonQueryAsync();
            }

            // =====================================================
            // TRANSACTION TAMAMLA
            // =====================================================

            await transaction.CommitAsync();

            return ApiResponseModel.Ok(
                "Arkadaşlık isteği kabul edildi."
            );
        }
        catch
        {
            await transaction.RollbackAsync();

            return ApiResponseModel.Fail(
                "Arkadaşlık isteği kabul edilirken bir hata oluştu."
            );
        }
    }
}