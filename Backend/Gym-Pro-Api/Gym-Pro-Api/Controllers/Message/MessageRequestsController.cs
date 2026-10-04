using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Apı.Dtos;
using Apı.Service;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Apı.Controllers;

[ApiController]
[Route("api/message-requests")]
[Authorize]
public class MessageRequestsController : ControllerBase
{
    private readonly IMessageRequestService _service;

    public MessageRequestsController(
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
    // MESAJ İSTEĞİ GÖNDER
    // POST /api/message-requests
    // body: { receiverId: int }
    // =========================================================
    [HttpPost]
    public async Task<IActionResult> Send(
        [FromBody] SendMessageRequestDto dto)
    {
        try
        {
            if (dto == null)
            {
                return BadRequest(
                    new
                    {
                        success = false,
                        message = "Geçersiz istek gövdesi."
                    });
            }

            var userId = GetUserId();

            var (success, message, requestId) =
                await _service.SendMessageRequestAsync(
                    userId,
                    dto.ReceiverId);

            return Ok(new
            {
                success,
                message,
                requestId
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
                    message = "Mesaj isteği gönderilirken bir hata oluştu."
                });
        }
    }

    // =========================================================
    // GELEN MESAJ İSTEKLERİ
    // GET /api/message-requests/incoming
    // =========================================================
    [HttpGet("incoming")]
    public async Task<IActionResult> GetIncoming()
    {
        try
        {
            var userId = GetUserId();

            var response =
                await _service.GetIncomingRequestsAsync(userId);

            return Ok(response);
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
                    message = "Gelen mesaj istekleri alınırken bir hata oluştu."
                });
        }
    }

    // =========================================================
    // GÖNDERİLEN MESAJ İSTEKLERİ
    // GET /api/message-requests/outgoing
    // =========================================================
    [HttpGet("outgoing")]
    public async Task<IActionResult> GetOutgoing()
    {
        try
        {
            var userId = GetUserId();

            var response =
                await _service.GetOutgoingRequestsAsync(userId);

            return Ok(response);
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
                    message = "Gönderilen mesaj istekleri alınırken bir hata oluştu."
                });
        }
    }

    // =========================================================
    // MESAJ İSTEĞİNİ KABUL ET
    // POST /api/message-requests/{requestId}/accept
    // =========================================================
    [HttpPost("{requestId:int}/accept")]
    public async Task<IActionResult> Accept(int requestId)
    {
        try
        {
            var userId = GetUserId();

            var response =
                await _service.AcceptRequestAsync(
                    requestId,
                    userId);

            return Ok(response);
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
                    message = "Mesaj isteği kabul edilirken bir hata oluştu."
                });
        }
    }

    // =========================================================
    // MESAJ İSTEĞİNİ REDDET
    // POST /api/message-requests/{requestId}/reject
    // =========================================================
    [HttpPost("{requestId:int}/reject")]
    public async Task<IActionResult> Reject(int requestId)
    {
        try
        {
            var userId = GetUserId();

            var response =
                await _service.RejectRequestAsync(
                    requestId,
                    userId);

            return Ok(response);
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
                    message = "Mesaj isteği reddedilirken bir hata oluştu."
                });
        }
    }

    // =========================================================
    // GÖNDERİLEN MESAJ İSTEĞİNİ İPTAL ET
    // DELETE /api/message-requests/{requestId}
    // =========================================================
    [HttpDelete("{requestId:int}")]
    public async Task<IActionResult> Cancel(int requestId)
    {
        try
        {
            var userId = GetUserId();

            var response =
                await _service.CancelRequestAsync(
                    requestId,
                    userId);

            return Ok(response);
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
                    message = "Mesaj isteği iptal edilirken bir hata oluştu."
                });
        }
    }
    // =========================================================
    // KABUL EDİLMİŞ MESAJLAŞMA KİŞİLERİ
    // GET /api/message-requests/accepted-message
    // =========================================================
    [Authorize]
    [HttpGet("accted-message")]
    public async Task<IActionResult> GetAcceptedContacts()
    {
        try
        {
            var userId = GetUserId();
            var response = await _service.GetAcceptedContactAsync(userId);
            return Ok(response);
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
                    succes = false,
                    message = "Kabul edilen mesaj istekleri alınırken bir hata oluştu."
                }
            );
        }
    }
}