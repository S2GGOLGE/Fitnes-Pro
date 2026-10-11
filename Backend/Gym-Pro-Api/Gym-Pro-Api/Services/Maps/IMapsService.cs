using Apı.Model;

namespace Apı.Service;

public interface IMapService
{
    Task<ApiResponseModel> SaveLocationAsync(MapsModel mapsModel);
}