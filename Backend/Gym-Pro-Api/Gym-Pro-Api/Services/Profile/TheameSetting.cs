using Apı.Helpers;
using Apı.Model;
using Microsoft.Data.SqlClient;

namespace Apı.Service;

public partial class ProfileService
{
    // =========================================================
    // TEMA DEĞERLERİ
    // Yalnızca "Dark" ve "Light" kabul edilir.
    // =========================================================
    public const string DefaultTheame = "Dark";

    private static readonly string[] AllowedThemes = { "Dark", "Light" };

    /// <summary>
    /// Gelen tema değerini doğrular ve kanonik biçime ("Dark" / "Light") çevirir.
    /// Geçersiz değerler için null döner.
    /// </summary>
    public static string? NormalizeTheame(string? theame)
    {
        if (string.IsNullOrWhiteSpace(theame))
        {
            return null;
        }

        var trimmed = theame.Trim();

        foreach (var allowed in AllowedThemes)
        {
            if (string.Equals(trimmed, allowed, StringComparison.OrdinalIgnoreCase))
            {
                return allowed;
            }
        }

        return null;
    }

    // =========================================================
    // TEMA KAYDI (POST /api/profile/theme)
    // =========================================================
    public async Task<ApiResponseModel> TheameSettings(TheameModel model)
    {
        var TheameCkek = EmptyspaceHelpers.Validate(model);
        if (TheameCkek != null)
            return ApiResponseModel.Fail(TheameCkek);

        // Geçersiz tema değerleri istek seviyesinde reddedilir.
        var normalized = NormalizeTheame(model.Theame);
        if (normalized == null)
        {
            return ApiResponseModel.Fail(
                "Geçersiz tema değeri. Yalnızca 'Dark' veya 'Light' seçilebilir.");
        }

        model.Theame = normalized;

        string query = """
        UPDATE dbo.UserThemeSettings
        SET Thema = @Thema
        WHERE UserId = @UserId;

        IF @@ROWCOUNT = 0
        BEGIN
            INSERT INTO dbo.UserThemeSettings (UserId, Thema)
            VALUES (@UserId, @Thema);
        END;
        """;
        try
        {
            await using var Connection = new SqlConnection(GetConnectionString());
            await using var command = new SqlCommand(query, Connection);
            command.Parameters.Add("@UserId", System.Data.SqlDbType.Int).Value = model.UserId;
            command.Parameters.Add("@Thema", System.Data.SqlDbType.NVarChar, 20).Value = model.Theame;
            await Connection.OpenAsync();
            await command.ExecuteNonQueryAsync();
            return ApiResponseModel.Ok(
                "Kayıt Başarılı. Yeni temanız",
                new { thema = model.Theame });
        }
        catch (SqlException)
        {
            return ApiResponseModel.Fail("Tema Ayarlarlanamadı tekrar deneyiniz");
        }
    }

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
