namespace Apı.Service;

using Microsoft.Data.SqlClient;
using Apı.Model;

public partial class FriendService
{
    // =========================================================
    // ARKADAŞ LİSTESİNİ GETİR
    // =========================================================

    public async Task<ApiResponseModel> GetFriendsAsync(int userId)
    {
        const string query = """
        SELECT
            f.UserId         AS UserId,
            f.FriendUserId   AS FriendUserId,
            u.Username       AS Username,
            u.Name           AS Name,
            u.Surname        AS Surname,
            f.CreatedAt      AS CreatedAt
        FROM dbo.Friends f
        INNER JOIN dbo.Users u
            ON u.Id = f.FriendUserId
        WHERE f.UserId = @UserId
        ORDER BY f.CreatedAt DESC;
        """;

        var friends = new List<FriendModel>();

        await using var connection =
            new SqlConnection(_connectionString);

        await connection.OpenAsync();

        await using var command =
            new SqlCommand(query, connection);

        command.Parameters.Add(
            "@UserId",
            System.Data.SqlDbType.Int
        ).Value = userId;

        await using var reader =
            await command.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            friends.Add(new FriendModel
            {
                UserId = reader.GetInt32(
                    reader.GetOrdinal("UserId")
                ),
                FriendUserId = reader.GetInt32(
                    reader.GetOrdinal("FriendUserId")
                ),
                Username = reader.GetString(
                    reader.GetOrdinal("Username")
                ),
                Name = reader.GetString(
                    reader.GetOrdinal("Name")
                ),
                Surname = reader.GetString(
                    reader.GetOrdinal("Surname")
                ),
                CreatedAt = reader.GetDateTime(
                    reader.GetOrdinal("CreatedAt")
                )
            });
        }

        return ApiResponseModel.Ok(
            "Arkadaş listesi başarıyla getirildi",
            friends
        );
    }
}
