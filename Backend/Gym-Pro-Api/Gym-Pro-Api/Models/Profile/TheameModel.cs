using System.Text.Json.Serialization;

namespace Apı.Model;

public class TheameModel
{
    /// <summary>
    /// Kullanıcı kimliği istemciden GELMEZ; JWT claim'inden backend tarafında doldurulur.
    /// </summary>
    [JsonIgnore]
    public int UserId { get; set; }

    /// <summary>
    /// İstek gövdesindeki alan adı: { "thema": "Dark" }
    /// </summary>
    [JsonPropertyName("thema")]
    public string Theame { get; set; } = "Dark";
}
