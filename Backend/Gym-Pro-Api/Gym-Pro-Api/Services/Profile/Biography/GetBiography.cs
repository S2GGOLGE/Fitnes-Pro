using Apı.Model;
using Microsoft.Data.SqlClient;

namespace Apı.Service;

public partial class ProfileService
{
    public async Task<ApiResponseModel> GetBiography(int userId)
    {
        try
        {
            string query = """
            SELECT Biography
            FROM dbo.UserBiographies
            WHERE UserId = @UserId;
            """;
            await using var Connection = new SqlConnection(GetConnectionString());
            await Connection.OpenAsync();
            await using var command = new SqlCommand(query, Connection);
            command.Parameters.Add("@UserId", System.Data.SqlDbType.Int).Value = userId;
            var result = await command.ExecuteScalarAsync();
            string biography = result?.ToString() ?? "";
            return ApiResponseModel.Ok("Biyografi alındı.", biography);
        }
        catch (Exception ex)
        {
            return ApiResponseModel.Fail("Biyografi alınırken hata oluştu: " + ex.Message);
        }
    }
}
