namespace Apı.Service;

using System.Collections.Concurrent;
public class LoginRateLimitingService
{
    private const int MaxFailedAttempts = 5;
    private static readonly TimeSpan BlocDuracation = TimeSpan.FromMinutes(5);
    private readonly ConcurrentDictionary<string, LoginAttemptInfo> _attemps = new();
    public bool IsBlocked(string key, out TimeSpan remaining)
    {
        remaining = TimeSpan.Zero;
        if (!_attemps.TryGetValue(key, out var ınfo))
            return false;
        if (ınfo.BlockedUntil.HasValue)
        {
            if (ınfo.BlockedUntil.Value > DateTime.UtcNow)
            {
                remaining = ınfo.BlockedUntil.Value - DateTime.UtcNow;
                return true;
            }
            _attemps.TryRemove(key, out _);
            return false;
        }
        return false;
    }
    public int RegisterFailedAttempt(string key)
    {
        var info = _attemps.GetOrAdd(key, _ => new LoginAttemptInfo());
        lock (info)
        {
            info.FailedAttempts++;
            if (info.FailedAttempts >= MaxFailedAttempts)
            {
                info.BlockedUntil = DateTime.UtcNow.Add(BlocDuracation);
            }
            return info.FailedAttempts;
        }
    }
    public void reset(string key)
    {
        _attemps.TryRemove(key, out _);
    }
    private class LoginAttemptInfo
    {
        public int FailedAttempts { get; set; }
        public DateTime? BlockedUntil { get; set; }
    }
}