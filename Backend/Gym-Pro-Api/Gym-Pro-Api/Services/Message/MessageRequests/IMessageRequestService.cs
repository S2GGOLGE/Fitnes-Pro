using Apı.Dtos;
using Apı.Model;

namespace Apı.Service;

public interface IMessageRequestService
{
    // =========================================================
    // GİZLİLİK
    // =========================================================
    Task<PrivacySettingsResponseDto> GetPrivacySettingsAsync(int UserId);
    Task<bool> UpdatePrivacySettingsAsync(int userId, string permission);

    // =========================================================
    // MESAJ İSTEĞİ
    // =========================================================
    Task<(bool Success, string Message, int? RequestId)>
        SendMessageRequestAsync(int senderId, int receiverId);

    // =========================================================
    // İSTEK YÖNETİMİ
    // =========================================================
    Task<ApiResponseModel> GetIncomingRequestsAsync(int userId);
    Task<ApiResponseModel> GetOutgoingRequestsAsync(int userId);
    Task<ApiResponseModel> AcceptRequestAsync(int requestId, int userId);
    Task<ApiResponseModel> RejectRequestAsync(int requestId, int userId);
    Task<ApiResponseModel> CancelRequestAsync(int requestId, int userId);
    Task<ApiResponseModel> GetAcceptedContactAsync(int userId);
}