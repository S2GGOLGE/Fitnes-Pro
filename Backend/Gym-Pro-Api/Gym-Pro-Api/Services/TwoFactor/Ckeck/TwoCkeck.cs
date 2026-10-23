using System.Security.Cryptography;
using System.Text;
using Apı.Model;
using Microsoft.Data.SqlClient;
namespace Apı.Service;

public sealed class TwoCodeCkeck
{
    private readonly int MaxFailedAttemps = 3;
    private readonly string _connectionStrin;
    public TwoCodeCkeck(IConfiguration configuration)
    {
        _connectionStrin = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("DefaultConnection Bulunamdı");
    }
    public async Task<CodeCheckResult> CodeCheck
        (int UserId, string code, CancellationToken cancellationToken = default)
    {
        if (UserId <= 0 || string.IsNullOrWhiteSpace(code) || code.Length != 6 || !code.All(char.IsAsciiDigit))
        {
            return CodeCheckResult.From(
                CodeCheckStatus.InvalidCode
            );
        }
        await using var connection = new SqlConnection(_connectionStrin);
        await connection.OpenAsync(cancellationToken);
        await using var transaction =
            (SqlTransaction)await connection.BeginTransactionAsync(
                cancellationToken);
        try
        {
            int recordId;
            string storedHash;
            DateTime expiresAt;
            int failedAttempts;
            bool isUsed;
            const string selectsql = """
            SELECT TOP (1)
            Id,
            CodeHash,
            ExpiresAt,
            FailedAttempts,
            IsUsed
            FROM dbo.TwoFactorCodes
            WITH (UPDLOCK, ROWLOCK)
            WHERE UserId = @UserId
            ORDER BY CreatedAt DESC, Id DESC;
            """;
            await using (var command = new SqlCommand(selectsql, connection, transaction))
            {
                command.Parameters.Add("@UserId", System.Data.SqlDbType.Int).Value = UserId;
                await using var reader = await command.ExecuteReaderAsync(cancellationToken);
                if (!await reader.ReadAsync(cancellationToken))
                {
                    await reader.CloseAsync();
                    await transaction.RollbackAsync(cancellationToken);
                    return CodeCheckResult.From(
                        CodeCheckStatus.AlreadyUsedOrNotFound
                    );
                }
                recordId = reader.GetInt32(0);
                storedHash = reader.GetString(1);
                expiresAt = reader.GetDateTime(2);
                failedAttempts = reader.GetInt32(3);
                isUsed = reader.GetBoolean(4);
            }
            if (isUsed)
            {
                await transaction.RollbackAsync(cancellationToken);
                return CodeCheckResult.From(CodeCheckStatus.AlreadyUsedOrNotFound);
            }
            if (failedAttempts >= MaxFailedAttemps)
            {
                await MarkUsedAsync(connection, transaction, recordId, cancellationToken);
                await transaction.CommitAsync(cancellationToken);
                return CodeCheckResult.From(CodeCheckStatus.TooManyAttempts);
            }
            if (expiresAt <= DateTime.UtcNow)
            {
                await MarkUsedAsync(connection, transaction, recordId, cancellationToken);
                await transaction.CommitAsync(cancellationToken);
                return CodeCheckResult.From(CodeCheckStatus.Expired);
            }
            string inputHash = GenerateHash(code);
            bool matches;
            try
            {
                byte[] storedBytes = Encoding.ASCII.GetBytes(storedHash);
                byte[] inputBytes = Encoding.ASCII.GetBytes(inputHash);
                matches = storedBytes.Length == inputBytes.Length
                && CryptographicOperations.FixedTimeEquals(storedBytes, inputBytes);
            }
            catch (ArgumentException)
            {
                matches = false;
            }
            if (!matches)
            {
                const string updateAttemptsSql = """
                UPDATE dbo.TwoFactorCodes
                    SET
                        FailedAttempts = FailedAttempts + 1,
                        IsUsed = CASE
                            WHEN FailedAttempts + 1 >= @MaxAttempts
                            THEN 1
                            ELSE IsUsed
                        END
                    WHERE Id = @Id
                """;
                await using var updateCommand = new SqlCommand(updateAttemptsSql, connection, transaction);
                updateCommand.Parameters.Add("@MaxAttempts",
                    System.Data.SqlDbType.Int).Value =
                    MaxFailedAttemps;

                updateCommand.Parameters.Add("@Id",
                    System.Data.SqlDbType.Int).Value = recordId;

                await updateCommand.ExecuteNonQueryAsync(
                    cancellationToken);

                await transaction.CommitAsync(cancellationToken);

                return CodeCheckResult.From(
                    failedAttempts + 1 >= MaxFailedAttemps
                        ? CodeCheckStatus.TooManyAttempts
                        : CodeCheckStatus.InvalidCode);
            }

            await MarkUsedAsync(
                connection, transaction, recordId,
                cancellationToken);

            await transaction.CommitAsync(cancellationToken);

            return CodeCheckResult.From(
                CodeCheckStatus.Success);
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }
    private static async Task MarkUsedAsync(
    SqlConnection connection,
    SqlTransaction transaction,
    int recordId,
    CancellationToken cancellationToken
    )
    {
        const string sql = """
        UPDATE dbo.TwoFactorCodes
            SET IsUsed = 1
            WHERE Id = @Id;
        """;
        await using var comamnd = new SqlCommand(sql, connection, transaction);
        comamnd.Parameters.Add("@Id", System.Data.SqlDbType.Int).Value = recordId;
        await comamnd.ExecuteNonQueryAsync(cancellationToken);
    }
    private static string GenerateHash(string value)
    {
        byte[] bytes = Encoding.UTF8.GetBytes(value);
        byte[] hash = SHA256.HashData(bytes);
        return Convert.ToHexString(hash);
    }
}