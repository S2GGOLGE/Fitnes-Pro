using Apı.Model;
using Apı.Dtos;
using Microsoft.Data.SqlClient;
namespace Apı.Service;

public partial class MessageRequestService : IMessageRequestService
{
    public async Task<ApiResponseModel> GetAcceptedContactAsync(int userId)
    {
        var contacts = new List<AcceptedMessageContactDto>();
        const string query = """
                SELECT
            mr.Id AS RequestId,
            CASE
                WHEN mr.SenderId = @UserId THEN mr.ReceiverId
                ELSE mr.SenderId
            END AS UserId,
            u.Username
        FROM MessageRequests mr
        INNER JOIN Users u
            ON u.Id = CASE
                WHEN mr.SenderId = @UserId THEN mr.ReceiverId
                ELSE mr.SenderId
            END
        WHERE
            (mr.SenderId = @UserId OR mr.ReceiverId = @UserId)
            AND mr.Status = 'Accepted';
        """;
        await using var connection = new SqlConnection(GetConnectionString());
        await connection.OpenAsync();
        await using var command = new SqlCommand(query, connection);
        command.Parameters.AddWithValue("@UserId", userId);
        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            contacts.Add(new AcceptedMessageContactDto
            {
                RequestId = reader.GetInt32(0),
                UserId = reader.GetInt32(1),
                UserName = reader.GetString(2)
            });
        }
        return ApiResponseModel.Ok("Kabul edilen mesaj istekleri başarıyla getirildi.", contacts);
    }
}