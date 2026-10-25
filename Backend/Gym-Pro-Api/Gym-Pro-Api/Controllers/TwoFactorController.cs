using Apı.Service;
using Apı.Service.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Apı.Controllers;

[ApiController]
[Route("api/two-factor")]
public class TwoFactorController : ControllerBase
{
    private readonly ITwoFactorService _twoFactorService;
    private readonly ITwoFactorSettingsService _settingsService;
    private readonly OnboardingService _onboardingService;

    // Kayıt sonrası e-posta doğrulama adımı sınırlı yetkili onboarding token'ı
    // ile de çağrılabilir; diğer 2FA işlemleri yalnızca normal oturum içindir.
    private const string EmailVerificationSchemes =
        "Bearer," + JwtService.OnboardingScheme;

    public TwoFactorController(
        ITwoFactorService twoFactorService,
        ITwoFactorSettingsService settingsService,
        OnboardingService onboardingService)
    {
        _twoFactorService = twoFactorService;
        _settingsService = settingsService;
        _onboardingService = onboardingService;
    }

    [HttpGet("status")]
    [Authorize]
    public async Task<IActionResult> GetStatus()
    {
        int userId = GetUserId();

        bool isEnabled =
            await _settingsService.IsEnabledAsync(userId);

        return Ok(new
        {
            isEnabled
        });
    }

    [HttpPost("enable")]
    [Authorize]
    public async Task<IActionResult> Enable()
    {
        int userId = GetUserId();

        await _settingsService.EnableAsync(
            userId,
            "Email");

        return Ok(new
        {
            message = "İki faktörlü doğrulama etkinleştirildi.",
            isEnabled = true
        });
    }

    [HttpPost("disable")]
    [Authorize]
    public async Task<IActionResult> Disable()
    {
        int userId = GetUserId();

        await _settingsService.DisableAsync(userId);

        return Ok(new
        {
            message = "İki faktörlü doğrulama devre dışı bırakıldı.",
            isEnabled = false
        });
    }

    [HttpPost("send-code")]
    [Authorize(AuthenticationSchemes = EmailVerificationSchemes)]
    public async Task<IActionResult> SendCode()
    {
        int userId = GetUserId();

        string? email =
            User.FindFirstValue(ClaimTypes.Email);

        if (string.IsNullOrWhiteSpace(email))
        {
            return BadRequest(new
            {
                message = "Kullanıcı e-posta adresi bulunamadı."
            });
        }

        DateTime expiresAt;
        try
        {
            expiresAt = await _twoFactorService.SendCodeAsync(userId, email);
        }
        catch (TwoFactorResendCooldownException cooldown)
        {
            var remainingSeconds = Math.Max(0, (int)Math.Ceiling((cooldown.ExpiresAt - DateTime.UtcNow).TotalSeconds));
            return StatusCode(StatusCodes.Status429TooManyRequests, new
            {
                message = cooldown.Message,
                expiresAt = cooldown.ExpiresAt,
                remainingSeconds
            });
        }

        return Ok(new
        {
            message = "Doğrulama kodu e-posta adresinize gönderildi.",
            expiresAt
        });
    }

    [HttpPost("verify")]
    [Authorize(AuthenticationSchemes = EmailVerificationSchemes)]
    public async Task<IActionResult> Verify(
        [FromBody] VerifyTwoFactorRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Code))
        {
            return BadRequest(new
            {
                message = "Doğrulama kodu gereklidir."
            });
        }

        int userId = GetUserId();

        bool isValid =
            await _twoFactorService.VerifyCodeAsync(
                userId,
                request.Code);

        if (!isValid)
        {
            return BadRequest(new
            {
                message = "Doğrulama kodu geçersiz veya süresi dolmuş."
            });
        }

        // Kod backend'de doğrulandı: e-posta doğrulama durumunu kalıcı olarak işaretle.
        await _onboardingService.MarkEmailVerifiedAsync(userId);

        return Ok(new
        {
            message = "İki faktörlü doğrulama başarılı.",
            verified = true
        });
    }

    private int GetUserId()
    {
        string? userId =
            User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!int.TryParse(userId, out int parsedUserId))
        {
            throw new UnauthorizedAccessException(
                "Geçerli kullanıcı kimliği bulunamadı.");
        }

        return parsedUserId;
    }
}

public class VerifyTwoFactorRequest
{
    public string Code { get; set; } = string.Empty;
}
