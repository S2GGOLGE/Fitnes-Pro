using System.Threading.RateLimiting;
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
    private readonly LoginRateLimitingService __rateLimitService;

    public LoginService(string connectionString, JwtService jwtService, RoleService roleService, LoginRateLimitingService rateLimitingService)
    {
        _connectionString = connectionString ?? throw new ArgumentException(nameof(connectionString));
        _jwtService = jwtService ?? throw new ArgumentException(nameof(jwtService));
        _roleService = roleService ?? throw new ArgumentException(nameof(roleService));
        __rateLimitService = rateLimitingService ?? throw new ArgumentException(nameof(rateLimitingService));

    }
    public async Task<ApiResponseModel> LoginAsync(
        LoginModels models,
        string clientIp)
    {
        // =========================================================
        // VALIDATION
        // =========================================================

        var validationError = EmptyspaceHelpers.Validate(models);

        if (validationError != null)
        {
            return ApiResponseModel.Fail(validationError);
        }

        // =========================================================
        // RATE LIMIT KONTROLÜ
        // 5 başarısız denemeden sonra 5 dakika blok
        // =========================================================

        if (__rateLimitService.IsBlocked(
            clientIp,
            out var remaining))
        {
            var minutes = Math.Ceiling(
                remaining.TotalMinutes
            );

            return ApiResponseModel.Fail(
                $"Çok fazla başarısız giriş denemesi. " +
                $"{minutes} dakika sonra tekrar deneyiniz."
            );
        }

        // =========================================================
        // KULLANICIYI GETİR
        // =========================================================

        const string query = """
        SELECT
            Id,
            Username,
            PasswordHash,
            Salt,
            Level
        FROM dbo.Users
        WHERE Username = @Username
        """;

        await using var connection =
            new SqlConnection(_connectionString);

        await connection.OpenAsync();

        await using var command =
            new SqlCommand(query, connection);

        command.Parameters.Add(
            "@Username",
            System.Data.SqlDbType.NVarChar,
            100
        ).Value = models.Username;

        await using var reader =
            await command.ExecuteReaderAsync();

        // =========================================================
        // KULLANICI BULUNAMADI
        // =========================================================

        if (!await reader.ReadAsync())
        {
            var attempts =
                __rateLimitService.RegisterFailedAttempt(clientIp);

            if (attempts >= 5)
            {
                return ApiResponseModel.Fail(
                    "Çok fazla başarısız giriş denemesi. " +
                    "Hesabınıza erişim 5 dakika süreyle engellendi."
                );
            }

            return ApiResponseModel.Fail(
                "Kullanıcı adı veya şifre yanlış."
            );
        }

        // =========================================================
        // KULLANICI BİLGİLERİ
        // =========================================================

        int userId = reader.GetInt32(
            reader.GetOrdinal("Id")
        );

        string passwordHash = reader.GetString(
            reader.GetOrdinal("PasswordHash")
        );

        string salt = reader.GetString(
            reader.GetOrdinal("Salt")
        );

        // =========================================================
        // LEVEL
        // =========================================================

        var levelOrdinal =
            reader.GetOrdinal("Level");

        string level = reader.IsDBNull(levelOrdinal)
            ? "Acemi"
            : reader.GetString(levelOrdinal);

        if (string.IsNullOrWhiteSpace(level))
        {
            level = "Acemi";
        }

        // =========================================================
        // ŞİFRE KONTROLÜ
        // =========================================================

        var hash = new HashModel
        {
            Password = models.Password,
            Salt = salt
        };

        var generatedHash =
            HashService.Hash(hash);

        if (generatedHash != passwordHash)
        {
            var attempts =
                __rateLimitService.RegisterFailedAttempt(clientIp);

            if (attempts >= 5)
            {
                return ApiResponseModel.Fail(
                    "Çok fazla başarısız giriş denemesi. " +
                    "Hesabınıza erişim 5 dakika süreyle engellendi."
                );
            }

            return ApiResponseModel.Fail(
                "Kullanıcı adı veya şifre yanlış."
            );
        }

        // =========================================================
        // BAŞARILI GİRİŞ
        // =========================================================

        __rateLimitService.reset(clientIp);

        // =========================================================
        // KULLANICI ROLLERİNİ GETİR
        // =========================================================

        var roles =
            await _roleService.GetUserRolesAsync(userId);

        // Kullanıcının rolü yoksa User
        if (roles.Count == 0)
        {
            roles.Add("User");
        }

        // Birincil rol
        var primaryRole =
            roles.FirstOrDefault() ?? "User";

        // =========================================================
        // JWT TOKEN
        // =========================================================

        var token = _jwtService.CreateToken(
            new JwtModel
            {
                UserId = userId,
                Username = models.Username,
                Roles = roles
            }
        );

        // =========================================================
        // RESPONSE
        // =========================================================

        return ApiResponseModel.Ok(
            "Giriş Başarılı",
            new
            {
                token = token,
                userId = userId,
                username = models.Username,
                role = primaryRole,
                level = level,
                roles = roles
            }
        );
    }

}