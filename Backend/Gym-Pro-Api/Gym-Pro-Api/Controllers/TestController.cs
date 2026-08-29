using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Apı.Controllers;

[ApiController]
[Route("api/test")]
public class TestController : ControllerBase
{
    [HttpGet("auth")]
    [Authorize]
    public IActionResult AuthTest()
    {
        return Ok(new
        {
            message = "Giriş yapmış kullanıcı erişti."
        });
    }

    [HttpGet("admin")]
    [Authorize(Roles = "Admin")]
    public IActionResult AdminTest()
    {
        return Ok(new
        {
            message = "Admin erişimi başarılı."
        });
    }

    [HttpGet("coach")]
    [Authorize(Roles = "Coach")]
    public IActionResult CoachTest()
    {
        return Ok(new
        {
            message = "Coach erişimi başarılı."
        });
    }
}