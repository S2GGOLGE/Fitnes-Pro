using Apı.Service;
using Apı.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace Apı.Controller;

[ApiController]
[Route("api/logs")]
[Authorize(Roles = "Admin")]
public class LogsController : ControllerBase
{
    private readonly ILogService _Logservice;
    public LogsController(ILogService logService)
    {
        _Logservice = logService;
    }
    [HttpGet]
    public async Task<IActionResult> GetAllLogs()
    {
        var result = await _Logservice.GetAllLogAsync();
        return Ok(new
        {
            succes = true,
            data = result,
            error = (object?)null
        });
    }
}
