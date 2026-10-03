namespace Apı.Service;

using Apı.Dtos;
using Apı.Model;
using Microsoft.Data.SqlClient;

public partial class MessageRequestService : IMessageRequestService
{
    // =========================================================
    // GÖNDERİLEN MESAJ İSTEKLERİ
    // =========================================================
    public async Task<ApiResponseModel> GetOutgoingRequestsAsync(int userId)
    {
        const string sql = """
            SELECT
                MR.Id,
                MR.SenderId,
                MR.ReceiverId,
                MR.Status,
                MR.CreatedAt,
                MR.RespondedAt,
                MR.ExpiresAt,

                Receiver.Username AS ReceiverUsername,
                Receiver.Name     AS ReceiverName,
                Receiver.Surname  AS ReceiverSurname

            FROM MessageRequests MR

            INNER JOIN Users Receiver
                ON Receiver.Id = MR.ReceiverId

            WHERE MR.SenderId = @UserId
              AND MR.Status = N'Pending'

            ORDER BY MR.CreatedAt DESC;
            """;

        var requests = new List<MessageRequestResponseDto>();

        await using var connection =
            new SqlConnection(GetConnectionString());

        await connection.OpenAsync();

        await using var command =
            new SqlCommand(sql, connection);

        command.Parameters.AddWithValue("@UserId", userId);

        await using var reader =
            await command.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            requests.Add(new MessageRequestResponseDto
            {
                Id = reader.GetInt32(
                    reader.GetOrdinal("Id")),
                SenderId = reader.GetInt32(
                    reader.GetOrdinal("SenderId")),
                ReceiverId = reader.GetInt32(
                    reader.GetOrdinal("ReceiverId")),
                Status = reader.GetString(
                    reader.GetOrdinal("Status")),
                CreatedAt = reader.GetDateTime(
                    reader.GetOrdinal("CreatedAt")),
                RespondedAt =
                    reader.IsDBNull(
                        reader.GetOrdinal("RespondedAt"))
                        ? null
                        : reader.GetDateTime(
                            reader.GetOrdinal("RespondedAt")),
                ExpiresAt =
                    reader.IsDBNull(
                        reader.GetOrdinal("ExpiresAt"))
                        ? null
                        : reader.GetDateTime(
                            reader.GetOrdinal("ExpiresAt")),

                // SenderUsername gönderen taraf listesinde
                // gerekmediği için boş bırakılıyor
                SenderUsername = string.Empty,

                ReceiverUsername = reader.GetString(
                    reader.GetOrdinal("ReceiverUsername"))
            });
        }

        return ApiResponseModel.Ok(
            "Gönderilen mesaj istekleri başarıyla getirildi.",
            requests);
    }
}