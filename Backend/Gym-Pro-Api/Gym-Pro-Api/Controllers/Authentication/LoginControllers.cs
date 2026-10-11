using System.Security.Claims;
using Apı.Model;
using Apı.Service;
using Apı.Service.Authentication;
using Microsoft.AspNetCore.Authorization;
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

    // =========================================================
    // ONBOARDING SONRASI OTOMATİK GİRİŞ
    // Sadece onboarding token'ı ile çağrılır (normal Bearer reddedilir).
    // Konum kaydı ve e-posta doğrulaması backend'de tamamlanmadıysa
    // normal JWT üretilmez.
    // =========================================================

    [HttpPost("complete-onboarding")]
    [Authorize(AuthenticationSchemes = JwtService.OnboardingScheme)]
    public async Task<IActionResult> CompleteOnboarding()
    {
        var userIdValue =
            User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");

        var scope = User.FindFirstValue(JwtService.OnboardingScopeClaim);

        if (!int.TryParse(userIdValue, out var userId) ||
            scope != JwtService.OnboardingScopeValue)
        {
            return Unauthorized(
                ApiResponseModel.Fail("Kullanıcı kimliği doğrulanamadı.")
            );
        }

        var clientIp =
            HttpContext.Connection.RemoteIpAddress?.ToString()
            ?? "unknown";

        var result =
            await _loginService.CompleteOnboardingLoginAsync(
                userId,
                clientIp
            );

        if (!result.Success)
        {
            return result.AccountLocked
                ? StatusCode(StatusCodes.Status403Forbidden, result)
                : BadRequest(result);
        }

        return Ok(result);
    }
}