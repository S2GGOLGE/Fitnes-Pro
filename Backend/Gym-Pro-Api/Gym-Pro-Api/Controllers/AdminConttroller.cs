using Apı.Service;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace Apı.Controller;

[ApiController]
[Route("api/admin")]
[Authorize]
public class AdminController : ControllerBase
{
    private readonly IAdminService _adminservice;
    public AdminController(IAdminService adminService)
    {
        _adminservice = adminService;
    }
    [HttpGet("access")]
    public IActionResult CheckedAdminAccess()
    {
        var isAdmin = _adminservice.IsAdmin();
        return Ok(new
        {
            succes = true,
            data = new
            { isAdmin },
            error = (object?)null
        });
    }
}