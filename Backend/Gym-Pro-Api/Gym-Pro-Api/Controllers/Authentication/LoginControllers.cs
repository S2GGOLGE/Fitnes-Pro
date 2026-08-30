using Microsoft.AspNetCore.Mvc;
using Apı.Model;
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
        public async Task<IActionResult> Login(
            [FromBody] LoginModels models)
        {
            // =========================================================
            // CLIENT IP
            // =========================================================

            var clientIp =
                HttpContext.Connection.RemoteIpAddress?.ToString()
                ?? "unknown";

            // =========================================================
            // LOGIN
            // =========================================================

            var result =
                await _loginService.LoginAsync(
                    models,
                    clientIp
                );

            // =========================================================
            // BAŞARISIZ
            // =========================================================

            if (!result.Success)
            {
                // Rate limit durumunu tespit et
                if (result.Message != null &&
                    result.Message.Contains(
                        "çok fazla",
                        StringComparison.OrdinalIgnoreCase))
                {
                    return StatusCode(
                        StatusCodes.Status429TooManyRequests,
                        result
                    );
                }

                return BadRequest(result);
            }

            // =========================================================
            // BAŞARILI
            // =========================================================

            return Ok(result);
        }
    }
}