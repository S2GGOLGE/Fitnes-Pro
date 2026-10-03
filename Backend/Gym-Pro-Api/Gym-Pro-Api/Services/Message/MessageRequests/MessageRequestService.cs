using Microsoft.Data.SqlClient;
using Apı.Dtos;
namespace Apı.Service;

public partial class MessageRequestService:IMessageRequestService
{
    private readonly IConfiguration _configuration;
    public MessageRequestService(IConfiguration configuration)
    {
        _configuration = configuration;
    }
    private string GetConnectionString()
    {
        return _configuration.GetConnectionString("DefaultConnection")
        ?? throw new InvalidCastException("DefaultConnection Bulunamadı");
    }
}