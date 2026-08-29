using System.Runtime.Intrinsics.Arm;
using Apı.Helpers;
using Apı.Model;
using Microsoft.Data.SqlClient;
namespace Apı.Service;

public class PasswordupdateService
{
    private readonly string _connectionString;
    public PasswordupdateService(string ConnectionString)
    {
        _connectionString = ConnectionString;
    }
    public async Task<ApiResponseModel> UpdateAsync(PasswordupdateModel model)
    {
        var validationError = EmptyspaceHelpers.Validate(model);
        if (validationError != null)
        {
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
            return ApiResponseModel.Fail("Şİfre Güncellenmedi");
        }
        return ApiResponseModel.Ok("Şifre Başarılı Şekilde Güncellendi");
    }
}