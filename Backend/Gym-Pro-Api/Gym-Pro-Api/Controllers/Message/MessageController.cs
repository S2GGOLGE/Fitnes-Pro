using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Apı.Dtos;
using Apı.Model;
using Apı.Service;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Apı.Controller;

[ApiController]
[Route("api/messages")]
[Authorize]
public class MessageController : ControllerBase
{
    private readonly IMessageService _service;
    public MessageController(IMessageService service)
    {
        _service = service ?? throw new ArgumentException(nameof(service));
    }
    private int GetUserıd()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        if (!int.TryParse(userIdClaim, out var userId) || userId <= 0)
        {
            throw new UnauthorizedAccessException("Kullanıcı Kimlik bilgisi alınamdı");
        }
        return userId;
    }
    // POST /api/messages
    // Body: { "ReceviverId": 2, "Content": "Merhaba", "MessageType": "Text" }
    // (Backend DTO alan adı "ReceviverId" olarak tanımlı.)
    [HttpPost]
    public async Task<IActionResult> Send([FromBody] SendMessageDto dto)
    {
        try
        {
            if (dto == null)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Geçersiz istek gövdesi."
                });
            }

            var userId = GetUserıd();
            var response = await _service.SendMessageAsync(userId, dto);
            return response.Success ? Ok(response) : BadRequest(response);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized();
        }
    }
    // GET /api/messages/{otherUserId}
    [HttpGet("{otherUserId:int}")]
    public async Task<IActionResult> GetConversation(int otherUserId)
    {
        try
        {
            var userId = GetUserıd();
            var response = await _service.GetConversationAsync(userId, otherUserId);
            return response.Success ? Ok(response) : BadRequest(response);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized();
        }
    }
    // PATCH /api/messages/{messageId}/read
    [HttpPatch("{messageId:int}/read")]
    public async Task<IActionResult> MarkAsRead(int messageId)
    {
        try
        {
            var userId = GetUserıd();
            var response = await _service.MarkAsReadAsync(userId, messageId);
            return response.Success ? Ok(response) : BadRequest(response);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized();
        }
    }
    // DELETE /api/messages/{messageId}
    [HttpDelete("{messageId:int}")]
    public async Task<IActionResult> Delete(int messageId)
    {
        try
        {
            var userId = GetUserıd();
            var response = await _service.DeletedMessageAsync(userId, messageId);
            return response.Success ? Ok(response) : BadRequest(response);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized();
        }
    }
}