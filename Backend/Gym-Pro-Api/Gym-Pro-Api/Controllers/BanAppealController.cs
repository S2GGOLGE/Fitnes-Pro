using Apı.Model;
using Apı.Service.Authentication;
using Microsoft.AspNetCore.Mvc;

namespace Apı.Controllers;

/// <summary>
/// Banlanmış kullanıcının ban kaldırma talebi (appeal) açması için endpoint.
/// Mevcut kurallar:
///   - Sadece DB'de banlı kullanıcılar appeal gönderebilir.
///   - Aynı anda en fazla 1 açık (Pending) appeal olabilir.
///   - Toplam max 2 appeal gönderilebilir (onay/ret fark etmez).
/// </summary>
[ApiController]
[Route("api/auth/ban-appeal")]
public class BanAppealController : ControllerBase
{
    private readonly BanStorageService _banStorage;

    public BanAppealController(BanStorageService banStorage)
    {
        _banStorage = banStorage
            ?? throw new ArgumentNullException(nameof(banStorage));
    }

    [HttpPost]
    public async Task<IActionResult> SubmitAppeal(
        [FromBody] BanAppealRequestModel model)
    {
        // =========================================================
        // VALIDATION
        // =========================================================

        if (model == null ||
            string.IsNullOrWhiteSpace(model.Username) ||
            string.IsNullOrWhiteSpace(model.Message))
        {
            return BadRequest(ApiResponseModel.Fail(
                "Kullanıcı adı ve mesaj zorunludur."
            ));
        }

        if (model.Message.Length > 1000)
        {
            return BadRequest(ApiResponseModel.Fail(
                "Mesaj en fazla 1000 karakter olabilir."
            ));
        }

        // =========================================================
        // KULLANICI BANLI MI?
        // =========================================================

        if (!await _banStorage.IsBannedAsync(model.Username))
        {
            return BadRequest(ApiResponseModel.Fail(
                "Hesabınız banlı olmadığı için appeal gönderemezsiniz."
            ));
        }

        // =========================================================
        // MAX 2 APPEAL KURALI
        // =========================================================

        var totalAppeals =
            await _banStorage.CountAppealsAsync(model.Username);

        if (totalAppeals >= 2)
        {
            return BadRequest(ApiResponseModel.Fail(
                "Ban kaldırma talebi hakkınız doldu. " +
                "En fazla 2 kez talep gönderebilirsiniz."
            ));
        }

        // =========================================================
        // PENDING KONTROLÜ
        // =========================================================

        if (await _banStorage.HasPendingAppealAsync(model.Username))
        {
            return BadRequest(ApiResponseModel.Fail(
                "Önceki talebiniz henüz değerlendirilmedi. " +
                "Lütfen sonucu bekleyiniz."
            ));
        }

        // =========================================================
        // APPEAL KAYDET
        // =========================================================

        var appealId =
            await _banStorage.InsertAppealAsync(
                model.Username,
                model.Message
            );

        Console.WriteLine(
            $"[BAN APPEAL] Yeni talep | " +
            $"Id={appealId} | Username={model.Username}"
        );

        return Ok(ApiResponseModel.Ok(
            "Ban kaldırma talebiniz alındı. " +
            "Yönetici tarafından değerlendirilecektir.",
            new
            {
                appealId,
                status = BanAppealStatus.Pending
            }
        ));
    }
}
