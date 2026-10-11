
using System.Data;
using Apı.Model;
using Apı.Helpers;
using Microsoft.Data.SqlClient;

namespace Apı.Service;

public partial class MapService
{
    public async Task<ApiResponseModel> SaveLocationAsync(
        SaveLocationModel SaveModel)
    {
        var validationError = EmptyspaceHelpers.Validate(SaveModel);
        if (validationError != null)
        {
            return ApiResponseModel.Fail(validationError);
        }

        // Koordinat kontrolü: Veritabanı constraint'i gereği ikisi de null veya ikisi de dolu olmalıdır.
        if (SaveModel.Latitude.HasValue != SaveModel.Longitude.HasValue)
        {
            SaveModel.Latitude = null;
            SaveModel.Longitude = null;
        }

        const string sql = """
            UPDATE dbo.UserLocations
            SET
                Country = @Country,
                Province = @Province,
                District = @District,
                Neighbourhood = @Neighbourhood,
                Address = @Address,
                Latitude = @Latitude,
                Longitude = @Longitude,
                UpdatedAt = SYSUTCDATETIME()
            WHERE UserId = @UserId;

            IF @@ROWCOUNT = 0
            BEGIN
                INSERT INTO dbo.UserLocations
                (
                    UserId,
                    Country,
                    Province,
                    District,
                    Neighbourhood,
                    Address,
                    Latitude,
                    Longitude
                )
                VALUES
                (
                    @UserId,
                    @Country,
                    @Province,
                    @District,
                    @Neighbourhood,
                    @Address,
                    @Latitude,
                    @Longitude
                );
            END;
            """;

        await using var connection = CreateConnetion();
        await connection.OpenAsync();

        await using var command = new SqlCommand(sql, connection);

        command.Parameters.Add("@UserId", SqlDbType.Int)
            .Value = SaveModel.UserId;

        command.Parameters.Add("@Country", SqlDbType.NVarChar, 100)
            .Value = (object?)SaveModel.Country ?? "Türkiye";

        command.Parameters.Add("@Province", SqlDbType.NVarChar, 100)
            .Value = (object?)SaveModel.Province ?? DBNull.Value;

        command.Parameters.Add("@District", SqlDbType.NVarChar, 100)
            .Value = (object?)SaveModel.District ?? DBNull.Value;

        command.Parameters.Add("@Neighbourhood", SqlDbType.NVarChar, 150)
            .Value = (object?)SaveModel.Neighbourhood ?? DBNull.Value;

        command.Parameters.Add("@Address", SqlDbType.NVarChar, 300)
            .Value = (object?)SaveModel.Address ?? DBNull.Value;

        command.Parameters.Add("@Latitude", SqlDbType.Float)
            .Value = (object?)SaveModel.Latitude ?? DBNull.Value;

        command.Parameters.Add("@Longitude", SqlDbType.Float)
            .Value = (object?)SaveModel.Longitude ?? DBNull.Value;

        await command.ExecuteNonQueryAsync();

        return ApiResponseModel.Ok("Konum başarıyla kaydedildi.");
    }
}
