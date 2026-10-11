namespace Apı.Service;

using System.Data;
using Apı.Model;
using Microsoft.Data.SqlClient;

public partial class MapService : IMapService
{
    public async Task<ApiResponseModel> GetLocationAsync(GetLocationModel? GetModel = null)
    {
        const string query = """
        SELECT 
            ul.UserId,
            ul.Latitude,
            ul.Longitude,
            u.Username,
            u.Name,
            u.Surname,
            ISNULL(u.Level, 'User') AS Role
        FROM dbo.UserLocations ul
        INNER JOIN dbo.Users u ON u.Id = ul.UserId
        WHERE ul.Latitude IS NOT NULL 
          AND ul.Longitude IS NOT NULL
          AND ul.Latitude BETWEEN -90.0 AND 90.0
          AND ul.Longitude BETWEEN -180.0 AND 180.0
          AND NOT (ul.Latitude = 0.0 AND ul.Longitude = 0.0)
          AND NOT EXISTS (
              SELECT 1 FROM dbo.BannedUsers b WHERE b.Username = u.Username
          )
          AND (@UserId = 0 OR ul.UserId = @UserId)
        """;

        var locations = new List<GetLocationModel>();

        await using var connection = CreateConnetion();
        await connection.OpenAsync();

        await using var command = new SqlCommand(query, connection);
        command.Parameters.Add("@UserId", SqlDbType.Int).Value = GetModel?.UserId ?? 0;

        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var userId = reader.GetInt32(reader.GetOrdinal("UserId"));
            var latitude = reader.GetDouble(reader.GetOrdinal("Latitude"));
            var longitude = reader.GetDouble(reader.GetOrdinal("Longitude"));

            var username = reader.IsDBNull(reader.GetOrdinal("Username"))
                ? $"user_{userId}"
                : reader.GetString(reader.GetOrdinal("Username"));

            var name = reader.IsDBNull(reader.GetOrdinal("Name"))
                ? string.Empty
                : reader.GetString(reader.GetOrdinal("Name"));

            var surname = reader.IsDBNull(reader.GetOrdinal("Surname"))
                ? string.Empty
                : reader.GetString(reader.GetOrdinal("Surname"));

            var fullName = $"{name} {surname}".Trim();
            if (string.IsNullOrWhiteSpace(fullName))
            {
                fullName = username;
            }

            var role = reader.IsDBNull(reader.GetOrdinal("Role"))
                ? "User"
                : reader.GetString(reader.GetOrdinal("Role"));

            locations.Add(new GetLocationModel
            {
                UserId = userId,
                Latitude = latitude,
                Longitude = longitude,
                Username = username,
                FullName = fullName,
                Role = role
            });
        }

        return ApiResponseModel.Ok("Konumlar başarıyla getirildi.", locations);
    }
}