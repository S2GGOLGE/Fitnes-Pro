using Microsoft.Data.SqlClient;

namespace Apı.Service.Authentication;

public sealed record OnboardingStatus(
    bool Exists,
    bool LocationSet,
    bool EmailVerified)
{
    public bool IsComplete => Exists && LocationSet && EmailVerified;

    // Frontend yönlendirmesi için açık durum: "location" | "email" | "complete"
    public string NextStep =>
        !LocationSet ? "location"
        : !EmailVerified ? "email"
        : "complete";
}

/// <summary>
/// Kayıt sonrası adımların (konum kaydı, e-posta doğrulama) durumunu
/// veritabanından okur / günceller.
/// </summary>
public class OnboardingService
{
    private readonly IConfiguration _configuration;

    public OnboardingService(IConfiguration configuration)
    {
        _configuration = configuration
            ?? throw new ArgumentNullException(nameof(configuration));
    }

    private SqlConnection CreateConnection()
    {
        var connectionString =
            _configuration.GetConnectionString("DefaultConnection");

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "DefaultConnection bulunamadı.");
        }

        return new SqlConnection(connectionString);
    }

    public async Task<OnboardingStatus> GetStatusAsync(int userId)
    {
        const string sql = """
            SELECT
                u.EmailVerified,
                CASE WHEN EXISTS
                (
                    SELECT 1
                    FROM dbo.UserLocations l
                    WHERE l.UserId = u.Id
                )
                THEN 1 ELSE 0 END AS LocationSet
            FROM dbo.Users u
            WHERE u.Id = @UserId;
            """;

        await using var connection = CreateConnection();
        await connection.OpenAsync();

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add("@UserId", System.Data.SqlDbType.Int).Value = userId;

        await using var reader = await command.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
        {
            return new OnboardingStatus(false, false, false);
        }

        return new OnboardingStatus(
            true,
            reader.GetInt32(1) == 1,
            reader.GetBoolean(0));
    }

    public async Task MarkEmailVerifiedAsync(int userId)
    {
        const string sql = """
            UPDATE dbo.Users
            SET EmailVerified = 1
            WHERE Id = @UserId;
            """;

        await using var connection = CreateConnection();
        await connection.OpenAsync();

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add("@UserId", System.Data.SqlDbType.Int).Value = userId;

        await command.ExecuteNonQueryAsync();
    }
}
