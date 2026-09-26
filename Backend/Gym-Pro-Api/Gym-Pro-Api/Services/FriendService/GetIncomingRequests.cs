using Apı.Model;
using Microsoft.Data.SqlClient;

namespace Apı.Service;

public partial class FriendService
{
    public async Task<ApiResponseModel> GetIncomingRequestsAsync(int UserId)
    {
        const string query = """
             SELECT
            FR.Id,
            FR.SenderId,
            FR.ReceiverId,
            FR.Status,
            FR.CreatedAt,
            FR.RespondedAt,

            Sender.Username AS SenderUsername,
            Sender.Name AS SenderName,
            Sender.Surname AS SenderSurname,

            Receiver.Username AS ReceiverUsername,
            Receiver.Name AS ReceiverName,
            Receiver.Surname AS ReceiverSurname

        FROM dbo.FriendRequests FR

        INNER JOIN dbo.Users Sender
            ON Sender.Id = FR.SenderId

        INNER JOIN dbo.Users Receiver
            ON Receiver.Id = FR.ReceiverId

        WHERE FR.ReceiverId = @UserId
          AND FR.Status = N'Pending'

        ORDER BY FR.CreatedAt DESC
        """;
        var requests = new List<FriendRequestModel>();
        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync();
        await using var command = new SqlCommand(query, connection);
        command.Parameters.Add("@UserId",
        System.Data.SqlDbType.Int).Value = UserId;
        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            requests.Add(new FriendRequestModel
            {
                Id = reader.GetInt32(reader.GetOrdinal("Id")),
                SenderId = reader.GetInt32(reader.GetOrdinal("SenderId")),
                ReceiverId = reader.GetInt32(reader.GetOrdinal("ReceiverId")),
                Status = reader.GetString(reader.GetOrdinal("Status")),
                CreatedAt = reader.GetDateTime(reader.GetOrdinal("CreatedAt")),
                RespondedAt = reader.IsDBNull(reader.GetOrdinal("RespondedAt"))
                    ? null
                    : reader.GetDateTime(
                        reader.GetOrdinal("RespondedAt")
                    ),

                SenderUsername = reader.GetString(reader.GetOrdinal("SenderUsername")),

                SenderName = reader.GetString(reader.GetOrdinal("SenderName")),

                SenderSurname = reader.GetString(reader.GetOrdinal("SenderSurname")),

                ReceiverUsername = reader.GetString(reader.GetOrdinal("ReceiverUsername")),

                ReceiverName = reader.GetString(reader.GetOrdinal("ReceiverName")),

                ReceiverSurname = reader.GetString(reader.GetOrdinal("ReceiverSurname"))
            });
        }
        return ApiResponseModel.Ok("Gelen arkadaşlık istekleri başarıyla getirildi");
    }
}
