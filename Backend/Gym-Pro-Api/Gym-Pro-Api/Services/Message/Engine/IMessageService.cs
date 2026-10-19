using Apı.Dtos;
using Apı.Model;
namespace Apı.Service;

public interface IMessageService
{
    Task<ApiResponseModel> SendMessageAsync(string username, SendMessageDto dto);
    Task<ApiResponseModel> GetConversationAsync(int userId, int otherUserId);
    Task<ApiResponseModel> MarkAsReadAsync(int userId, int MessageId);
    Task<ApiResponseModel> DeletedMessageAsync(int userId, int message);
}
