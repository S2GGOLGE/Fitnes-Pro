namespace Apı.Model;

public class ApiResponseModel
{
    public bool Success { get; set; }

    public string Message { get; set; } = string.Empty;

    public object? Data { get; set; }

    public static ApiResponseModel Fail(string message)
    {
        return new ApiResponseModel
        {
            Success = false,
            Message = message
        };
    }

    public static ApiResponseModel Ok(string message, object? data = null)
    {
        return new ApiResponseModel
        {
            Success = true,
            Message = message,
            Data = data
        };
    }
}