namespace Apı.Service;

using Apı.Model;
using Microsoft.Data.SqlClient;

public partial class FriendService
{
    private readonly string _connectionString;
    public FriendService(string connectionString)
    {
        _connectionString = connectionString;
    }
    // =========================================================
    // ARKADAŞLIK İSTEĞİ GÖNDER
    // =========================================================
    public async Task<ApiResponseModel> SendRequestAsync(int senderId, int receiverId)
    {
        // =========================================================
        // KENDİNE İSTEK GÖNDERME KONTROLÜ
        // =========================================================
        if (senderId == receiverId)
        {
            return ApiResponseModel.Fail(
                " Kendinize istek gonderemezsiniz"
            );
        }
        // =========================================================
        // DATABASE CONNECTION
        // =========================================================
        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync();
        // =========================================================
        // ALICI KULLANICI VAR MI?
        // =========================================================
        const string userQuery =
        """
        SELECT COUNT(*)
            FROM dbo.Users
            WHERE Id = @UserId;
        """;
        await using (var userCommand = new SqlCommand(userQuery, connection))
        {
            userCommand.Parameters.Add("@UserId", System.Data.SqlDbType.Int).Value = receiverId;
            var result = await userCommand.ExecuteScalarAsync();
            var userExist = result != null && Convert.ToInt32(result) > 0;
            if (!userExist)
            {
                return ApiResponseModel.Fail("Arkadaşlık isteği gondermek istediğiniz Kullanıcı bulunamadı");
            }
        }
        // =========================================================
        // ZATEN ARKADAŞ MI?
        // =========================================================
        const string friendQueryy =
        """
        SELECT COUNT(*)
            FROM dbo.Friends
            WHERE UserId = @UserId
              AND FriendUserId = @FriendUserId;
        """;
        await using (var friendCommand = new SqlCommand(friendQueryy, connection))
        {
            friendCommand.Parameters.Add("@UserId", System.Data.SqlDbType.Int).Value = senderId;
            friendCommand.Parameters.Add("@FriendUserId", System.Data.SqlDbType.Int).Value = receiverId;
            var result = await friendCommand.ExecuteScalarAsync();
            var alreadyFriend = result != null && Convert.ToInt32(result) > 0;
            if (alreadyFriend)
            {
                return ApiResponseModel.Fail("Bu Kullanıcı ile zaten arkadaşsınız");

            }
        }
        // =========================================================
        // BEKLEYEN ARKADAŞLIK İSTEĞİ VAR MI?
        //
        // Hem:
        // Sender   -> Receiver
        // Receiver -> Sender
        //
        // kontrol edilir.
        // =========================================================
        const string pendingQuery = """
                    SELECT COUNT(*)
            FROM dbo.FriendRequests
            WHERE
            (
                (
                    SenderId = @SenderId
                    AND ReceiverId = @ReceiverId
                )
                OR
                (
                    SenderId = @ReceiverId
                    AND ReceiverId = @SenderId
                )
            )
            AND Status = N'Pending';
        """;
        await using (var pendingCommand
         = new SqlCommand(pendingQuery, connection))
        {
            pendingCommand.Parameters.Add("@SenderId", System.Data.SqlDbType.Int).Value = senderId;
            pendingCommand.Parameters.Add("@ReceiverId", System.Data.SqlDbType.Int).Value = receiverId;
            var result = await pendingCommand.ExecuteScalarAsync();
            var pendingExists = result != null && Convert.ToInt32(result) > 0;
            if (pendingExists)
            {
                return ApiResponseModel.Fail("Bu kullanıcıyla zaten bekleyen bir arkadaşlık isteği bulunuyor ");

            }
        }
        // =========================================================
        // ARKADAŞLIK İSTEĞİNİ OLUŞTUR
        // =========================================================
        const string insertQuery = """
         INSERT INTO dbo.FriendRequests
            (
                SenderId,
                ReceiverId,
                Status,
                CreatedAt
            )
            VALUES
            (
                @SenderId,
                @ReceiverId,
                N'Pending',
                GETUTCDATE()
            );
        """;
        await using (var insertCommand = new SqlCommand(insertQuery, connection))
        {
            insertCommand.Parameters.Add("@SenderId", System.Data.SqlDbType.Int).Value = senderId;
            insertCommand.Parameters.Add("@ReceiverId", System.Data.SqlDbType.Int).Value = receiverId;
            await insertCommand.ExecuteNonQueryAsync();
        }
        return ApiResponseModel.Ok("Arkadaşlık isteği başarıyla gonderildi");
    }
}