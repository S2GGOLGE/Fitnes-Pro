using System.Security.Claims;
using Apı.Model;
using Apı.Service;
using Apı.Service.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace Apı.Controller;

[ApiController]
[Route("api/locations")]
[Route("api/maps")]
[Authorize(AuthenticationSchemes = "Bearer," + JwtService.OnboardingScheme)]
public class MapController : ControllerBase
{
    private readonly IMapService _mapservice;
    private readonly OnboardingService _onboardingService;
    public MapController(
        IMapService mapService,
        OnboardingService onboardingService)
    {
        _mapservice = mapService;
        _onboardingService = onboardingService;
    }

    // Kullanıcının konum / e-posta doğrulama durumunu backend'den döner.
    [HttpGet("status")]
    public async Task<IActionResult> GetOnboardingStatus()
    {
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? User.FindFirstValue("sub");
        if (!int.TryParse(userIdValue, out var userId))
        {
            return Unauthorized(
                ApiResponseModel.Fail("Kullanıcı Kimliği Doğrulanamadı")
            );
        }
        var status = await _onboardingService.GetStatusAsync(userId);
        return Ok(ApiResponseModel.Ok("Durum alındı.", new
        {
            locationSet = status.LocationSet,
            emailVerified = status.EmailVerified,
            nextStep = status.NextStep,
            level = status.Level,
            isUzman = status.IsUzman
        }));
    }

    // Kayıtlı kullanıcı konumlarını getirir.
    [HttpGet]
    public async Task<IActionResult> GetLocations([FromQuery] int? userId = null)
    {
        var currentUserIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");
        if (!int.TryParse(currentUserIdValue, out var currentUserId))
        {
            return Unauthorized(
                ApiResponseModel.Fail("Kullanıcı kimliği doğrulanamadı.")
            );
        }

        var filter = new GetLocationModel
        {
            UserId = userId ?? 0
        };

        var result = await _mapservice.GetLocationAsync(filter);
        if (!result.Success)
        {
            return BadRequest(result);
        }
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> SaveLocation([FromBody] SaveLocationModel model)
    {
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? User.FindFirstValue("sub");
        if (!int.TryParse(userIdValue, out var userId))
        {
            return Unauthorized(
                ApiResponseModel.Fail("Kullanıcı Kimliği Doğrulanamadı")
            );
        }
        model.UserId = userId;
        var result = await _mapservice.SaveLocationAsync(model);
        if (!result.Success)
        {
            return BadRequest(result);
        }
        return Ok(result);
    }
}