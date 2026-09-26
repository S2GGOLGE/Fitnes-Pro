namespace Apı.Service;

using Apı.Model;
using Microsoft.Data.SqlClient;

public partial class FriendService
{
    // =========================================================
    // GÖNDERİLEN ARKADAŞLIK İSTEKLERİNİ GETİR
    // =========================================================
    public async Task<ApiResponseModel> GetOutgoingRequestsAsync(int userId)
    {
        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync();

        const string query = """
            SELECT
                fr.Id,
                fr.ReceiverId,
                u.Username AS ReceiverUsername,
                u.Name AS ReceiverName,
                u.Surname AS ReceiverSurname,
                fr.Status,
                fr.CreatedAt
            FROM dbo.FriendRequests fr
            INNER JOIN dbo.Users u
                ON u.Id = fr.ReceiverId
            WHERE fr.SenderId = @UserId
              AND fr.Status = N'Pending'
            ORDER BY fr.CreatedAt DESC;
            """;

        var requests = new List<object>();

        await using var command = new SqlCommand(query, connection);

        command.Parameters.Add(
            "@UserId",
            System.Data.SqlDbType.Int
        ).Value = userId;

        await using var reader = await command.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            requests.Add(new
            {
                Id = reader.GetInt32(
                    reader.GetOrdinal("Id")
                ),

                ReceiverId = reader.GetInt32(
                    reader.GetOrdinal("ReceiverId")
                ),

                ReceiverUsername =
                    reader["ReceiverUsername"]?.ToString() ?? "",

                ReceiverName =
                    reader["ReceiverName"]?.ToString() ?? "",

                ReceiverSurname =
                    reader["ReceiverSurname"]?.ToString() ?? "",

                Status =
                    reader["Status"]?.ToString() ?? "",

                CreatedAt =
                    reader["CreatedAt"]
            });
        }

        return ApiResponseModel.Ok(
            "Gönderilen arkadaşlık istekleri başarıyla getirildi",
            requests
        );
    }
}