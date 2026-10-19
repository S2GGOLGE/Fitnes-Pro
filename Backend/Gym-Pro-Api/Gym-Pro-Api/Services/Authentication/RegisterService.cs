using System.Globalization;
using Apı.Helpers;
using Apı.Model;
using Apı.Service;
using Apı.Services;
using Microsoft.Data.SqlClient;

namespace Apı.Service.Authentication;

public class RegisterService
{
    private readonly string _connectionString;
    private readonly ILogService _logService;
    private readonly JwtService _jwtService;
    private readonly IEmailService _EmailService;

    public RegisterService(
        string connectionService,
        ILogService logService,
        JwtService jwtService,
        IEmailService emailService)
    {
        _connectionString = connectionService;
        _logService = logService
            ?? throw new ArgumentNullException(nameof(logService));
        _jwtService = jwtService
            ?? throw new ArgumentNullException(nameof(jwtService));
        _EmailService = emailService ?? throw new ArgumentNullException(nameof(emailService));
    }

    public async Task<ApiResponseModel> RegisterAsync(
        RegisterModel model,
        string? clientIp = null)
    {
        // 1. Boş Alan Kontrolü
        var validationError = EmptyspaceHelpers.Validate(model);
        if (validationError != null)
        {
            await SafeLogUserAsync(
                model?.Username,
                "RegisterFailed",
                $"Validasyon hatası: {validationError}",
                clientIp
            );
            return ApiResponseModel.Fail(validationError);
        }

        // 2. Şifre Eşleşme Kontrolü
        if (model.Password != model.PasswordRepeat)
        {
            await SafeLogUserAsync(
                model.Username,
                "RegisterFailed",
                "Şifreler eşleşmiyor",
                clientIp
            );
            return ApiResponseModel.Fail("Şifreler Eşleşmiyor Kontrol Edin");
        }

        // 3. Level Normalizasyon + Validasyon
        //    Sadece "Acemi", "Orta", "Uzman" kabul edilir.
        //    Trim + Türkçe case-insensitive normalize edilir.
        var normalizedLevel = NormalizeLevel(model.Level);
        if (normalizedLevel is null)
        {
            await SafeLogUserAsync(
                model.Username,
                "RegisterFailed",
                "Geçersiz seviye",
                clientIp
            );
            return ApiResponseModel.Fail("Geçersiz seviye. Acemi, Orta veya Uzman seçiniz.");
        }
        model.Level = normalizedLevel;

        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync();

        // 4. Username ve Email Kontrolü
        const string checkUserQuery = "SELECT COUNT(1) FROM Users WHERE Username = @Username OR Email = @Email";
        await using (var checkCommand = new SqlCommand(checkUserQuery, connection))
        {
            checkCommand.Parameters.AddWithValue("@Username", model.Username);
            checkCommand.Parameters.AddWithValue("@Email", model.Email);
            var userExists = Convert.ToInt32(await checkCommand.ExecuteScalarAsync());
            if (userExists > 0)
            {
                await SafeLogUserAsync(
                    model.Username,
                    "RegisterFailed",
                    "Kullanıcı adı veya email zaten kayıtlı",
                    clientIp
                );
                return ApiResponseModel.Fail("Kullanıcı Adı Yada Email Dolu Başka bir ad deneyin");
            }
        }

        // 5. Password Hash ve Salt Üretimi (Plaintext password DB'ye yazılmaz)
        var salt = HashService.GenerateSalt();
        var hashModel = new HashModel
        {
            Password = model.Password,
            Salt = salt
        };
        var passwordHash = HashService.Hash(hashModel);

        // 6. Transaction ile Kullanıcı ve Rol Kaydı
        await using var transaction = (SqlTransaction)await connection.BeginTransactionAsync();

        try
        {
            // Kullanıcı Kaydı
            const string insertUserQuery = """
            INSERT INTO Users
            (
                Name,
                Surname,
                Username,
                Email,
                PasswordHash,
                Salt,
                Level,
                CreatedAt
            )
            OUTPUT INSERTED.Id
            VALUES
            (
                @Name,
                @Surname,
                @Username,
                @Email,
                @PasswordHash,
                @Salt,
                @Level,
                GETUTCDATE()
            )
            """;

            int userId;
            await using (var command = new SqlCommand(insertUserQuery, connection, transaction))
            {
                command.Parameters.AddWithValue("@Name", model.Name);
                command.Parameters.AddWithValue("@Surname", model.Surname);
                command.Parameters.AddWithValue("@Username", model.Username);
                command.Parameters.AddWithValue("@Email", model.Email);
                command.Parameters.AddWithValue("@PasswordHash", passwordHash);
                command.Parameters.AddWithValue("@Salt", salt);
                command.Parameters.AddWithValue("@Level", model.Level);

                userId = Convert.ToInt32(await command.ExecuteScalarAsync());
            }

            // Varsayılan User Rolünü Oluştur
            const string insertRoleQuery = """
            INSERT INTO Roles
            (
                UserId,
                RoleName
            )
            VALUES
            (
                @UserId,
                @RoleName
            )
            """;

            await using (var roleCommand = new SqlCommand(insertRoleQuery, connection, transaction))
            {
                roleCommand.Parameters.AddWithValue("@UserId", userId);
                roleCommand.Parameters.AddWithValue("@RoleName", "User");
                await roleCommand.ExecuteNonQueryAsync();
            }

            await transaction.CommitAsync();

            // =========================================================
            // LOG: REGISTER SUCCESS
            // =========================================================

            await SafeLogUserAsync(
                model.Username,
                "RegisterSuccess",
                "Kullanıcı başarıyla kayıt oldu",
                clientIp
            );

            // =========================================================
            // EMAIL: WELCOME TEMPLATE GÖNDERİMİ
            // =========================================================

            await SafeSendWelcomeEmailAsync(
                model.Email,
                model.Name,
                model.Username,
                clientIp
            );

            // Normal oturum DEĞİL: yalnızca konum kaydı ve e-posta doğrulama
            // adımlarında kullanılabilen sınırlı yetkili, kısa ömürlü token.
            var onboardingToken = _jwtService.CreateOnboardingToken(
                new JwtModel
                {
                    UserId = userId,
                    Username = model.Username,
                    Email = model.Email
                });

            return ApiResponseModel.Ok(
                "Kayıt Başarılı",
                new
                {
                    userId,
                    username = model.Username,
                    email = model.Email,
                    level = model.Level,
                    onboardingToken,
                    nextStep = "location"
                });
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    /// <summary>
    /// Hoş geldiniz e-postası gönderimi sırasında oluşan hatalar
    /// tamamlanmış kayıt işlemini (register) bozmamalı.
    /// </summary>
    private async Task SafeSendWelcomeEmailAsync(
        string email,
        string name,
        string username,
        string? clientIp)
    {
        try
        {
            var emailBody = WelcomeEmailTemplate.Generate(
                name,
                "http://localhost:8081"
            );

            await _EmailService.SendEmailAsync(
                email,
                "Fitness Pro'ya Hoş Geldiniz",
                emailBody,
                true
            );
        }
        catch (Exception ex)
        {
            await SafeLogUserAsync(
                username,
                "WelcomeEmailFailed",
                $"Hoş geldiniz e-postası gönderilemedi: {ex.Message}",
                clientIp
            );
        }
    }

    /// <summary>
    /// Log yazımı sırasında oluşan hatalar ana işlemi (register) bozmamalı.
    /// </summary>
    private async Task SafeLogUserAsync(
        string? username,
        string action,
        string message,
        string? clientIp)
    {
        try
        {
            await _logService.LogUserAsync(
                null,
                username,
                action,
                message,
                clientIp
            );
        }
        catch
        {
            // Yutulur: log hatası register'ı etkilemez.
        }
    }

    /// <summary>
    /// Kullanıcıdan gelen seviye değerini güvenli şekilde normalize eder.
    /// - Baştaki/sondaki boşlukları temizler.
    /// - Türkçe büyük/küçük harf farkını (I/ı, İ/i) dikkate alır.
    /// - Sadece üç standart değerden birine eşitse o standart değeri döner;
    ///   aksi durumda null (validasyon başarısız) döner.
    /// </summary>
    private static string? NormalizeLevel(string? input)
    {
        if (string.IsNullOrWhiteSpace(input))
        {
            return null;
        }

        var trimmed = input.Trim();
        var trCulture = CultureInfo.GetCultureInfo("tr-TR");
        var lower = trimmed.ToLower(trCulture);

        return lower switch
        {
            "acemi" => "Acemi",
            "orta" => "Orta",
            "uzman" => "Uzman",
            _ => null
        };
    }
}