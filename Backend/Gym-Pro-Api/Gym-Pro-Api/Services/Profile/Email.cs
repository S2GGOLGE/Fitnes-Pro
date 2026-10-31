using Apı.Model;
using Apı.Helpers;
using Microsoft.Data.SqlClient;
namespace Apı.Service;

public partial class ProfileService
{
    public async Task<ApiResponseModel> EmailUpdateAsync(UpdateEmailModel model)
    {
        var modelckeck = EmptyspaceHelpers.Validate(model);
        if (modelckeck != null)
            return ApiResponseModel.Fail(modelckeck);
        string sql = """
            IF EXISTS (
                SELECT 1
                FROM Users
                WHERE Email = @Email
                  AND Id <> @UserId
            )
            BEGIN
                SELECT
                    0 AS Success,
                    'Bu e-posta adresi zaten kullanılıyor.' AS Message;
            END
            ELSE
            BEGIN
                UPDATE Users
                SET Email = @Email
                WHERE Id = @UserId;

                IF @@ROWCOUNT > 0
                    SELECT
                        1 AS Success,
                        'E-posta adresi başarıyla güncellendi.' AS Message;
                ELSE
                    SELECT
                        0 AS Success,
                        'Kullanıcı bulunamadı.' AS Message;
            END;
            """;

        var connection = new SqlConnection(GetConnectionString());
        await connection.OpenAsync();
        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add("@UserId", System.Data.SqlDbType.Int).Value = model.UserId;
        command.Parameters.Add("@Email", System.Data.SqlDbType.NVarChar, 256).Value = model.Email;
        await using var reader = await command.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            bool succes = reader.GetInt32(0) == 1;
            string message = reader.GetString(1);
            if (!succes)
                return ApiResponseModel.Fail(message);
            return ApiResponseModel.Ok(message);
        }
        return ApiResponseModel.Fail("İşlem Sonucu Alınamadı");
    }
}