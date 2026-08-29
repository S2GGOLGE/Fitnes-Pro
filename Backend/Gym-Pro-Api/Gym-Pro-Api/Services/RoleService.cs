using Apı.Model;
using Microsoft.Data.SqlClient;

namespace Apı.Service;

public class RoleService
{
    private readonly string _connectionString;

    public RoleService(string connectionString)
    {
        _connectionString = connectionString
            ?? throw new ArgumentNullException(nameof(connectionString));
    }

    #region Rolleri Getir

    public async Task<List<string>> GetUserRolesAsync(int userId)
    {
        var roles = new List<string>();

        const string query = """
        SELECT RoleName
        FROM dbo.Roles
        WHERE UserId = @UserId
        ORDER BY Id
        """;

        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new SqlCommand(query, connection);

        command.Parameters.Add(
            "@UserId",
            System.Data.SqlDbType.Int
        ).Value = userId;

        await using var reader = await command.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            var role = reader["RoleName"]?.ToString();

            if (!string.IsNullOrWhiteSpace(role))
            {
                roles.Add(role.Trim());
            }
        }

        return roles;
    }

    #endregion
}