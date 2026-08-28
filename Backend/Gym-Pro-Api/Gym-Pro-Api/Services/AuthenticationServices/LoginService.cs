using Apı.Helpers;
using Apı.Model;
using Apı.Service;
using Microsoft.Data.SqlClient;

namespace Apı.Service.Authentication;

public class LoginService
{
    private readonly string _connectionString;
    private readonly JwtService _jwtService;

    public LoginService(string connectionString, JwtService jwtService)
    {
        _connectionString = connectionString;
        _jwtService = jwtService;
    }

    public async Task<ApiResponseModel> LoginAsync(LoginModels models)
    {
        var validationError = EmptyspaceHelpers.Validate(models);

        if (validationError != null)
        {
            return ApiResponseModel.Fail(validationError);
        }

        const string query = """
            SELECT
                u.Id,
                u.Username,
                u.PasswordHash,
                u.Salt,
                ISNULL(r.RoleName, 'User') AS Role
            FROM Users u
            LEFT JOIN Roles r ON r.UserId = u.Id
            WHERE u.Username = @Username
            """;

        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new SqlCommand(query, connection);
        command.Parameters.AddWithValue("@Username", models.Username);

        await using var reader = await command.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
        {
            return ApiResponseModel.Fail(
                "Kullanıcı Adı veya Şifre Yanlış Tekrar Deneyiniz"
            );
        }

        int userId = reader.GetInt32(
            reader.GetOrdinal("Id")
        );

        string passwordHash = reader.GetString(
            reader.GetOrdinal("PasswordHash")
        );

        string salt = reader.GetString(
            reader.GetOrdinal("Salt")
        );

        string storedRole = reader.GetString(
            reader.GetOrdinal("Role")
        );

        var hash = new HashModel
        {
            Password = models.Password,
            Salt = salt
        };

        var generatedHash = HashService.Hash(hash);

        if (generatedHash != passwordHash)
        {
            return ApiResponseModel.Fail(
                "Kullanıcı Adı veya Şifre Yanlış Tekrar Deneyiniz"
            );
        }

        var token = _jwtService.CreateToken(
            new JwtModel
            {
                UserId = userId,
                Username = models.Username,
                Role = storedRole
            }
        );

        return ApiResponseModel.Ok("Giriş Başarılı", new
        {
            token = token,
            userId = userId,
            username = models.Username,
            role = storedRole
        });
    }
}