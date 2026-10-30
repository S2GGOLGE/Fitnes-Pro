namespace Apı.Service;
using Apı.Model;
using Microsoft.Data.SqlClient;
public partial class ProfileService
{
    // =========================================================
    // TEMA OKUMA (GET /api/profile/theme)
    // Kullanıcı kaydı yoksa "Dark" varsayılanı döner.
    // =========================================================
    public async Task<ApiResponseModel> GetTheameSettings(int userId)
    {
        string query = """
        SELECT TOP 1 Thema
        FROM dbo.UserThemeSettings
        WHERE UserId = @UserId;
        """;

        try
        {
            await using var Connection = new SqlConnection(GetConnectionString());
            await using var command = new SqlCommand(query, Connection);
            command.Parameters.Add("@UserId", System.Data.SqlDbType.Int).Value = userId;
            await Connection.OpenAsync();

            var value = await command.ExecuteScalarAsync();
            var theme = NormalizeTheame(value as string) ?? DefaultTheame;

            return ApiResponseModel.Ok(
                "Tema bilgisi alındı.",
                new { thema = theme });
        }
        catch (SqlException)
        {
            return ApiResponseModel.Fail("Tema bilgisi alınamadı tekrar deneyiniz");
        }
    }
}