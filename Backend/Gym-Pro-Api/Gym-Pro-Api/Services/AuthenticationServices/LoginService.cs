using Apı.Helpers;
using Apı.Model;
using Apı.Service;
using Microsoft.Data.SqlClient;

namespace Apı.Service.Authentication;

public class LoginService
{
    private readonly string _connectionString;
    private readonly JwtService _jwtService;
    private readonly RoleService _roleService;

    public LoginService(string connectionString, JwtService jwtService, RoleService roleService)
    {
        _connectionString = connectionString ?? throw new ArgumentException(nameof(connectionString));
        _jwtService = jwtService ?? throw new ArgumentException(nameof(jwtService));
        _roleService = roleService ?? throw new ArgumentException(nameof(roleService));
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
                Id,
                Username,
                PasswordHash,
                Salt
            FROM dbo.Users
            WHERE Username = @Username
        """;
        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync();
        await using var command = new SqlCommand(query, connection);
        command.Parameters.Add(
            "@Username",
            System.Data.SqlDbType.NVarChar, 100
        ).Value = models.Username;
        await using var reader = await command.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
        {
            return ApiResponseModel.Fail("Kullanıcı adı veya şifre Yanlış");
        }
        int UserId = reader.GetInt32(
            reader.GetOrdinal("Id")
        );
        string passwordHash = reader.GetString(
           reader.GetOrdinal("PasswordHash")
       );

        string salt = reader.GetString(
            reader.GetOrdinal("Salt")
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
        //Kullanıcı Rollerini Getir
        var roles = await _roleService.GetUserRolesAsync(UserId);
        // Kullanıcının hiç rolü yoksa varsayılan rol
        if (roles.Count == 0)
        {
            roles.Add("User");
        }
        // JWT TOKEN
        var token = _jwtService.CreateToken(
                   new JwtModel
                   {
                       UserId = UserId,
                       Username = models.Username,
                       Roles = roles
                   }
               );

        return ApiResponseModel.Ok(
            "Giriş Başarılı",
            new
            {
                token = token,
                userId = UserId,
                username = models.Username,
                roles = roles
            }
        );
    }
}