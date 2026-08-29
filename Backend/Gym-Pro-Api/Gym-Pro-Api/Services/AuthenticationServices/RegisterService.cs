using System.Globalization;
using Apı.Helpers;
using Apı.Model;
using Apı.Service;
using Microsoft.Data.SqlClient;

namespace Apı.Service.Authentication;

public class RegisterService
{
    private readonly string _connectionString;

    public RegisterService(string connectionService)
    {
        _connectionString = connectionService;
    }

    public async Task<ApiResponseModel> RegisterAsync(RegisterModel model)
    {
        // 1. Boş Alan Kontrolü
        var validationError = EmptyspaceHelpers.Validate(model);
        if (validationError != null)
        {
            return ApiResponseModel.Fail(validationError);
        }

        // 2. Şifre Eşleşme Kontrolü
        if (model.Password != model.PasswordRepeat)
        {
            return ApiResponseModel.Fail("Şifreler Eşleşmiyor Kontrol Edin");
        }

        // 3. Level Normalizasyon + Validasyon
        //    Sadece "Acemi", "Orta", "Uzman" kabul edilir.
        //    Trim + Türkçe case-insensitive normalize edilir.
        var normalizedLevel = NormalizeLevel(model.Level);
        if (normalizedLevel is null)
        {
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
            return ApiResponseModel.Ok("Kayıt Başarılı");
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
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