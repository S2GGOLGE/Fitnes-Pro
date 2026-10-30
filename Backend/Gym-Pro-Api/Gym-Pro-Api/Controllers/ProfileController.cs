using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Apı.Model;
using Apı.Service;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Apı.Controller;

[ApiController]
[Route("api/profile")]
[Authorize]
public class ProfileController : ControllerBase
{
    private readonly ProfileService _service;
    public ProfileController(ProfileService service)
    {
        _service = service;
    }
    public int GetUserId()
    {
        var userIdclaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        if (!int.TryParse(userIdclaim, out var userId) || userId <= 0)
        {
            throw new UnauthorizedAccessException("Kullanıcı Kimliği Alınamadı");
        }
        return userId;
    }
    // POST /api/profile/theme
    // Body: { "thema": "Dark" }
    // Kabul edilen değerler: Dark, Light
    [HttpPost("theme")]
    [HttpPost("theame")]
    public async Task<IActionResult> SaveTheame([FromBody] TheameModel model)
    {
        try
        {
            if (model == null)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Geçersiz istek Govdesi"
                });
            }
            var userId = GetUserId();
            //Kullanıcı kimliği JWT üzerinden alınır
            model.UserId = userId;
            var response = await _service.TheameSettings(model);
            return response.Success ? Ok(response) : BadRequest(response);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized();
        }
    }

    // GET /api/profile/theme
    // JWT ile doğrulanmış kullanıcının kendi temasını döner.
    // Kayıt yoksa "Dark" varsayılanı döner.
    [HttpGet("theme")]
    [HttpGet("theame")]
    public async Task<IActionResult> GetTheame()
    {
        try
        {
            var userId = GetUserId();
            var response = await _service.GetTheameSettings(userId);
            return response.Success ? Ok(response) : BadRequest(response);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized();
        }
    }
    [HttpPost("biography")]
    public async Task<IActionResult> SaveBiography([FromBody] BiographyModel model)
    {
        try
        {
            var userId = GetUserId();

            model.UserId = userId;
            var response = await _service.SaveBiographyAsync(model);
            return response.Success ? Ok(response) : BadRequest(response);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized();
        }
    }
    [HttpGet("biography")]
    public async Task<IActionResult> GetBiography()
    {
        try
        {
            var userId = GetUserId();
            var response = await _service.GetBiography(userId);
            return Ok(response);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized();
        }
    }
}
