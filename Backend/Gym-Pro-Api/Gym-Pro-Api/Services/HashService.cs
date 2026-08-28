using System.Net.Sockets;
using System.Runtime.Intrinsics.Arm;
using System.Security.Cryptography;
using System.Text;
using Apı.Model;
namespace Apı.Service
{
    public class HashService
    {
        public static string Hash(HashModel model)
        {
            using(SHA256 sha256= SHA256.Create())
            {
                string combined=model.Password+model.Salt;
                byte[] bytes =Encoding.UTF8.GetBytes(combined);
                byte[] hashbytes=sha256.ComputeHash(bytes);
                return Convert.ToBase64String(hashbytes);
            }
        }
        public static string GenerateSalt()
        {
            byte[] saltBytes =new byte[16];
            using (var rng=RandomNumberGenerator.Create())
            {
                rng.GetBytes(saltBytes);
            }
            return Convert.ToBase64String(saltBytes);
        }
    }
}