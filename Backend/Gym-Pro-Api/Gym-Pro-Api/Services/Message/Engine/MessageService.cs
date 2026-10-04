using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Apı.Dtos;
using Apı.Model;
namespace Apı.Service;

public partial class MessageService : IMessageService
{
    private readonly IConfiguration _configration;
    public MessageService(IConfiguration configuration)
    {
        _configration = configuration;
    }
    private string GetConnectionString()
    {
        return _configration.GetConnectionString("DefaultConnection")
        ?? throw new InvalidOperationException("DefaultConnection Bulunumadı Kontrol ediniz");
    }
}