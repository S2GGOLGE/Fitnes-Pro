using Apı.Model;
using Microsoft.Data.SqlClient;

namespace Apı.Service.Authentication;

/// <summary>
/// Kalıcı ban ve ban appeal verilerinin DB okuma/yazma işlemlerini yapar.
/// Microsoft.Data.SqlClient kullanır; EF Core kullanmaz (proje geneli raw SQL).
/// Singleton olarak kayıtlıdır: thread-safe metotlar birden fazla istek altında çalışır.
/// </summary>
public class BanStorageService
{
    private readonly string _connectionString;

    public BanStorageService(string connectionString)
    {
        _connectionString = connectionString
            ?? throw new ArgumentNullException(nameof(connectionString));
    }


    // =========================================================
    // BAN: KONTROL / YAZMA / SİLME
    // =========================================================

    public async Task<bool> IsBannedAsync(string username)
    {
        if (string.IsNullOrWhiteSpace(username))
        {
            return false;
        }

        const string sql = @"
            SELECT COUNT(*)
            FROM [dbo].[BannedUsers]
            WHERE [Username] = @Username;
        ";

        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(
            "@Username",
            System.Data.SqlDbType.NVarChar,
            100
        ).Value = username;

        var result = await command.ExecuteScalarAsync();
        return result is int count && count > 0;
    }

    public async Task InsertBanAsync(
        string username,
        string? reason = null)
    {
        if (string.IsNullOrWhiteSpace(username))
        {
            return;
        }

        const string sql = @"
            IF NOT EXISTS (
                SELECT 1 FROM [dbo].[BannedUsers] WHERE [Username] = @Username
            )
            BEGIN
                INSERT INTO [dbo].[BannedUsers] ([Username], [BannedAt], [Reason])
                VALUES (@Username, @BannedAt, @Reason);
            END
        ";

        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(
            "@Username",
            System.Data.SqlDbType.NVarChar,
            100
        ).Value = username;

        command.Parameters.Add(
            "@BannedAt",
            System.Data.SqlDbType.DateTime2
        ).Value = DateTime.UtcNow;

        command.Parameters.Add(
            "@Reason",
            System.Data.SqlDbType.NVarChar,
            255
        ).Value = (object?)reason ?? DBNull.Value;

        await command.ExecuteNonQueryAsync();
    }

    public async Task RemoveBanAsync(string username)
    {
        if (string.IsNullOrWhiteSpace(username))
        {
            return;
        }

        const string sql = @"
            DELETE FROM [dbo].[BannedUsers] WHERE [Username] = @Username;
        ";

        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(
            "@Username",
            System.Data.SqlDbType.NVarChar,
            100
        ).Value = username;

        await command.ExecuteNonQueryAsync();
    }

    /// <summary>
    /// Tüm kalıcı banlı kullanıcıları getirir. App startup'ta in-memory
    /// hydration için kullanılır.
    /// </summary>
    public async Task<List<BannedUserModel>> GetAllBannedAsync()
    {
        const string sql = @"
            SELECT [Username], [BannedAt], [Reason]
            FROM [dbo].[BannedUsers];
        ";

        var list = new List<BannedUserModel>();

        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new SqlCommand(sql, connection);

        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            list.Add(new BannedUserModel
            {
                Username = reader.GetString(0),
                BannedAt = reader.GetDateTime(1),
                Reason = reader.IsDBNull(2) ? null : reader.GetString(2)
            });
        }

        return list;
    }


    // =========================================================
    // APPEAL: KONTROL / YAZMA / LİSTELEME / KARAR
    // =========================================================

    /// <summary>
    /// Belirli bir kullanıcının toplam appeal sayısı (Pending+Approved+Rejected).
    /// Max 2 kuralı için kullanılır.
    /// </summary>
    public async Task<int> CountAppealsAsync(string username)
    {
        if (string.IsNullOrWhiteSpace(username))
        {
            return 0;
        }

        const string sql = @"
            SELECT COUNT(*)
            FROM [dbo].[BanAppeals]
            WHERE [Username] = @Username;
        ";

        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(
            "@Username",
            System.Data.SqlDbType.NVarChar,
            100
        ).Value = username;

        var result = await command.ExecuteScalarAsync();
        return result is int count ? count : 0;
    }

    /// <summary>
    /// Kullanıcının açık (henüz sonuçlanmamış) appeal'i var mı?
    /// </summary>
    public async Task<bool> HasPendingAppealAsync(string username)
    {
        if (string.IsNullOrWhiteSpace(username))
        {
            return false;
        }

        const string sql = @"
            SELECT COUNT(*)
            FROM [dbo].[BanAppeals]
            WHERE [Username] = @Username
              AND [Status] = @Status;
        ";

        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(
            "@Username",
            System.Data.SqlDbType.NVarChar,
            100
        ).Value = username;

        command.Parameters.Add(
            "@Status",
            System.Data.SqlDbType.NVarChar,
            20
        ).Value = BanAppealStatus.Pending;

        var result = await command.ExecuteScalarAsync();
        return result is int count && count > 0;
    }

    public async Task<int> InsertAppealAsync(
        string username,
        string message)
    {
        const string sql = @"
            INSERT INTO [dbo].[BanAppeals]
                ([Username], [Message], [Status], [CreatedAt])
            OUTPUT INSERTED.[Id]
            VALUES (@Username, @Message, @Status, @CreatedAt);
        ";

        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new SqlCommand(sql, connection);

        command.Parameters.Add(
            "@Username",
            System.Data.SqlDbType.NVarChar,
            100
        ).Value = username;

        command.Parameters.Add(
            "@Message",
            System.Data.SqlDbType.NVarChar,
            1000
        ).Value = message;

        command.Parameters.Add(
            "@Status",
            System.Data.SqlDbType.NVarChar,
            20
        ).Value = BanAppealStatus.Pending;

        command.Parameters.Add(
            "@CreatedAt",
            System.Data.SqlDbType.DateTime2
        ).Value = DateTime.UtcNow;

        var result = await command.ExecuteScalarAsync();
        return result is int id ? id : 0;
    }

    /// <summary>
    /// Admin için appeal listesi. status null ise tümü listelenir.
    /// </summary>
    public async Task<List<BanAppealModel>> GetAppealsAsync(string? status = null)
    {
        var sql = @"
            SELECT
                [Id], [Username], [Message], [Status],
                [CreatedAt], [DecidedAt], [DecidedBy], [AdminNote]
            FROM [dbo].[BanAppeals]
        ";

        if (!string.IsNullOrWhiteSpace(status))
        {
            sql += " WHERE [Status] = @Status ";
        }

        sql += " ORDER BY [CreatedAt] DESC;";

        var list = new List<BanAppealModel>();

        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new SqlCommand(sql, connection);

        if (!string.IsNullOrWhiteSpace(status))
        {
            command.Parameters.Add(
                "@Status",
                System.Data.SqlDbType.NVarChar,
                20
            ).Value = status;
        }

        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            list.Add(new BanAppealModel
            {
                Id = reader.GetInt32(0),
                Username = reader.GetString(1),
                Message = reader.GetString(2),
                Status = reader.GetString(3),
                CreatedAt = reader.GetDateTime(4),
                DecidedAt = reader.IsDBNull(5) ? null : reader.GetDateTime(5),
                DecidedBy = reader.IsDBNull(6) ? null : reader.GetString(6),
                AdminNote = reader.IsDBNull(7) ? null : reader.GetString(7)
            });
        }

        return list;
    }

    public async Task<BanAppealModel?> GetAppealAsync(int id)
    {
        const string sql = @"
            SELECT
                [Id], [Username], [Message], [Status],
                [CreatedAt], [DecidedAt], [DecidedBy], [AdminNote]
            FROM [dbo].[BanAppeals]
            WHERE [Id] = @Id;
        ";

        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(
            "@Id",
            System.Data.SqlDbType.Int
        ).Value = id;

        await using var reader = await command.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
        {
            return null;
        }

        return new BanAppealModel
        {
            Id = reader.GetInt32(0),
            Username = reader.GetString(1),
            Message = reader.GetString(2),
            Status = reader.GetString(3),
            CreatedAt = reader.GetDateTime(4),
            DecidedAt = reader.IsDBNull(5) ? null : reader.GetDateTime(5),
            DecidedBy = reader.IsDBNull(6) ? null : reader.GetString(6),
            AdminNote = reader.IsDBNull(7) ? null : reader.GetString(7)
        };
    }

    /// <summary>
    /// Admin onay/red kararını appeal'e yazar. Ban sadece Approved durumda kalkar
    /// (bu metodun çağıran taraf RemoveBanAsync'i ayrıca çağırır).
    /// </summary>
    public async Task<bool> DecideAppealAsync(
        int id,
        string status,
        string decidedBy,
        string? adminNote)
    {
        const string sql = @"
            UPDATE [dbo].[BanAppeals]
            SET
                [Status] = @Status,
                [DecidedAt] = @DecidedAt,
                [DecidedBy] = @DecidedBy,
                [AdminNote] = @AdminNote
            WHERE [Id] = @Id
              AND [Status] = @PendingStatus;
        ";

        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new SqlCommand(sql, connection);

        command.Parameters.Add(
            "@Id",
            System.Data.SqlDbType.Int
        ).Value = id;

        command.Parameters.Add(
            "@Status",
            System.Data.SqlDbType.NVarChar,
            20
        ).Value = status;

        command.Parameters.Add(
            "@DecidedAt",
            System.Data.SqlDbType.DateTime2
        ).Value = DateTime.UtcNow;

        command.Parameters.Add(
            "@DecidedBy",
            System.Data.SqlDbType.NVarChar,
            100
        ).Value = decidedBy;

        command.Parameters.Add(
            "@AdminNote",
            System.Data.SqlDbType.NVarChar,
            500
        ).Value = (object?)adminNote ?? DBNull.Value;

        command.Parameters.Add(
            "@PendingStatus",
            System.Data.SqlDbType.NVarChar,
            20
        ).Value = BanAppealStatus.Pending;

        var affected = await command.ExecuteNonQueryAsync();
        return affected > 0;
    }
}
