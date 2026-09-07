namespace Apı.Model;

public class ApiResponseModel
{
    #region GENEL DURUM

    public bool Success { get; set; }

    // Kullanıcıya gösterilecek mesaj
    public string Message { get; set; } = string.Empty;

    // Başarılı işlemlerde dönen veri
    public object? Data { get; set; }

    #endregion


    #region RATE LIMIT

    // Geçici rate limit uygulanıyor mu?
    public bool RateLimited { get; set; }

    // Tekrar denenebileceği süre
    public int? RemainingSeconds { get; set; }

    #endregion


    #region ACCOUNT LOCK

    // Hesap güvenlik nedeniyle kilitli mi?
    public bool AccountLocked { get; set; }

    #endregion


    #region NORMAL FAIL

    public static ApiResponseModel Fail(string message)
    {
        return new ApiResponseModel
        {
            Success = false,
            Message = message
        };
    }

    #endregion


    #region RATE LIMIT FAIL

    public static ApiResponseModel FailRateLimited(
        string message,
        int remainingSeconds)
    {
        return new ApiResponseModel
        {
            Success = false,
            Message = message,
            RateLimited = true,
            RemainingSeconds = remainingSeconds
        };
    }

    #endregion


    #region PERMANENT LOCK

    public static ApiResponseModel FailLocked(string message)
    {
        return new ApiResponseModel
        {
            Success = false,
            Message = message,
            AccountLocked = true
        };
    }

    #endregion


    #region SUCCESS

    public static ApiResponseModel Ok(
        string message,
        object? data = null)
    {
        return new ApiResponseModel
        {
            Success = true,
            Message = message,
            Data = data
        };
    }

    #endregion
}