using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Apı.Dtos;
using Apı.Service;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Apı.Controllers;

[ApiController]
[Route("api/privacy")]
[Authorize]
public class PrivacyController : ControllerBase
{
    private readonly IMessageRequestService _service;

    public PrivacyController(
        IMessageRequestService service)
    {
        _service = service
            ?? throw new ArgumentNullException(nameof(service));
    }

    // =========================================================
    // JWT USER ID
    // =========================================================
    private int GetUserId()
    {
        var userIdClaim =
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (!int.TryParse(userIdClaim, out var userId))
        {
            throw new UnauthorizedAccessException(
                "Kullanıcı kimliği alınamadı.");
        }

        return userId;
    }

    // =========================================================
    // GİZLİLİK AYARLARIMI GETİR
    // GET /api/privacy/me
    // =========================================================
    [HttpGet("me")]
    public async Task<IActionResult> GetMySettings()
    {
        try
        {
            var userId = GetUserId();

            var settings =
                await _service.GetPrivacySettingsAsync(userId);

            return Ok(new
            {
                success = true,
                message = "Gizlilik ayarları başarıyla getirildi.",
                data = settings
            });
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized();
        }
        catch
        {
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new
                {
                    success = false,
                    message = "Gizlilik ayarları alınırken bir hata oluştu."
                });
        }
    }

    // =========================================================
    // GİZLİLİK AYARLARIMI GÜNCELLE
    // PUT /api/privacy/me
    // body: { messageRequestPermission: "Everyone" | "FriendsOnly" | "Nobody" }
    // =========================================================
    [HttpPut("me")]
    public async Task<IActionResult> UpdateMySettings(
        [FromBody] UpdatePrivacySettingsDto dto)
    {
        try
        {
            if (dto == null ||
                string.IsNullOrWhiteSpace(
                    dto.MessageRequestPermission))
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Geçersiz gizlilik ayarı."
                });
            }

            var userId = GetUserId();

            var ok = await _service.UpdatePrivacySettingsAsync(
                userId,
                dto.MessageRequestPermission);

            if (!ok)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Geçersiz gizlilik değeri. Everyone, FriendsOnly veya Nobody olmalıdır."
                });
            }

            // Güncellenmiş ayarları tekrar getir
            var settings =
                await _service.GetPrivacySettingsAsync(userId);

            return Ok(new
            {
                success = true,
                message = "Gizlilik ayarları güncellendi.",
                data = settings
            });
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized();
        }
        catch
        {
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new
                {
                    success = false,
                    message = "Gizlilik ayarları güncellenirken bir hata oluştu."
                });
        }
    }
}