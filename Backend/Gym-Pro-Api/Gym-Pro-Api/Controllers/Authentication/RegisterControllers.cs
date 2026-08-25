using Apı.Service.Authentication;
using Microsoft.AspNetCore.Mvc;
using Apı.Model;
namespace Apı.Controller.Authentication;
[ApiController]
[Route("api/register")]
public class RegRegisterController :ControllerBase
{
    private readonly RegisterService _registerService;
    public RegRegisterController(RegisterService registerService)
    {
        _registerService=registerService;
    }
    [HttpPost]
    public async Task<IActionResult> Register([FromBody] RegisterModel model)
    {
        var result =await _registerService.RegisterAsync(model);
        if(!result.Success)
        {
            return BadRequest(result);
        }
        return Ok(result);
    }

}