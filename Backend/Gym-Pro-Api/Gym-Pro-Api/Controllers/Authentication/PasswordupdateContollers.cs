using Microsoft.AspNetCore.Mvc;
using Apı.Service;
using Apı.Model;
namespace Apı.Controller
{
    [ApiController]
    [Route("api/passupdate")]
    public class PasswordupdateContollers : ControllerBase
    {
        private readonly PasswordupdateService _passwordupdateService;
        public PasswordupdateContollers(PasswordupdateService passwordupdateService)
        {
            _passwordupdateService = passwordupdateService;
        }
        [HttpPost]
        public async Task<IActionResult> Update([FromBody] PasswordupdateModel model)
        {
            // Client IP
            var clientIp =
                HttpContext.Connection.RemoteIpAddress?.ToString();

            var result = await _passwordupdateService.UpdateAsync(model, clientIp);
            if (!result.Success)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }
    }
}