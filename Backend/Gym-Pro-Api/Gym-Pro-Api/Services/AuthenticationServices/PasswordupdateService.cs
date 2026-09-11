using System.Runtime.Intrinsics.Arm;
using Apı.Helpers;
using Apı.Model;
using Apı.Services;
using Microsoft.Data.SqlClient;
namespace Apı.Service;

public class PasswordupdateService
{
    private readonly string _connectionString;
    private readonly ILogService _logService;

    public PasswordupdateService(string ConnectionString, ILogService logService)
    {
        _connectionString = ConnectionString;
        _logService = logService
            ?? throw new ArgumentNullException(nameof(logService));
    }
    public async Task<ApiResponseModel> UpdateAsync(
        PasswordupdateModel model,
        string? clientIp = null)
    {
        var validationError = EmptyspaceHelpers.Validate(model);
        if (validationError != null)
        {
            await SafeLogUserAsync(
                model?.Username,
                "PasswordUpdateFailed",
                $"Validasyon hatası: {validationError}",
                clientIp
            );
            return ApiResponseModel.Fail(validationError);
        }
        const string query = """
        SELECT PasswordHash,Salt
        FROM Users
        WHERE Username=@Username
        """;
        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync();
        await using var selectCommand = new SqlCommand(query, connection);
        selectCommand.Parameters.AddWithValue("@Username", model.Username);
        await using var reader = await selectCommand.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
        {
            await SafeLogUserAsync(
                model.Username,
                "PasswordUpdateFailed",
                "Kullanıcı bulunamadı",
                clientIp
            );
            return ApiResponseModel.Fail("Kullanıcı Bulunamadı");
        }
        string Hash = reader.GetString(
            reader.GetOrdinal("PasswordHash")
        );
        string salt = reader.GetString(
            reader.GetOrdinal("Salt")
        );
        //Eski Şifre Kontrol
        var OldPass = new HashModel
        {
            Password = model.OldPassword,
            Salt = salt
        };
        var OldHash = HashService.Hash(OldPass);
        if (OldHash != Hash)
        {
            await SafeLogUserAsync(
                model.Username,
                "PasswordUpdateFailed",
                "Mevcut şifre hatalı",
                clientIp
            );
            return ApiResponseModel.Fail("Şifreler Uyuşmuyor");
        }
        await reader.CloseAsync();
        //Yeni Salt Oluştur
        string newSalt = HashService.GenerateSalt();
        //Yeni Şifre Hashle
        var newHashModel = new HashModel
        {
            Password = model.Password,
            Salt = newSalt
        };
        string newPassword = HashService.Hash(newHashModel);
        // Şifreyi Username üzerinden güncelle
        const string updateQuery = """
            UPDATE Users
            SET PasswordHash = @PasswordHash,
                Salt = @Salt
            WHERE Username = @Username
            """;
        await using var UpdateCommand = new SqlCommand(updateQuery, connection);
        UpdateCommand.Parameters.AddWithValue(
            "@PasswordHash",
            newPassword
        );
        UpdateCommand.Parameters.AddWithValue(
             "@Salt",
             newSalt
         );

        UpdateCommand.Parameters.AddWithValue(
            "@Username",
            model.Username
        );
        int affectedRows = await UpdateCommand.ExecuteNonQueryAsync();
        if(affectedRows==0)
        {
            await SafeLogUserAsync(
                model.Username,
                "PasswordUpdateFailed",
                "Güncelleme 0 satır etkiledi",
                clientIp
            );
            return ApiResponseModel.Fail("Şİfre Güncellenmedi");
        }

        // =========================================================
        // LOG: PASSWORD UPDATE SUCCESS
        // =========================================================

        await SafeLogUserAsync(
            model.Username,
            "PasswordUpdateSuccess",
            "Şifre başarıyla güncellendi",
            clientIp
        );

        return ApiResponseModel.Ok("Şifre Başarılı Şekilde Güncellendi");
    }

    /// <summary>
    /// Log yazımı sırasında oluşan hatalar ana işlemi (şifre güncelleme) bozmamalı.
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
            // Yutulur: log hatası password update'i etkilemez.
        }
    }
}