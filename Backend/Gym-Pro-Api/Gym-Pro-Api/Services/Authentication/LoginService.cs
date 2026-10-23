using Apı.Helpers;
using Apı.Model;
using Apı.Services;
using Microsoft.Data.SqlClient;

namespace Apı.Service.Authentication;

public class LoginService
{
    private readonly string _connectionString;
    private readonly JwtService _jwtService;
    private readonly RoleService _roleService;
    private readonly LoginRateLimitingService _rateLimitService;
    private readonly BanStorageService _banStorageService;
    private readonly ILogService _logService;
    private readonly OnboardingService _onboardingService;

    public LoginService(
        string connectionString,
        JwtService jwtService,
        RoleService roleService,
        LoginRateLimitingService rateLimitingService,
        BanStorageService banStorageService,
        ILogService logService,
        OnboardingService onboardingService)
    {
        _onboardingService =
            onboardingService
            ?? throw new ArgumentNullException(nameof(onboardingService));

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

        _logService =
            logService
            ?? throw new ArgumentNullException(nameof(logService));
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

            try
            {
                await _logService.LogUserAsync(
                    null,
                    models.Username,
                    "LoginFailed",
                    "Kullanıcı kalıcı olarak banlı (DB)",
                    clientIp
                );
            }
            catch
            {
                // Log hatası ana işlemi bozmamalı.
            }

            return ApiResponseModel.FailLocked(
                "Güvenlik nedeniyle erişiminiz kalıcı olarak bloke edilmiştir."
            );
        }

        // =========================================================
        // RATE LIMIT - KALICI BLOK (in-memory)
        // =========================================================

        if (_rateLimitService.IsPermanentlyLocked(clientIp))
        {
            try
            {
                await _logService.LogUserAsync(
                    null,
                    models.Username,
                    "LoginFailed",
                    "IP adresi kalıcı olarak bloklanmış (in-memory)",
                    clientIp
                );
            }
            catch
            {
                // Log hatası ana işlemi bozmamalı.
            }

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

            try
            {
                await _logService.LogUserAsync(
                    null,
                    models.Username,
                    "LoginFailed",
                    $"Geçici rate limit aktif ({minutes} dk kaldı)",
                    clientIp
                );
            }
            catch
            {
                // Log hatası ana işlemi bozmamalı.
            }

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
                Level,
                Email
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
        // EMAIL (JWT Email claim için)
        // =========================================================

        var emailOrdinal =
            reader.GetOrdinal("Email");

        var email =
            reader.IsDBNull(emailOrdinal)
                ? string.Empty
                : reader.GetString(emailOrdinal);

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
        // ONBOARDING DURUMU (backend kaynaklı)
        // 1) Konum kaydı yoksa        -> nextStep = "location"
        // 2) E-posta doğrulanmamışsa  -> nextStep = "email"
        // Bu durumlarda NORMAL JWT üretilmez; yalnızca konum kaydı ve
        // e-posta doğrulama endpoint'lerinde geçerli sınırlı token döner.
        // =========================================================

        var onboarding =
            await _onboardingService.GetStatusAsync(userId);

        if (!onboarding.IsComplete)
        {
            var onboardingToken =
                _jwtService.CreateOnboardingToken(
                    new JwtModel
                    {
                        UserId = userId,
                        Username = models.Username,
                        Email = email
                    }
                );

            try
            {
                await _logService.LogUserAsync(
                    userId,
                    models.Username,
                    "LoginOnboardingRequired",
                    $"Giriş için tamamlanmamış adım: {onboarding.NextStep}",
                    clientIp
                );
            }
            catch
            {
                // Log hatası ana işlemi bozmamalı.
            }

            return ApiResponseModel.Ok(
                "Giriş için kayıt adımlarının tamamlanması gerekiyor.",
                new
                {
                    onboardingRequired = true,
                    nextStep = onboarding.NextStep,
                    locationSet = onboarding.LocationSet,
                    emailVerified = onboarding.EmailVerified,
                    onboardingToken,
                    userId,
                    username = models.Username,
                    email,
                    level
                }
            );
        }

        return await IssueSessionAsync(
            userId,
            models.Username,
            email,
            level,
            clientIp
        );
    }

    // =========================================================
    // ONBOARDING SONRASI OTOMATİK GİRİŞ
    // Yalnızca backend'de konum kaydı VE e-posta doğrulaması
    // tamamlandıysa normal JWT üretir. Parola gerekmez; kimlik
    // sınırlı onboarding token'ından (userId) gelir.
    // =========================================================

    public async Task<ApiResponseModel> CompleteOnboardingLoginAsync(
        int userId,
        string clientIp)
    {
        const string query = """
            SELECT Username, Email, Level
            FROM dbo.Users
            WHERE Id = @UserId
            """;

        string username;
        string email;
        string level;

        await using (var connection = new SqlConnection(_connectionString))
        {
            await connection.OpenAsync();

            await using var command = new SqlCommand(query, connection);
            command.Parameters.Add("@UserId", System.Data.SqlDbType.Int).Value = userId;

            await using var reader = await command.ExecuteReaderAsync();

            if (!await reader.ReadAsync())
            {
                return ApiResponseModel.Fail("Kullanıcı bulunamadı.");
            }

            username = reader.GetString(0);
            email = reader.IsDBNull(1) ? string.Empty : reader.GetString(1);
            level = reader.IsDBNull(2) || string.IsNullOrWhiteSpace(reader.GetString(2))
                ? "Acemi"
                : reader.GetString(2);
        }

        if (await _banStorageService.IsBannedAsync(username))
        {
            return ApiResponseModel.FailLocked(
                "Güvenlik nedeniyle erişiminiz kalıcı olarak bloke edilmiştir."
            );
        }

        var onboarding = await _onboardingService.GetStatusAsync(userId);

        var isUzman = string.Equals(level, "Uzman", StringComparison.OrdinalIgnoreCase);
        if (isUzman && !onboarding.LocationSet)
        {
            return ApiResponseModel.Fail(
                "Konum kaydı tamamlanmadan giriş yapılamaz."
            );
        }

        if (!onboarding.EmailVerified)
        {
            return ApiResponseModel.Fail(
                "E-posta doğrulaması tamamlanmadan giriş yapılamaz."
            );
        }

        return await IssueSessionAsync(
            userId,
            username,
            email,
            level,
            clientIp
        );
    }

    // =========================================================
    // NORMAL OTURUM (JWT) ÜRETİMİ - ortak
    // =========================================================

    private async Task<ApiResponseModel> IssueSessionAsync(
        int userId,
        string username,
        string email,
        string level,
        string clientIp)
    {
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
                    Username = username,
                    Email = email,
                    Roles = roles
                }
            );

        // =========================================================
        // LOG: LOGIN SUCCESS
        // =========================================================

        try
        {
            await _logService.LogUserAsync(
                userId,
                username,
                "LoginSuccess",
                "Kullanıcı başarıyla giriş yaptı",
                clientIp
            );
        }
        catch
        {
            // Log hatası ana işlemi (login) bozmamalı.
        }

        // =========================================================
        // RESPONSE
        // =========================================================

        return ApiResponseModel.Ok(
            "Giriş Başarılı",
            new
            {
                token,
                userId,
                username,
                email,
                role = primaryRole,
                level,
                roles,
                emailVerified = true,
                onboardingRequired = false,
                nextStep = "complete"
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
            try
            {
                await _logService.LogUserAsync(
                    null,
                    username,
                    "PermanentBan",
                    "Kullanıcı kalıcı olarak banlandı",
                    clientIp
                );
            }
            catch
            {
                // Log hatası ana işlemi bozmamalı.
            }

            return ApiResponseModel.FailLocked(
                "Güvenlik nedeniyle erişiminiz kalıcı olarak bloke edilmiştir."
            );
        }

        // =========================================================
        // 10 → 10 DAKİKA
        // =========================================================

        if (attempts == 10)
        {
            try
            {
                await _logService.LogUserAsync(
                    null,
                    username,
                    "LoginFailed",
                    "Çok fazla başarısız giriş denemesi (10 dk blok)",
                    clientIp
                );
            }
            catch
            {
                // Log hatası ana işlemi bozmamalı.
            }

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
            try
            {
                await _logService.LogUserAsync(
                    null,
                    username,
                    "LoginFailed",
                    "Çok fazla başarısız giriş denemesi (5 dk blok)",
                    clientIp
                );
            }
            catch
            {
                // Log hatası ana işlemi bozmamalı.
            }

            return ApiResponseModel.FailRateLimited(
                "Çok fazla başarısız giriş denemesi. " +
                "Erişiminiz 5 dakika süreyle engellendi.",
                300
            );
        }

        // =========================================================
        // NORMAL HATA
        // =========================================================

        try
        {
            await _logService.LogUserAsync(
                null,
                username,
                "LoginFailed",
                "Kullanıcı adı veya şifre yanlış",
                clientIp
            );
        }
        catch
        {
            // Log hatası ana işlemi bozmamalı.
        }

        return ApiResponseModel.Fail(
            "Kullanıcı adı veya şifre yanlış."
        );
    }
}
