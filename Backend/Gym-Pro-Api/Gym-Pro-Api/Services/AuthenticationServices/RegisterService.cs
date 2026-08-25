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
        // 1. Boş Alan Kontrolü
        var validationError = EmptyspaceHelpers.Validate(model);
        if (validationError != null)
        {
            return ApiResponseModel.Fail(validationError);
        }

        // 2. Şifre Eşleşme Kontrolü
        if (model.Password != model.PasswordRepeat)
        {
            return ApiResponseModel.Fail("Şifreler Eşleşmiyor Kontrol Edin");
        }

        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync();

        // 3. Username ve Email Kontrolü
        const string checkUserQuery = "SELECT COUNT(1) FROM Users WHERE Username = @Username OR Email = @Email";
        await using (var checkCommand = new SqlCommand(checkUserQuery, connection))
        {
            checkCommand.Parameters.AddWithValue("@Username", model.Username);
            checkCommand.Parameters.AddWithValue("@Email", model.Email);
            var userExists = Convert.ToInt32(await checkCommand.ExecuteScalarAsync());
            if (userExists > 0)
            {
                return ApiResponseModel.Fail("Kullanıcı Adı Yada Email Dolu Başka bir ad deneyin");
            }
        }

        // 4. Password Hash ve Salt Üretimi (Plaintext password DB'ye yazılmaz)
        var salt = HashService.GenerateSalt();
        var hashModel = new HashModel
        {
            Password = model.Password,
            Salt = salt
        };
        var passwordHash = HashService.Hash(hashModel);

        // 5. Transaction ile Kullanıcı ve Rol Kaydı
        await using var transaction = (SqlTransaction)await connection.BeginTransactionAsync();

        try
        {
            // Kullanıcı Kaydı
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

            int userId;
            await using (var command = new SqlCommand(insertUserQuery, connection, transaction))
            {
                command.Parameters.AddWithValue("@Name", model.Name);
                command.Parameters.AddWithValue("@Surname", model.Surname);
                command.Parameters.AddWithValue("@Username", model.Username);
                command.Parameters.AddWithValue("@Email", model.Email);
                command.Parameters.AddWithValue("@PasswordHash", passwordHash);
                command.Parameters.AddWithValue("@Salt", salt);

                userId = Convert.ToInt32(await command.ExecuteScalarAsync());
            }

            // Varsayılan User Rolünü Oluştur
            const string insertRoleQuery = """
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

            await using (var roleCommand = new SqlCommand(insertRoleQuery, connection, transaction))
            {
                roleCommand.Parameters.AddWithValue("@UserId", userId);
                roleCommand.Parameters.AddWithValue("@RoleName", "User");
                await roleCommand.ExecuteNonQueryAsync();
            }

            await transaction.CommitAsync();
            return ApiResponseModel.Ok("Kayıt Başarılı");
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }
}