using Apı.Service;
using System.Security.Claims;
namespace Apı.Service;

public class AdminService : IAdminService
{
    private readonly IHttpContextAccessor __httpContextAccessor;
    public AdminService(IHttpContextAccessor httpContextAccessor)
    {
        __httpContextAccessor = httpContextAccessor;
    }
    public bool IsAdmin()
    {
        var role = __httpContextAccessor.HttpContext?
        .User
        .FindFirst(ClaimTypes.Role)?
        .Value;
        return string.Equals(
          role,
          "Admin",
          StringComparison.OrdinalIgnoreCase
        );
    }
}