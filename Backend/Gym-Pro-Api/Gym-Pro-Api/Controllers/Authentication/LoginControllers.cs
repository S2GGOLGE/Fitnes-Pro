using Apı.Model;
using Apı.Service.Authentication;
using Microsoft.AspNetCore.Mvc;

namespace Apı.Controller;

[ApiController]
[Route("api/login")]
[Route("api/auth/login")]
public class LoginControllers : ControllerBase
{
    private readonly LoginService _loginService;

    public LoginControllers(LoginService loginService)
    {
        _loginService =
            loginService
            ?? throw new ArgumentNullException(nameof(loginService));
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
            // Kalıcı veya rate-limit blok
            if (result.AccountLocked)
            {
                return StatusCode(
                    StatusCodes.Status429TooManyRequests,
                    result
                );
            }

            // Geçici rate-limit
            if (result.Message != null &&
                result.Message.Contains(
                    "Çok fazla",
                    StringComparison.OrdinalIgnoreCase))
            {
                return StatusCode(
                    StatusCodes.Status429TooManyRequests,
                    result
                );
            }

            // Normal login hatası
            return BadRequest(result);
        }

        // =========================================================
        // BAŞARILI
        // =========================================================

        return Ok(result);
    }
}