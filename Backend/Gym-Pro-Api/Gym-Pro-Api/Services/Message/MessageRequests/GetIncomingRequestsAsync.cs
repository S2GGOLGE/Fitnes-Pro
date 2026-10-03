namespace Apı.Service;

using Apı.Dtos;
using Apı.Model;
using Microsoft.Data.SqlClient;

public partial class MessageRequestService : IMessageRequestService
{
    // =========================================================
    // GELEN MESAJ İSTEKLERİ
    // =========================================================
    public async Task<ApiResponseModel> GetIncomingRequestsAsync(int userId)
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

                Sender.Username AS SenderUsername,
                Sender.Name     AS SenderName,
                Sender.Surname  AS SenderSurname

            FROM MessageRequests MR

            INNER JOIN Users Sender
                ON Sender.Id = MR.SenderId

            WHERE MR.ReceiverId = @UserId
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

                SenderUsername = reader.GetString(
                    reader.GetOrdinal("SenderUsername")),

                // ReceiverUsername alıcı taraf listesinde
                // gerekmediği için boş bırakılıyor
                ReceiverUsername = string.Empty
            });
        }

        return ApiResponseModel.Ok(
            "Gelen mesaj istekleri başarıyla getirildi.",
            requests);
    }
}