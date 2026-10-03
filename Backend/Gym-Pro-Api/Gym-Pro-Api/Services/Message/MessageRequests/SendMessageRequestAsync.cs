namespace Apı.Service;

using Apı.Dtos;
using Microsoft.Data.SqlClient;

public partial class MessageRequestService : IMessageRequestService
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
        // GÖNDEREN KULLANICI VAR MI?
        // --------------------------------------------------------
        const string senderExistsSql = """
                SELECT COUNT(1)
                FROM Users
                WHERE Id = @SenderId;
                """;

        await using (var senderCommand =
            new SqlCommand(senderExistsSql, connection))
        {
            senderCommand.Parameters.AddWithValue(
                "@SenderId",
                senderId);

            var senderExists =
                Convert.ToInt32(
                    await senderCommand.ExecuteScalarAsync());

            if (senderExists == 0)
            {
                return (
                    false,
                    "Gönderen kullanıcı bulunamadı.",
                    null
                );
            }
        }

        // --------------------------------------------------------
        // ALICI KULLANICI VAR MI?
        // --------------------------------------------------------
        const string receiverExistsSql = """
                SELECT COUNT(1)
                FROM Users
                WHERE Id = @ReceiverId;
                """;

        await using (var receiverCommand =
            new SqlCommand(receiverExistsSql, connection))
        {
            receiverCommand.Parameters.AddWithValue(
                "@ReceiverId",
                receiverId);

            var receiverExists =
                Convert.ToInt32(
                    await receiverCommand.ExecuteScalarAsync());

            if (receiverExists == 0)
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
        // BEKLEYEN İSTEK KONTROLÜ + OLUŞTURMA
        // Transaction + UPDLOCK/HOLDLOCK ile yarış koşulu engellenir.
        // DB tarafında UX_MessageRequests_Pending unique index'i
        // mevcut; 2627/2601 yakalama defansif tedbirdir.
        // --------------------------------------------------------
        await using var transaction =
            (SqlTransaction)await connection.BeginTransactionAsync(
                System.Data.IsolationLevel.ReadCommitted);

        try
        {
            const string pendingSql = """
                    SELECT Id
                    FROM MessageRequests
                    WITH (UPDLOCK, HOLDLOCK)
                    WHERE SenderId = @SenderId
                      AND ReceiverId = @ReceiverId
                      AND Status = N'Pending';
                    """;

            int? existingRequestId = null;

            await using (var pendingCommand =
                new SqlCommand(pendingSql, connection, transaction))
            {
                pendingCommand.Parameters.AddWithValue(
                    "@SenderId",
                    senderId);

                pendingCommand.Parameters.AddWithValue(
                    "@ReceiverId",
                    receiverId);

                var existing =
                    await pendingCommand.ExecuteScalarAsync();

                if (existing != null && existing != DBNull.Value)
                {
                    existingRequestId =
                        Convert.ToInt32(existing);
                }
            }

            if (existingRequestId.HasValue)
            {
                await transaction.RollbackAsync();

                return (
                    false,
                    "Bu kullanıcıya zaten bekleyen bir mesaj isteğiniz var.",
                    existingRequestId
                );
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
                new SqlCommand(
                    insertSql,
                    connection,
                    transaction);

            insertCommand.Parameters.AddWithValue(
                "@SenderId",
                senderId);

            insertCommand.Parameters.AddWithValue(
                "@ReceiverId",
                receiverId);

            var inserted =
                await insertCommand.ExecuteScalarAsync();

            var requestId =
                Convert.ToInt32(inserted);

            await transaction.CommitAsync();

            return (
                true,
                "Mesaj isteği başarıyla gönderildi.",
                requestId
            );
        }
        catch (SqlException ex)
            when (ex.Number == 2627 || ex.Number == 2601)
        {
            try
            {
                await transaction.RollbackAsync();
            }
            catch
            {
                // rollback hatası yutulur; asıl mesaj döner
            }

            return (
                false,
                "Bu kullanıcıya zaten bekleyen bir mesaj isteğiniz var.",
                null
            );
        }
        catch
        {
            try
            {
                await transaction.RollbackAsync();
            }
            catch
            {
                // yoksay
            }

            throw;
        }
    }
}