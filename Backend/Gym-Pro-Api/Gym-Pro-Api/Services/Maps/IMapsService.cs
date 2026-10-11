using Apı.Model;

namespace Apı.Service;

public interface IMapService
{
    Task<ApiResponseModel> SaveLocationAsync(SaveLocationModel SaveModel);
    Task<ApiResponseModel> GetLocationAsync(GetLocationModel? GetModel = null);
}