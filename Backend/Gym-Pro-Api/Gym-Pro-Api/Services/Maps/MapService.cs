using Apı.Model;
using Microsoft.Data.SqlClient;
namespace Apı.Service;

public partial class MapService : IMapService
{
    private readonly IConfiguration _configuration;
    public MapService(IConfiguration configuration)
    {
        _configuration = configuration;
    }
    private SqlConnection CreateConnetion()
    {
        var connectionString = _configuration.GetConnectionString("DefaultConnection");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException("Bağlantı Dizesi Bulunamadı");
        }
        return new SqlConnection(connectionString);
    }
    
}