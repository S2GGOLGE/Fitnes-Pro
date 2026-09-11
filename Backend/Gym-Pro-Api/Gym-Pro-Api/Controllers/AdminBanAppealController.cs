using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Apı.Model;
using Apı.Service;
using Apı.Service.Authentication;
using Apı.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Apı.Controllers;

/// <summary>
/// Admin paneli için ban appeal yönetim endpoint'leri.
/// Tüm endpoint'ler [Authorize(Roles = "Admin")] ile korunur.
/// </summary>
[ApiController]
[Route("api/admin/ban-appeals")]
[Authorize(Roles = "Admin")]
public class AdminBanAppealController : ControllerBase
{
    private readonly BanStorageService _banStorage;
    private readonly LoginRateLimitingService _rateLimitService;
    private readonly ILogService _logService;

    public AdminBanAppealController(
        BanStorageService banStorage,
        LoginRateLimitingService rateLimitService,
        ILogService logService)
    {
        _banStorage = banStorage
            ?? throw new ArgumentNullException(nameof(banStorage));

        _rateLimitService = rateLimitService
            ?? throw new ArgumentNullException(nameof(rateLimitService));

        _logService = logService
            ?? throw new ArgumentNullException(nameof(logService));
    }

    // =========================================================
    // LIST
    // GET /api/admin/ban-appeals
    // GET /api/admin/ban-appeals?status=Pending
    // =========================================================

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? status = null)
    {
        if (!string.IsNullOrWhiteSpace(status) &&
            status != BanAppealStatus.Pending &&
            status != BanAppealStatus.Approved &&
            status != BanAppealStatus.Rejected)
        {
            return BadRequest(ApiResponseModel.Fail(
                "Geçersiz status filtresi. " +
                "Pending / Approved /Rejected olmalıdır."
            ));
        }

        var appeals =
            await _banStorage.GetAppealsAsync(status);

        return Ok(ApiResponseModel.Ok(
            "Ban appeal listesi getirildi.",
            new
            {
                count = appeals.Count,
                items = appeals
            }
        ));
    }

    // =========================================================
    // APPROVE
    // POST /api/admin/ban-appeals/{id}/approve
    // body: { adminNote }
    // =========================================================

    [HttpPost("{id:int}/approve")]
    public async Task<IActionResult> Approve(
        int id,
        [FromBody] BanAppealDecisionRequestModel? body)
    {
        var adminUsername = GetCurrentAdminUsername();
        var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString();

        var appeal =
            await _banStorage.GetAppealAsync(id);

        if (appeal == null)
        {
            return NotFound(ApiResponseModel.Fail(
                "Ban appeal bulunamadı."
            ));
        }

        if (appeal.Status != BanAppealStatus.Pending)
        {
            return BadRequest(ApiResponseModel.Fail(
                $"Bu appeal zaten '{appeal.Status}' durumunda. " +
                "Sadece Pending appeal'ler onaylanabilir."
            ));
        }

        // 1) Appeal'i onayla
        var decided =
            await _banStorage.DecideAppealAsync(
                id,
                BanAppealStatus.Approved,
                adminUsername,
                body?.AdminNote
            );

        if (!decided)
        {
            return BadRequest(ApiResponseModel.Fail(
                "Appeal onaylanamadı (başka bir işlem yapılmış olabilir)."
            ));
        }

        // 2) DB'den banı kaldır + in-memory entry'leri temizle
        await _rateLimitService.RemovePermanentLockAsync(appeal.Username);

        Console.WriteLine(
            $"[ADMIN BAN APPEAL] ONAY | " +
            $"Id={id} | Username={appeal.Username} | " +
            $"By={adminUsername}"
        );

        // =========================================================
        // LOG: APPEAL APPROVED (AdminLog)
        // =========================================================

        try
        {
            await _logService.LogAdminAsync(
                adminUsername,
                "AppealApproved",
                $"Ban appeal onaylandı (Username={appeal.Username})",
                appeal.Username,
                clientIp
            );
        }
        catch
        {
            // Log hatası ana işlemi bozmamalı.
        }

        // =========================================================
        // LOG: BAN REMOVED (AdminLog)
        // =========================================================

        try
        {
            await _logService.LogAdminAsync(
                adminUsername,
                "BanRemoved",
                $"Kullanıcının kalıcı banı kaldırıldı (Username={appeal.Username})",
                appeal.Username,
                clientIp
            );
        }
        catch
        {
            // Log hatası ana işlemi bozmamalı.
        }

        // =========================================================
        // LOG: APPEAL APPROVED (AppealLog)
        // =========================================================

        try
        {
            await _logService.LogAppealAsync(
                id,
                appeal.Username,
                "AppealApproved",
                "Ban appeal admin tarafından onaylandı",
                adminUsername,
                clientIp
            );
        }
        catch
        {
            // Log hatası ana işlemi bozmamalı.
        }

        return Ok(ApiResponseModel.Ok(
            "Ban appeal onaylandı. Kullanıcının banı kaldırıldı.",
            new
            {
                appealId = id,
                status = BanAppealStatus.Approved,
                decidedBy = adminUsername
            }
        ));
    }

    // =========================================================
    // REJECT
    // POST /api/admin/ban-appeals/{id}/reject
    // body: { adminNote }
    // =========================================================

    [HttpPost("{id:int}/reject")]
    public async Task<IActionResult> Reject(
        int id,
        [FromBody] BanAppealDecisionRequestModel? body)
    {
        var adminUsername = GetCurrentAdminUsername();
        var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString();

        var appeal =
            await _banStorage.GetAppealAsync(id);

        if (appeal == null)
        {
            return NotFound(ApiResponseModel.Fail(
                "Ban appeal bulunamadı."
            ));
        }

        if (appeal.Status != BanAppealStatus.Pending)
        {
            return BadRequest(ApiResponseModel.Fail(
                $"Bu appeal zaten '{appeal.Status}' durumunda. " +
                "Sadece Pending appeal'ler reddedilebilir."
            ));
        }

        var decided =
            await _banStorage.DecideAppealAsync(
                id,
                BanAppealStatus.Rejected,
                adminUsername,
                body?.AdminNote
            );

        if (!decided)
        {
            return BadRequest(ApiResponseModel.Fail(
                "Appeal reddedilemedi (başka bir işlem yapılmış olabilir)."
            ));
        }

        Console.WriteLine(
            $"[ADMIN BAN APPEAL] RED | " +
            $"Id={id} | Username={appeal.Username} | " +
            $"By={adminUsername}"
        );

        // =========================================================
        // LOG: APPEAL REJECTED (AdminLog)
        // =========================================================

        try
        {
            await _logService.LogAdminAsync(
                adminUsername,
                "AppealRejected",
                $"Ban appeal reddedildi (Username={appeal.Username})",
                appeal.Username,
                clientIp
            );
        }
        catch
        {
            // Log hatası ana işlemi bozmamalı.
        }

        // =========================================================
        // LOG: APPEAL REJECTED (AppealLog)
        // =========================================================

        try
        {
            await _logService.LogAppealAsync(
                id,
                appeal.Username,
                "AppealRejected",
                "Ban appeal admin tarafından reddedildi",
                adminUsername,
                clientIp
            );
        }
        catch
        {
            // Log hatası ana işlemi bozmamalı.
        }

        return Ok(ApiResponseModel.Ok(
            "Ban appeal reddedildi. Kullanıcının banı devam ediyor.",
            new
            {
                appealId = id,
                status = BanAppealStatus.Rejected,
                decidedBy = adminUsername
            }
        ));
    }

    // =========================================================
    // YARDIMCI: Admin kullanıcı adını JWT'den al
    // =========================================================

    private string GetCurrentAdminUsername()
    {
        return User.FindFirst(ClaimTypes.Name)?.Value
               ?? User.FindFirst(JwtRegisteredClaimNames.UniqueName)?.Value
               ?? User.Identity?.Name
               ?? "UnknownAdmin";
    }
}
