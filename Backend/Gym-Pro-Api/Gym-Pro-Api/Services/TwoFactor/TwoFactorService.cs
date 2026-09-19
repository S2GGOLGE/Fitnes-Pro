using System.Security.Cryptography;
using System.Text;
using Microsoft.Data.SqlClient;

namespace Apı.Service;

public class TwoFactorService : ITwoFactorService
{
    private readonly IConfiguration _configuration;
    private readonly IEmailService _emailService;

    public TwoFactorService(
        IConfiguration configuration,
        IEmailService emailService)
    {
        _configuration = configuration;
        _emailService = emailService;
    }

    public async Task SendCodeAsync(int userId, string email)
    {
        string connectionString =
            _configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException(
                "DefaultConnection bulunamadı.");

        // 6 haneli güvenli kod
        string code = RandomNumberGenerator
            .GetInt32(100000, 1000000)
            .ToString();

        // SHA-256 hash
        string codeHash = ComputeHash(code);

        using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync();

        // Eski aktif kodları geçersiz yap
        const string invalidateSql = """
            UPDATE [dbo].[TwoFactorCodes]
            SET [IsUsed] = 1
            WHERE [UserId] = @UserId
              AND [IsUsed] = 0;
            """;

        using (var command = new SqlCommand(
            invalidateSql,
            connection))
        {
            command.Parameters.AddWithValue("@UserId", userId);

            await command.ExecuteNonQueryAsync();
        }

        // Yeni kodu kaydet
        const string insertSql = """
            INSERT INTO [dbo].[TwoFactorCodes]
            (
                [UserId],
                [CodeHash],
                [ExpiresAt],
                [FailedAttempts],
                [IsUsed],
                [CreatedAt]
            )
            VALUES
            (
                @UserId,
                @CodeHash,
                @ExpiresAt,
                0,
                0,
                GETUTCDATE()
            );
            """;

        using (var command = new SqlCommand(
            insertSql,
            connection))
        {
            command.Parameters.AddWithValue("@UserId", userId);
            command.Parameters.AddWithValue("@CodeHash", codeHash);
            command.Parameters.AddWithValue(
                "@ExpiresAt",
                DateTime.UtcNow.AddMinutes(5));

            await command.ExecuteNonQueryAsync();
        }

        // Mail HTML'i
        string emailBody = TwoFactorCode.Create(code);

        // Mail gönder
        await _emailService.SendEmailAsync(
            email,
            "Fitness Pro - Güvenlik Doğrulama Kodu",
            emailBody,
            true);
    }
    public async Task<bool> VerifyCodeAsync(int userId, string code)
    {
        if (string.IsNullOrWhiteSpace(code))
            return false;
        string connectionString = _configuration.GetConnectionString("DefaultConnection")
        ?? throw new InvalidOperationException("DefaultConnection Bulunamadı");
        using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync();
        const string sql = """
         SELECT TOP 1
                [Id],
                [CodeHash],
                [ExpiresAt],
                [FailedAttempts],
                [IsUsed]
            FROM [dbo].[TwoFactorCodes]
            WHERE [UserId] = @UserId
              AND [IsUsed] = 0
            ORDER BY [Id] DESC;
        """;
        int ıd;
        string storedHash;
        DateTime expiresAt;
        int failedAttempts;
        bool isUsed;
        using (var comand = new SqlCommand(sql, connection))
        {
            comand.Parameters.AddWithValue("@UserId", userId);
            using var reader = await comand.ExecuteReaderAsync();
            if (!await reader.ReadAsync())
                return false;
            ıd = reader.GetInt32(0);
            storedHash = reader.GetString(1);
            expiresAt = reader.GetDateTime(2);
            failedAttempts = reader.GetInt32(3);
            isUsed = reader.GetBoolean(4);
        }
        //Kullanılmış Kod
        if (isUsed)
            return false;
        if (expiresAt <= DateTime.UtcNow)
        {
            await MarkAsUsedAsync(connection, ıd);
            return false;
        }
        //Max Deneme
        if (failedAttempts >= 5)
        {
            await MarkAsUsedAsync(connection, ıd);
            return false;
        }
        //Girilen Kodu Hashle
        string enteredHash = ComputeHash(code);
        //Güvenli Karşılaştırma
        bool isvalid = FixedTimeEquals(storedHash, enteredHash);
        //Yanlış Kod
        if (!isvalid)
        {
            await IncreaseFailedAttemptsAsync(connection, ıd, failedAttempts);
            return false;
        }
        await MarkAsUsedAsync(connection, ıd);

        return true;
    }
    private static string ComputeHash(string value)
    {
        byte[] bytes = Encoding.UTF8.GetBytes(value);

        byte[] hash = SHA256.HashData(bytes);

        return Convert.ToHexString(hash);
    }
    private static bool FixedTimeEquals(
       string first,
       string second)
    {
        try
        {
            byte[] firstBytes =
                Convert.FromHexString(first);

            byte[] secondBytes =
                Convert.FromHexString(second);

            return CryptographicOperations.FixedTimeEquals(
                firstBytes,
                secondBytes);
        }
        catch
        {
            return false;
        }
    }

    private static async Task MarkAsUsedAsync(
        SqlConnection connection,
        int id)
    {
        const string sql = """
            UPDATE [dbo].[TwoFactorCodes]
            SET [IsUsed] = 1
            WHERE [Id] = @Id;
            """;

        using var command = new SqlCommand(
            sql,
            connection);

        command.Parameters.AddWithValue("@Id", id);

        await command.ExecuteNonQueryAsync();
    }

    private static async Task IncreaseFailedAttemptsAsync(
        SqlConnection connection,
        int id,
        int currentAttempts)
    {
        int newAttempts = currentAttempts + 1;

        const string sql = """
            UPDATE [dbo].[TwoFactorCodes]
            SET
                [FailedAttempts] = @FailedAttempts,
                [IsUsed] = CASE
                    WHEN @FailedAttempts >= 5 THEN 1
                    ELSE [IsUsed]
                END
            WHERE [Id] = @Id;
            """;

        using var command = new SqlCommand(
            sql,
            connection);

        command.Parameters.AddWithValue(
            "@Id",
            id);

        command.Parameters.AddWithValue(
            "@FailedAttempts",
            newAttempts);

        await command.ExecuteNonQueryAsync();
    }

}