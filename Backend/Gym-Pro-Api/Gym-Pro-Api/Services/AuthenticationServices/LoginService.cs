using Apı.Helpers;
using Apı.Model;
using Apı.Service;
using Microsoft.Data.SqlClient;

namespace Apı.Service.Authentication;

public class LoginService
{
    private readonly string _connectionString;

    public LoginService(string connectionString)
    {
        _connectionString = connectionString;
    }

    public async Task<ApiResponseModel> LoginAsync(LoginModels models)
    {
        var validationError = EmptyspaceHelpers.Validate(models);
        if (validationError != null)
        {
            return ApiResponseModel.Fail(validationError);
        }

        const string query = """
            SELECT Id, PasswordHash, Salt
            FROM Users
            WHERE Username = @Username
            """;

        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new SqlCommand(query, connection);
        command.Parameters.AddWithValue("@Username", models.Username);

        await using var reader = await command.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
        {
            return ApiResponseModel.Fail("Kullanıcı Adı veya Şifre Yanlış Tekrar Deneyiniz");
        }

        string passwordHash = reader.GetString(reader.GetOrdinal("PasswordHash"));
        string salt = reader.GetString(reader.GetOrdinal("Salt"));

        var hash = new HashModel
        {
            Password = models.Password,
            Salt = salt
        };

        var generatedHash = HashService.Hash(hash);
        if (generatedHash != passwordHash)
        {
            return ApiResponseModel.Fail("Kullanıcı Adı veya Şifre Yanlış Tekrar Deneyiniz");
        }

        return ApiResponseModel.Ok("Giriş Başarılı");
    }
}