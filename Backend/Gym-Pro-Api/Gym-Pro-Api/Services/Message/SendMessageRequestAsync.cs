namespace Apı.Service;

using Apı.Dtos;
using Microsoft.Data.SqlClient;
public partial class MessageRequestService:IMessageRequestService
{
    public async Task<(bool Success, string Message, int? RequestId)>
            SendMessageRequestAsync(
                int senderId,
                int receiverId)
    {
        // --------------------------------------------------------
        // KENDİNE İSTEK GÖNDERME
        // --------------------------------------------------------

        if (senderId == receiverId)
        {
            return (
                false,
                "Kendinize mesaj isteği gönderemezsiniz.",
                null
            );
        }

        await using var connection =
            new SqlConnection(GetConnectionString());

        await connection.OpenAsync();

        // --------------------------------------------------------
        // ALICI VAR MI?
        // --------------------------------------------------------

        const string userSql = """
                SELECT COUNT(1)
                FROM Users
                WHERE Id = @ReceiverId;
                """;

        await using (var userCommand =
            new SqlCommand(userSql, connection))
        {
            userCommand.Parameters.AddWithValue(
                "@ReceiverId",
                receiverId);

            var exists =
                Convert.ToInt32(
                    await userCommand.ExecuteScalarAsync());

            if (exists == 0)
            {
                return (
                    false,
                    "Mesaj isteği gönderilecek kullanıcı bulunamadı.",
                    null
                );
            }
        }

        // --------------------------------------------------------
        // ALICININ GİZLİLİK AYARI
        // --------------------------------------------------------

        string permission = "Everyone";

        const string privacySql = """
                SELECT MessageRequestPermission
                FROM UserPrivacySettings
                WHERE UserId = @ReceiverId;
                """;

        await using (var privacyCommand =
            new SqlCommand(privacySql, connection))
        {
            privacyCommand.Parameters.AddWithValue(
                "@ReceiverId",
                receiverId);

            var result =
                await privacyCommand.ExecuteScalarAsync();

            if (result != null)
                permission = result.ToString()!;
        }

        // --------------------------------------------------------
        // NOBODY
        // --------------------------------------------------------

        if (permission == "Nobody")
        {
            return (
                false,
                "Bu kullanıcı yeni mesaj isteği kabul etmiyor.",
                null
            );
        }

        // --------------------------------------------------------
        // FRIENDS ONLY
        // --------------------------------------------------------

        if (permission == "FriendsOnly")
        {
            const string friendSql = """
                    SELECT COUNT(1)
                    FROM Friends
                    WHERE UserId = @ReceiverId
                      AND FriendUserId = @SenderId;
                    """;

            await using var friendCommand =
                new SqlCommand(friendSql, connection);

            friendCommand.Parameters.AddWithValue(
                "@ReceiverId",
                receiverId);

            friendCommand.Parameters.AddWithValue(
                "@SenderId",
                senderId);

            var isFriend =
                Convert.ToInt32(
                    await friendCommand.ExecuteScalarAsync());

            if (isFriend == 0)
            {
                return (
                    false,
                    "Bu kullanıcı yalnızca arkadaşlarından mesaj isteği kabul ediyor.",
                    null
                );
            }
        }

        // --------------------------------------------------------
        // ZATEN BEKLEYEN İSTEK VAR MI?
        // --------------------------------------------------------

        const string pendingSql = """
                SELECT Id
                FROM MessageRequests
                WHERE SenderId = @SenderId
                  AND ReceiverId = @ReceiverId
                  AND Status = N'Pending';
                """;

        await using (var pendingCommand =
            new SqlCommand(pendingSql, connection))
        {
            pendingCommand.Parameters.AddWithValue(
                "@SenderId",
                senderId);

            pendingCommand.Parameters.AddWithValue(
                "@ReceiverId",
                receiverId);

            var existing =
                await pendingCommand.ExecuteScalarAsync();

            if (existing != null)
            {
                return (
                    false,
                    "Bu kullanıcıya zaten bekleyen bir mesaj isteğiniz var.",
                    Convert.ToInt32(existing)
                );
            }
        }

        // --------------------------------------------------------
        // MESAJ İSTEĞİNİ OLUŞTUR
        // --------------------------------------------------------

        const string insertSql = """
                INSERT INTO MessageRequests
                (
                    SenderId,
                    ReceiverId,
                    Status,
                    CreatedAt
                )
                OUTPUT INSERTED.Id
                VALUES
                (
                    @SenderId,
                    @ReceiverId,
                    N'Pending',
                    GETUTCDATE()
                );
                """;

        await using var insertCommand =
            new SqlCommand(insertSql, connection);

        insertCommand.Parameters.AddWithValue(
            "@SenderId",
            senderId);

        insertCommand.Parameters.AddWithValue(
            "@ReceiverId",
            receiverId);

        var requestId =
            Convert.ToInt32(
                await insertCommand.ExecuteScalarAsync());

        return (
            true,
            "Mesaj isteği başarıyla gönderildi.",
            requestId
        );
    }
}