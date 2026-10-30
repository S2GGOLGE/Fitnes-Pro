namespace Apı.Service;

using System.Text.RegularExpressions;
using Apı.Helpers;
using Apı.Model;
using Microsoft.Data.SqlClient;
public partial class ProfileService
{
    public static int CountWords(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return 0;
        return Regex.Matches(text.Trim(), @"\S+").Count;
    }
    public async Task<ApiResponseModel> SaveBiographyAsync(BiographyModel model)
    {
        int wordCount = CountWords(model.Context);
        var modelckeck = EmptyspaceHelpers.Validate(model);
        if (modelckeck != null)
            return ApiResponseModel.Fail(modelckeck);
        if (wordCount > 100)
        {
            return ApiResponseModel.Fail("En fazla 100 kelime girebilirsiniz");
        }
        string query = """
        IF EXISTS (

        SELECT 1 FROM UserBiographies WHERE UserId = @UserId           )
        
        BEGIN UPDATE UserBiographies
        SET Biography = @Biography,

        UpdatedAt = SYSDATETIME()

        WHERE UserId = @UserId;
        
        END

        ELSE

        BEGIN

        INSERT INTO UserBiographies (UserId, Biography)

        VALUES (@UserId, @Biography);

        END 
    """;
        await using var connection = new SqlConnection(GetConnectionString());
        await connection.OpenAsync();
        await using var command = new SqlCommand(query, connection);
        command.Parameters.Add("@UserId", System.Data.SqlDbType.Int).Value = model.UserId;
        command.Parameters.Add("@Biography", System.Data.SqlDbType.NVarChar,1000).Value = model.Context;
        await command.ExecuteNonQueryAsync();
        return ApiResponseModel.Ok("Kayıt Başarılı");
    }
}