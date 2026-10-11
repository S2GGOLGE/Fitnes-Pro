namespace Apı.Model;

public class SaveLocationModel
{
    public int UserId { get; set; }
    public string Country { get; set; } = string.Empty; //Ülke
    public string Province { get; set; } = string.Empty; //İl
    public string District { get; set; } = string.Empty;//İlçe
    public string? Neighbourhood { get; set; }//Mahalle
    public string? Address { get; set; }//Adres
    public double? Latitude { get; set; }//Enlem
    public double? Longitude { get; set; }//Boylam
    public DateTime CreatedAt { get; set; }//Kayıt Tarihi
    public DateTime? UpdatedAt { get; set; }//Güncelleme Tarihi
}