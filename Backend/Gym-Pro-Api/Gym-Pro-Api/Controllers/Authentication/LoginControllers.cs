using Microsoft.AspNetCore.Mvc;
using Apı.Model;
using Apı.Helpers;
using Apı.Service;
using Apı.Service.Authentication;
namespace Apı.Controller
{
    [ApiController]
    [Route("api/login")]
    [Route("api/auth/login")]
    public class LoginControllers : ControllerBase
    {
        private readonly LoginService _loginService;
        public LoginControllers(LoginService loginService)
        {
            _loginService = loginService;

        }
        [HttpPost]
        public async Task<IActionResult> Login([FromBody] LoginModels models)
        {
            var result=await _loginService.LoginAsync(models);
            if(!result.Success)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }
    }
}