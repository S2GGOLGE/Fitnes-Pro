using Apı.Helpers;
using Apı.Model;
using Apı.Service;
using Microsoft.Data.SqlClient;
namespace Apı.Service.Authentication;

public class RegisterService
{
    private readonly string _connectionString;
    public RegisterService(string connectionService)
    {
        _connectionString = connectionService;
    }
    public async Task<ApiResponseModel> RegisterAsync(RegisterModel model)
    {
        //Boş Alan Kontrolü
        var validationError = EmptyspaceHelpers.Validate(model);
        if (validationError != null)
        {
            return ApiResponseModel.Fail(validationError);
        }
        //Username ve Email Kontrol
        const string ckekUserQuery = "SELECT COUNT(1) FROM Users WHERE Username =@Username Or Email=@Email";
        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync();
        await using (var checkCommand = new SqlCommand(ckekUserQuery, connection))
        {
            checkCommand.Parameters.AddWithValue("@Username", model.Username);
            checkCommand.Parameters.AddWithValue("@Email", model.Email);
            var userExists = Convert.ToInt32(await checkCommand.ExecuteScalarAsync());
            if (userExists > 0)
            {
                return ApiResponseModel.Fail("Kullanıcı Adı Yada Email Dolu Başka bir ad deneyin");
            }
            //Şifre Kontrolü
            if (model.Password != model.PasswordRepeat)
            {
                return ApiResponseModel.Fail("Şifreler Eşleşmiyor Kontrol Edin");
            }
            //Password Hash-Salt
            var salt = HashService.GenerateSalt();
            var HashModel = new HashModel
            {
                Password = model.Password,
                Salt = salt
            };
            var passwordhash = HashService.Hash(HashModel);
            //Kullanıcı Kaydı
            const string insertUserQuery = """
            INSERT INTO Users
            (
                Name,
                Surname,
                Username,
                Email,
                PasswordHash,
                Salt,
                CreatedAt
            )
            OUTPUT INSERTED.Id
            VALUES
            (
                @Name,
                @Surname,
                @Username,
                @Email,
                @PasswordHash,
                @Salt,
                GETUTCDATE()
            )
            """;
            int userıd;
            await using (var command=new SqlCommand(insertUserQuery,connection))
            {
                command.Parameters.AddWithValue("@Name",model.Name);
                command.Parameters.AddWithValue("@Surname",model.Surname);
                command.Parameters.AddWithValue("@Username",model.Username);
                command.Parameters.AddWithValue("@Email",model.Email);
                command.Parameters.AddWithValue("@PasswordHash",passwordhash);
                command.Parameters.AddWithValue("@Salt",salt);
                userıd=Convert.ToInt32(await command.ExecuteScalarAsync());
            }
            //Varsayılan User rolunu Oluştur
            const string insertRoleQuery=
            """
            INSERT INTO Roles
            (
                UserId,
                RoleName
            )
            VALUES
            (
                @UserId,
                @RoleName
            )
            """;
            await using (var rolecommand=new SqlCommand(insertRoleQuery,connection))
            {
                rolecommand.Parameters.AddWithValue("@UserId",userıd);
                rolecommand.Parameters.AddWithValue("@RoleName","User");
            }
            return ApiResponseModel.Ok("Kayıt Başarılı");
        }
    }
}