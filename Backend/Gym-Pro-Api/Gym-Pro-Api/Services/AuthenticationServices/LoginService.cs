using Apı.Helpers;
using Apı.Model;
using Microsoft.Data.SqlClient;

namespace Apı.Service.Authentication;

public class LoginService
{
    private readonly string _connectionString;
    private readonly JwtService _jwtService;
    private readonly RoleService _roleService;
    private readonly LoginRateLimitingService _rateLimitService;
    private readonly BanStorageService _banStorageService;

    public LoginService(
        string connectionString,
        JwtService jwtService,
        RoleService roleService,
        LoginRateLimitingService rateLimitingService,
        BanStorageService banStorageService)
    {
        _connectionString =
            connectionString
            ?? throw new ArgumentNullException(nameof(connectionString));

        _jwtService =
            jwtService
            ?? throw new ArgumentNullException(nameof(jwtService));

        _roleService =
            roleService
            ?? throw new ArgumentNullException(nameof(roleService));

        _rateLimitService =
            rateLimitingService
            ?? throw new ArgumentNullException(nameof(rateLimitingService));

        _banStorageService =
            banStorageService
            ?? throw new ArgumentNullException(nameof(banStorageService));
    }

    // =========================================================
    // LOGIN
    // =========================================================

    public async Task<ApiResponseModel> LoginAsync(
        LoginModels models,
        string clientIp)
    {
        // =========================================================
        // VALIDATION
        // =========================================================

        var validationError =
            EmptyspaceHelpers.Validate(models);

        if (validationError != null)
        {
            return ApiResponseModel.Fail(validationError);
        }

        // =========================================================
        // KALICI BAN - DB KONTROLÜ (yeniden başlatma sonrası da aktif)
        // =========================================================

        if (await _banStorageService.IsBannedAsync(models.Username))
        {
            Console.WriteLine(
                $"[LOGIN] DB KALICI BAN RED | Username={models.Username}"
            );

            return ApiResponseModel.FailLocked(
                "Güvenlik nedeniyle erişiminiz kalıcı olarak bloke edilmiştir."
            );
        }

        // =========================================================
        // RATE LIMIT - KALICI BLOK (in-memory)
        // =========================================================

        if (_rateLimitService.IsPermanentlyLocked(clientIp))
        {
            return ApiResponseModel.FailLocked(
                "Güvenlik nedeniyle erişiminiz kalıcı olarak bloke edilmiştir."
            );
        }

        // =========================================================
        // RATE LIMIT - GEÇİCİ BLOK
        // =========================================================

        if (_rateLimitService.IsBlocked(
            clientIp,
            out var remaining))
        {
            var remainingSeconds =
                Math.Max(
                    1,
                    (int)Math.Ceiling(
                        remaining.TotalSeconds
                    )
                );

            var minutes =
                Math.Max(
                    1,
                    (int)Math.Ceiling(
                        remaining.TotalMinutes
                    )
                );

            return ApiResponseModel.FailRateLimited(
                $"Çok fazla başarısız giriş denemesi. " +
                $"{minutes} dakika sonra tekrar deneyiniz.",
                remainingSeconds
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
            return await RegisterFailedLogin(clientIp, models.Username);
        }

        // =========================================================
        // KULLANICI BİLGİLERİ
        // =========================================================

        var userId =
            reader.GetInt32(
                reader.GetOrdinal("Id")
            );

        var passwordHash =
            reader.GetString(
                reader.GetOrdinal("PasswordHash")
            );

        var salt =
            reader.GetString(
                reader.GetOrdinal("Salt")
            );

        // =========================================================
        // LEVEL
        // =========================================================

        var levelOrdinal =
            reader.GetOrdinal("Level");

        var level =
            reader.IsDBNull(levelOrdinal)
                ? "Acemi"
                : reader.GetString(levelOrdinal);

        if (string.IsNullOrWhiteSpace(level))
        {
            level = "Acemi";
        }

        // =========================================================
        // ŞİFRE KONTROLÜ
        // =========================================================

        var hashModel = new HashModel
        {
            Password = models.Password,
            Salt = salt
        };

        var generatedHash =
            HashService.Hash(hashModel);

        if (!string.Equals(
                generatedHash,
                passwordHash,
                StringComparison.Ordinal))
        {
            return await RegisterFailedLogin(clientIp, models.Username);
        }

        // =========================================================
        // BAŞARILI LOGIN
        // =========================================================

        _rateLimitService.Reset(clientIp);

        // =========================================================
        // ROLLER
        // =========================================================

        var roles =
            await _roleService.GetUserRolesAsync(userId);

        if (roles.Count == 0)
        {
            roles.Add("User");
        }

        var primaryRole =
            roles.FirstOrDefault() ?? "User";

        // =========================================================
        // JWT
        // =========================================================

        var token =
            _jwtService.CreateToken(
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
                token,
                userId,
                username = models.Username,
                role = primaryRole,
                level,
                roles
            }
        );
    }

    // =========================================================
    // BAŞARISIZ LOGIN MERKEZİ
    // =========================================================

    private async Task<ApiResponseModel> RegisterFailedLogin(
        string clientIp,
        string username)
    {
        var attempts =
            await _rateLimitService.RegisterFailedAttempt(clientIp, username);

        // =========================================================
        // 15 → KALICI BLOK
        // =========================================================

        if (attempts >= 15)
        {
            return ApiResponseModel.FailLocked(
                "Güvenlik nedeniyle erişiminiz kalıcı olarak bloke edilmiştir."
            );
        }

        // =========================================================
        // 10 → 10 DAKİKA
        // =========================================================

        if (attempts == 10)
        {
            return ApiResponseModel.FailRateLimited(
                "Çok fazla başarısız giriş denemesi. " +
                "Erişiminiz 10 dakika süreyle engellendi.",
                600
            );
        }

        // =========================================================
        // 5 → 5 DAKİKA
        // =========================================================

        if (attempts == 5)
        {
            return ApiResponseModel.FailRateLimited(
                "Çok fazla başarısız giriş denemesi. " +
                "Erişiminiz 5 dakika süreyle engellendi.",
                300
            );
        }

        // =========================================================
        // NORMAL HATA
        // =========================================================

        return ApiResponseModel.Fail(
            "Kullanıcı adı veya şifre yanlış."
        );
    }
}
