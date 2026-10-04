using Apı.Dtos;
using Apı.Model;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
namespace Apı.Service;

public partial class MessageService : IMessageService
{
    public async Task<ApiResponseModel> SendMessageAsync(int senderId, SendMessageDto dto)
    {
        if (senderId <= 0 || dto.ReceviverId <= 0)
            return ApiResponseModel.Fail("Geçersiz Kullanıcı");
        if (senderId == dto.ReceviverId)
            return ApiResponseModel.Fail("Kendinize Mesaj Gönderemezsiniz");
        if (string.IsNullOrWhiteSpace(dto.Content))
            return ApiResponseModel.Fail("Boş Mesaj Gonderemezsiniz");
        if (dto.Content.Length > 10000)
            return ApiResponseModel.Fail("Mesaj en fazla 10000 karekter olabilir");
        string messageType = dto.MessageType;
        if (messageType is not ("Text" or "Image" or "Fıle"))
            return ApiResponseModel.Fail("Geçersiz mesaj türü");
        await using var connection = new SqlConnection(GetConnectionString());
        await connection.OpenAsync();
        //Her iki kullanıcının da mevcut olduğunu doğrula.
        const string userssql = """
        SELECT COUNT (*)
        FROM dbo.Users
        WHERE Id IN (@SenderId,@ReceiverId)
        """;
        await using (var userCommand = new SqlCommand(userssql, connection))
        {
            userCommand.Parameters.AddWithValue("@SenderId", senderId);
            userCommand.Parameters.AddWithValue("@ReceiverId", dto.ReceviverId);
            int count = Convert.ToInt32(await userCommand.ExecuteScalarAsync());
            if (count != 2)
                return ApiResponseModel.Fail("Kullanıcı Bulunumadı");
        }
        // Mesaj yalnızca kabul edilmiş bir ilişki/istek varsa gönderilebilir.
        // Bu kontrol, mevcut FriendRequests şeman doğrulanınca kesinleştirilmeli.
        const string permissionSql = """
        SELECT CASE WHEN EXISTS
            (
                SELECT 1
                FROM dbo.FriendRequests
                WHERE
                    (
                        (SenderId = @SenderId AND ReceiverId = @ReceiverId)
                        OR
                        (SenderId = @ReceiverId AND ReceiverId = @SenderId)
                    )
                    AND Status = N'Accepted'
            )
            THEN 1 ELSE 0 END;
        """;
        await using (var permisonCommand = new SqlCommand(permissionSql, connection))
        {
            permisonCommand.Parameters.AddWithValue("@SenderId", senderId);
            permisonCommand.Parameters.AddWithValue("ReceiverId", dto.ReceviverId);
            object? permission =
            await permisonCommand.ExecuteScalarAsync();
            if (Convert.ToInt32(permission) != 1)
            {
                return ApiResponseModel.Fail(
                    "Mesaj göndermek için davet isteğin kabul edilmiş olması gerekir"
                );
            }
        }
        const string insertsql = """
        INSERT INTO dbo.Messages
                (SenderId, ReceiverId, Content, MessageType)
            OUTPUT INSERTED.Id, INSERTED.CreatedAt
            VALUES
                (@SenderId, @ReceiverId, @Content, @MessageType);
        """;
        await using var insertCommand =
        new SqlCommand(insertsql, connection);
        insertCommand.Parameters.AddWithValue("@SenderId", senderId);
        insertCommand.Parameters.AddWithValue("@ReceiverId", dto.ReceviverId);
        insertCommand.Parameters.AddWithValue("@Content", dto.Content);
        insertCommand.Parameters.AddWithValue("@MessageType", messageType);
        await using var reader = await insertCommand.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
            return ApiResponseModel.Fail("Mesaj Kaydedilemedi");
        var data = new
        {
            MessageId = reader.GetInt32(0),
            SenderId = senderId,
            ReceiverId = dto.ReceviverId,
            Content = dto.Content.Trim(),
            MessageType = messageType,
            CreatedAt = reader.GetDateTime(1)
        };
        return ApiResponseModel.Ok("Mesaj Gönderildi", data);
    }
}