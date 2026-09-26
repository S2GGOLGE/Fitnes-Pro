namespace Apı.Service;

using Microsoft.Data.SqlClient;
using Apı.Model;
public partial class FriendService
{
    // =========================================================
    // ARKADAŞI SİL
    // =========================================================

    public async Task<ApiResponseModel> RemoveFriendAsync(
        int userId,
        int friendUserId)
    {
        if (userId == friendUserId)
        {
            return ApiResponseModel.Fail(
                "Kendinizi arkadaş listenizden silemezsiniz."
            );
        }

        await using var connection =
            new SqlConnection(_connectionString);

        await connection.OpenAsync();

        await using var transaction =
            await connection.BeginTransactionAsync();

        try
        {
            // =====================================================
            // ARKADAŞLIK VAR MI?
            // =====================================================

            const string checkQuery = """
            SELECT COUNT(*)
            FROM dbo.Friends
            WHERE UserId = @UserId
              AND FriendUserId = @FriendUserId;
            """;

            await using (var checkCommand =
                new SqlCommand(
                    checkQuery,
                    connection,
                    (SqlTransaction)transaction))
            {
                checkCommand.Parameters.Add(
                    "@UserId",
                    System.Data.SqlDbType.Int
                ).Value = userId;

                checkCommand.Parameters.Add(
                    "@FriendUserId",
                    System.Data.SqlDbType.Int
                ).Value = friendUserId;

                var result =
                    await checkCommand.ExecuteScalarAsync();

                var friendshipExists =
                    result != null &&
                    Convert.ToInt32(result) > 0;

                if (!friendshipExists)
                {
                    await transaction.RollbackAsync();

                    return ApiResponseModel.Fail(
                        "Bu kullanıcı arkadaş listenizde bulunmuyor."
                    );
                }
            }

            // =====================================================
            // İKİ YÖNLÜ ARKADAŞLIK KAYITLARINI SİL
            // =====================================================

            const string deleteQuery = """
            DELETE FROM dbo.Friends
            WHERE
            (
                UserId = @UserId
                AND FriendUserId = @FriendUserId
            )
            OR
            (
                UserId = @FriendUserId
                AND FriendUserId = @UserId
            );
            """;

            await using (var deleteCommand =
                new SqlCommand(
                    deleteQuery,
                    connection,
                    (SqlTransaction)transaction))
            {
                deleteCommand.Parameters.Add(
                    "@UserId",
                    System.Data.SqlDbType.Int
                ).Value = userId;

                deleteCommand.Parameters.Add(
                    "@FriendUserId",
                    System.Data.SqlDbType.Int
                ).Value = friendUserId;

                await deleteCommand.ExecuteNonQueryAsync();
            }

            // =====================================================
            // TRANSACTION TAMAMLA
            // =====================================================

            await transaction.CommitAsync();

            return ApiResponseModel.Ok(
                "Arkadaş başarıyla silindi."
            );
        }
        catch
        {
            await transaction.RollbackAsync();

            return ApiResponseModel.Fail(
                "Arkadaş silinirken bir hata oluştu."
            );
        }
    }
}