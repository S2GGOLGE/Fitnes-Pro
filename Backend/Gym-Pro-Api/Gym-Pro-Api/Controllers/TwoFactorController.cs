using Apı.Service;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Apı.Controllers;

[ApiController]
[Route("api/two-factor")]
[Authorize]
public class TwoFactorController : ControllerBase
{
    private readonly ITwoFactorService _twoFactorService;
    private readonly ITwoFactorSettingsService _settingsService;

    public TwoFactorController(
        ITwoFactorService twoFactorService,
        ITwoFactorSettingsService settingsService)
    {
        _twoFactorService = twoFactorService;
        _settingsService = settingsService;
    }

    [HttpGet("status")]
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

        await _twoFactorService.SendCodeAsync(
            userId,
            email);

        return Ok(new
        {
            message = "Doğrulama kodu e-posta adresinize gönderildi."
        });
    }

    [HttpPost("verify")]
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