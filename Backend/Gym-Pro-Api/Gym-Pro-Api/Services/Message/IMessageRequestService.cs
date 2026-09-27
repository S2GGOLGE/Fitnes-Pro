using Apı.Dtos;
namespace Apı.Service;

public interface IMessageRequestService
{
    Task<PrivacySettingsResponseDto> GetPrivacySettingsAsync(int UserId);
    Task<bool> UpdatePrivacySettingsAsync(int userId, string permission);
    Task<(bool Success, string Message, int? RequestId)> SendMessageRequestAsync(int senderId, int receiverId);

}