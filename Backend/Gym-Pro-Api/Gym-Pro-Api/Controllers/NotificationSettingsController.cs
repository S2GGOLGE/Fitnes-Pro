using System.Security.Claims;
using Apı.Service;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Apı.Controllers;

[ApiController]
[Route("api/notification-settings")]
[Authorize]
public sealed class NotificationSettingsController(NotificationSettingsService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId)) return Unauthorized();
        var settings = await service.GetAsync(userId);
        return Ok(new { channel = settings.Channel, priority = settings.Priority, canUseEmail = await service.IsEmailVerifiedAsync(userId) });
    }

    [HttpPut]
    public async Task<IActionResult> Save([FromBody] NotificationSettingsRequest request)
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId)) return Unauthorized();
        if (request.Channel is not ("Email" or "InApp") || request.Priority is not ("All" or "Important" or "Critical"))
            return BadRequest(new { message = "Bildirim ayarları geçersiz." });
        try { await service.SaveAsync(userId, request.Channel, request.Priority); }
        catch (InvalidOperationException error) { return BadRequest(new { message = error.Message }); }
        return Ok(new { message = "Bildirim tercihleriniz kaydedildi.", channel = request.Channel, priority = request.Priority });
    }
}

public sealed class NotificationSettingsRequest
{
    public string Channel { get; set; } = "";
    public string Priority { get; set; } = "";
}
