using Apı.Service;
using Microsoft.AspNetCore.Mvc;

namespace Apı.Controller;

[ApiController]
[Route("api/rate")]
public class RateController : ControllerBase
{
    private readonly LoginRateLimitingService _rateLimitService;

    public RateController(
        LoginRateLimitingService rateLimitService)
    {
        _rateLimitService =
            rateLimitService
            ?? throw new ArgumentNullException(
                nameof(rateLimitService)
            );
    }

    // =========================================================
    // LOGIN RATE STATUS
    //
    // GET /api/rate/login
    // =========================================================

    [HttpGet("login")]
    public IActionResult GetLoginRate()
    {
        // =====================================================
        // CLIENT IP
        // =====================================================

        var clientIp =
            HttpContext.Connection.RemoteIpAddress?.ToString();

        // =====================================================
        // IP BULUNAMADI
        // =====================================================

        if (string.IsNullOrWhiteSpace(clientIp))
        {
            return BadRequest(new
            {
                success = false,
                message = "Client IP alınamadı.",
                data = (object?)null,
                rateLimited = false,
                remainingSeconds = (int?)null,
                accountLocked = false
            });
        }

        // =====================================================
        // KALICI BLOK
        // =====================================================

        if (_rateLimitService.IsPermanentlyLocked(clientIp))
        {
            var permanentStatus =
                _rateLimitService.GetStatus(clientIp);

            return Ok(new
            {
                success = true,
                message =
                    "Güvenlik nedeniyle erişiminiz kalıcı olarak bloke edilmiştir.",

                data = new
                {
                    attempts =
                        permanentStatus.FailedAttempts
                },

                rateLimited = true,

                remainingSeconds = (int?)null,

                accountLocked = true
            });
        }

        // =====================================================
        // GEÇİCİ BLOK / NORMAL DURUM
        // =====================================================

        var isBlocked =
            _rateLimitService.IsBlocked(
                clientIp,
                out var remaining
            );

        // =====================================================
        // KALAN SÜRE
        // =====================================================

        int? remainingSeconds = null;

        if (isBlocked)
        {
            remainingSeconds =
                Math.Max(
                    1,
                    (int)Math.Ceiling(
                        remaining.TotalSeconds
                    )
                );
        }
        else
        {
            remainingSeconds = 0;
        }

        // =====================================================
        // STATUS
        // =====================================================

        var status =
            _rateLimitService.GetStatus(clientIp);

        // =====================================================
        // MESAJ
        // =====================================================

        var message =
            isBlocked
                ? "Çok fazla başarısız giriş denemesi."
                : "Rate limit durumu normal.";

        // =====================================================
        // RESPONSE
        // =====================================================

        return Ok(new
        {
            success = true,

            message,

            data = new
            {
                attempts =
                    status.FailedAttempts
            },

            rateLimited =
                isBlocked,

            remainingSeconds,

            accountLocked =
                false
        });
    }
}
