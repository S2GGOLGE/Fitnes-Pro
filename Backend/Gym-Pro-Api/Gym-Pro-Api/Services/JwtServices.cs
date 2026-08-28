using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;
using Apı.Model;
namespace Apı.Service;

public class JwtService
{
    public IConfiguration _configuration;
    public JwtService(IConfiguration configuration)
    {
        _configuration = configuration;
    }
    public string CreateToken(JwtModel model)
    {
        var jwt = _configuration.GetSection("jwt");
        var key = new SymmetricSecurityKey(
                Convert.FromBase64String(jwt["Key"]!)
            );
        var credentials = new SigningCredentials(
            key,
            SecurityAlgorithms.HmacSha256
        );
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, model.UserId.ToString()),
            new Claim(ClaimTypes.NameIdentifier,model.UserId.ToString()),
            new Claim(JwtRegisteredClaimNames.UniqueName,model.Username),
            new Claim(ClaimTypes.Name,model.Username),
            new Claim(ClaimTypes.Role,model.Role)
       };
        var token = new JwtSecurityToken(
         issuer: jwt["Issuer"],
         audience: jwt["Audience"],
         claims: claims,
         expires: DateTime.UtcNow.AddMinutes(
             Convert.ToDouble(jwt["ExpireMinutes"] ?? "60")),
        signingCredentials: credentials
        );
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}