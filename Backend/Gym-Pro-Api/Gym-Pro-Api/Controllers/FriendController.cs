using Apı.Service;
using Apı.Model;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Apı.Controllers;

[ApiController]
[Route("api/friends")]
[Authorize]
public class FriendController : ControllerBase
{
    private readonly FriendService _friendService;

    public FriendController(FriendService friendService)
    {
        _friendService =
            friendService
            ?? throw new ArgumentNullException(nameof(friendService));
    }

    // =========================================================
    // JWT USER ID
    // =========================================================

    private int GetUserId()
    {
        var userIdClaim =
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (!int.TryParse(userIdClaim, out var userId))
        {
            throw new UnauthorizedAccessException(
                "Kullanıcı kimliği alınamadı."
            );
        }

        return userId;
    }

    // =========================================================
    // ARKADAŞLIK İSTEĞİ GÖNDER (Username ile)
    // =========================================================

    [HttpPost("request")]
    public async Task<IActionResult> SendRequest(
        [FromBody] SendFriendRequestDto? dto)
    {
        try
        {
            if (dto is null || string.IsNullOrWhiteSpace(dto.Username))
            {
                return BadRequest(
                    ApiResponseModel
                        .Fail("Hedef kullanici adi belirtilmedi.")
                );
            }

            var senderId = GetUserId();

            var response =
                await _friendService.SendRequestAsync(
                    senderId,
                    dto.Username.Trim()
                );

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
                "Arkadaşlık isteği gönderilirken bir hata oluştu."
            );
        }
    }

    // =========================================================
    // GELEN ARKADAŞLIK İSTEKLERİ
    // =========================================================

    [HttpGet("requests/incoming")]
    public async Task<IActionResult> GetIncomingRequests()
    {
        try
        {
            var userId = GetUserId();

            var response =
                await _friendService.GetIncomingRequestsAsync(
                    userId
                );

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
                "Gelen arkadaşlık istekleri alınırken bir hata oluştu."
            );
        }
    }

    // =========================================================
    // ARKADAŞLIK İSTEĞİNİ KABUL ET
    // =========================================================

    [HttpPost("requests/{requestId:int}/accept")]
    public async Task<IActionResult> AcceptRequest(
        int requestId)
    {
        try
        {
            var userId = GetUserId();

            var response =
                await _friendService.AcceptRequestAsync(
                    requestId,
                    userId
                );

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
                "Arkadaşlık isteği kabul edilirken bir hata oluştu."
            );
        }
    }

    // =========================================================
    // ARKADAŞLIK İSTEĞİNİ REDDET
    // =========================================================

    [HttpPost("requests/{requestId:int}/reject")]
    public async Task<IActionResult> RejectRequest(
        int requestId)
    {
        try
        {
            var userId = GetUserId();

            var response =
                await _friendService.RejectRequestAsync(
                    requestId,
                    userId
                );

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
                "Arkadaşlık isteği reddedilirken bir hata oluştu."
            );
        }
    }

    // =========================================================
    // GÖNDERİLEN ARKADAŞLIK İSTEĞİNİ İPTAL ET
    // =========================================================

    [HttpPost("requests/{requestId:int}/cancel")]
    public async Task<IActionResult> CancelRequest(
        int requestId)
    {
        try
        {
            var userId = GetUserId();

            var response =
                await _friendService.CancelRequestAsync(
                    requestId,
                    userId
                );

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
                "Arkadaşlık isteği iptal edilirken bir hata oluştu."
            );
        }
    }

    // =========================================================
    // ARKADAŞ LİSTESİNİ GETİR
    // =========================================================

    [HttpGet]
    public async Task<IActionResult> GetFriends()
    {
        try
        {
            var userId = GetUserId();

            var response =
                await _friendService.GetFriendsAsync(
                    userId
                );

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
                "Arkadaş listesi alınırken bir hata oluştu."
            );
        }
    }

    // =========================================================
    // ARKADAŞI SİL
    // =========================================================

    [HttpDelete("{friendUserId:int}")]
    public async Task<IActionResult> RemoveFriend(
        int friendUserId)
    {
        try
        {
            var userId = GetUserId();

            var response =
                await _friendService.RemoveFriendAsync(
                    userId,
                    friendUserId
                );

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
                "Arkadaş silinirken bir hata oluştu."
            );
        }
    }
    // =========================================================
    // ARKADAŞLIK İSTEKLERİNİ GETİR
    // =========================================================
    [HttpGet("requests/outgoing")]
    public async Task<IActionResult> GetOutgoingRequests()
    {
        try
        {
            var userId = GetUserId();

            var response =
                await _friendService.GetOutgoingRequestsAsync(userId);

            return Ok(response);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized();
        }
        catch
        {
            return StatusCode(
                500,
                "Gönderilen arkadaşlık istekleri alınırken bir hata oluştu."
            );
        }
    }
}

// =========================================================
// DTO: Arkadaşlık isteği gönder (username ile)
// =========================================================
public class SendFriendRequestDto
{
    public string Username { get; set; } = string.Empty;
}