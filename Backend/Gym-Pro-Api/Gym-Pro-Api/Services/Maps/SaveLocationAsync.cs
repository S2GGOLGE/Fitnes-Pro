
using System.Data;
using Apı.Model;
using Apı.Helpers;
using Microsoft.Data.SqlClient;

namespace Apı.Service;

public partial class MapService
{
    public async Task<ApiResponseModel> SaveLocationAsync(
        MapsModel mapsModel)
    {
        if (mapsModel == null)
        {
            return ApiResponseModel.Fail("Konum verisi boş olamaz.");
        }

        if (string.IsNullOrWhiteSpace(mapsModel.Country))
        {
            mapsModel.Country = "Türkiye";
        }

        if (string.IsNullOrWhiteSpace(mapsModel.Province))
        {
            return ApiResponseModel.Fail("İl (Province) alanı boş bırakılamaz.");
        }

        if (string.IsNullOrWhiteSpace(mapsModel.District))
        {
            return ApiResponseModel.Fail("İlçe (District) alanı boş bırakılamaz.");
        }

        // Koordinat kontrolü: Veritabanı constraint'i gereği ikisi de null veya ikisi de dolu olmalıdır.
        if (mapsModel.Latitude.HasValue != mapsModel.Longitude.HasValue)
        {
            mapsModel.Latitude = null;
            mapsModel.Longitude = null;
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
            .Value = mapsModel.UserId;

        command.Parameters.Add("@Country", SqlDbType.NVarChar, 100)
            .Value = (object?)mapsModel.Country ?? "Türkiye";

        command.Parameters.Add("@Province", SqlDbType.NVarChar, 100)
            .Value = (object?)mapsModel.Province ?? DBNull.Value;

        command.Parameters.Add("@District", SqlDbType.NVarChar, 100)
            .Value = (object?)mapsModel.District ?? DBNull.Value;

        command.Parameters.Add("@Neighbourhood", SqlDbType.NVarChar, 150)
            .Value = (object?)mapsModel.Neighbourhood ?? DBNull.Value;

        command.Parameters.Add("@Address", SqlDbType.NVarChar, 300)
            .Value = (object?)mapsModel.Address ?? DBNull.Value;

        command.Parameters.Add("@Latitude", SqlDbType.Float)
            .Value = (object?)mapsModel.Latitude ?? DBNull.Value;

        command.Parameters.Add("@Longitude", SqlDbType.Float)
            .Value = (object?)mapsModel.Longitude ?? DBNull.Value;

        await command.ExecuteNonQueryAsync();

        return ApiResponseModel.Ok("Konum başarıyla kaydedildi.");
    }
}
