using Apı.Model;

namespace Apı.Service;

public partial class ProfileService
{
    private readonly IConfiguration _configuration;
    public ProfileService(IConfiguration configuration)
    {
        _configuration = configuration;
    }
    private string GetConnectionString()
    {
        return _configuration.GetConnectionString("DefaultConnection")
         ?? throw new InvalidCastException("DefaultConnection Bulunamadı Kontrol Edin");
    }
}