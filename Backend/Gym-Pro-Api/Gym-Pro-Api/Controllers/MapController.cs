using System.Security.Claims;
using Apı.Model;
using Apı.Service;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace Apı.Controller;

[ApiController]
[Route("api/locations")]
[Route("api/maps")]
[Authorize]
public class MapController : ControllerBase
{
    private readonly IMapService _mapservice;
    public MapController(IMapService mapService)
    {
        _mapservice = mapService;
    }
    [HttpPost]
    public async Task<IActionResult> SaveLocation([FromBody] MapsModel model)
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