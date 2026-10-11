namespace Apı.Model;

public class GetLocationModel
{
    public int UserId { get; set; }
    public double? Latitude { get; set; } // Enlem 
    public double? Longitude { get; set; } // Boylam
    public string? Username { get; set; }
    public string? FullName { get; set; }
    public string? Role { get; set; }
}
