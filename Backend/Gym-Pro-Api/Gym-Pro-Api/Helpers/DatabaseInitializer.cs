using Microsoft.Data.SqlClient;

namespace Apı.Helpers
{
    /// <summary>
    /// Uygulama başlangıcında veritabanı ve temel tabloları (Users, Roles) hazırlar.
    /// Microsoft.Data.SqlClient kullanır; Entity Framework kullanmaz.
    /// Her restart'ta güvenli şekilde tekrar çalışabilir; mevcut veriler korunur.
    /// </summary>
    public static class DatabaseInitializer
    {
        // Master veritabanına bağlanıp "FitnesPro" adlı veritabanını oluşturmak için
        // bağlantı cümlesinden Initial Catalog kısmını çıkarıyoruz.
        private const string DatabaseName = "FitnesPro";

        /// <summary>
        /// Başlatma adımlarını sırayla çalıştırır.
        /// 1) Veritabanı var mı kontrol et, yoksa oluştur.
        /// 2) Users tablosu var mı kontrol et, yoksa oluştur.
        /// 3) Roles tablosu var mı kontrol et, yoksa oluştur.
        /// 4) Roles.UserId -> Users.Id foreign key constraint'i var mı kontrol et, yoksa oluştur.
        /// </summary>
        public static async Task InitializeAsync(string connectionString)
        {
            if (string.IsNullOrWhiteSpace(connectionString))
            {
                throw new ArgumentException(
                    "Connection string boş olamaz.", nameof(connectionString));
            }

            // ADIM 1: Veritabanını kontrol et, yoksa oluştur.
            await EnsureDatabaseAsync(connectionString);

            // Hedef veritabanına bağlanıp kalan adımları uygula.
            using (var connection = new SqlConnection(connectionString))
            {
                await connection.OpenAsync();

                // ADIM 2: Users tablosu
                await EnsureUsersTableAsync(connection);

                // ADIM 3: Roles tablosu
                await EnsureRolesTableAsync(connection);

                // ADIM 4: Roles -> Users foreign key
                await EnsureRolesUserIdForeignKeyAsync(connection);
            }
        }

        // -------------------------------------------------------------------
        // 1) VERİTABANI VAR MI? YOKSA OLUŞTUR.
        // -------------------------------------------------------------------
        private static async Task EnsureDatabaseAsync(string connectionString)
        {
            var masterConnectionString = BuildMasterConnectionString(connectionString);
            var databaseName = ExtractDatabaseName(connectionString) ?? DatabaseName;

            using (var masterConnection = new SqlConnection(masterConnectionString))
            {
                await masterConnection.OpenAsync();

                bool exists = await DatabaseExistsAsync(masterConnection, databaseName);
                if (!exists)
                {
                    // Veritabanı adı güvenli mi diye basit bir doğrulama.
                    ValidateDatabaseName(databaseName);

                    var createDbSql =
                        $"CREATE DATABASE [{databaseName}];";

                    using (var command = new SqlCommand(createDbSql, masterConnection))
                    {
                        await command.ExecuteNonQueryAsync();
                    }
                }
            }
        }

        private static async Task<bool> DatabaseExistsAsync(
            SqlConnection connection, string databaseName)
        {
            // sys.databases sistem kataloğundan kontrol ediyoruz.
            const string sql = "SELECT COUNT(*) FROM sys.databases WHERE name = @dbName;";

            using (var command = new SqlCommand(sql, connection))
            {
                command.Parameters.AddWithValue("@dbName", databaseName);
                var result = await command.ExecuteScalarAsync();
                return result is int count && count > 0;
            }
        }

        // -------------------------------------------------------------------
        // 2) USERS TABLOSU
        // -------------------------------------------------------------------
        private static async Task EnsureUsersTableAsync(SqlConnection connection)
        {
            if (await TableExistsAsync(connection, "Users"))
            {
                return;
            }

            const string createUsersSql = @"
                CREATE TABLE [dbo].[Users]
                (
                    [Id]        INT             IDENTITY(1, 1) NOT NULL,
                    [Username]  NVARCHAR(100)   NOT NULL,
                    [Password]  NVARCHAR(255)   NOT NULL,
                    CONSTRAINT [PK_Users] PRIMARY KEY CLUSTERED ([Id] ASC),
                    CONSTRAINT [UQ_Users_Username] UNIQUE ([Username])
                );
            ";

            using (var command = new SqlCommand(createUsersSql, connection))
            {
                await command.ExecuteNonQueryAsync();
            }
        }

        // -------------------------------------------------------------------
        // 3) ROLES TABLOSU
        // -------------------------------------------------------------------
        private static async Task EnsureRolesTableAsync(SqlConnection connection)
        {
            if (await TableExistsAsync(connection, "Roles"))
            {
                return;
            }

            // Roles tablosu Users tablosundan sonra oluşturulur.
            // UserId kolonu NULL olamaz; unique constraint ile aynı kullanıcıya
            // aynı rolün iki kez atanması engellenir.
            const string createRolesSql = @"
                CREATE TABLE [dbo].[Roles]
                (
                    [Id]        INT            IDENTITY(1, 1) NOT NULL,
                    [UserId]    INT            NOT NULL,
                    [RoleName]  NVARCHAR(50)   NOT NULL,
                    CONSTRAINT [PK_Roles] PRIMARY KEY CLUSTERED ([Id] ASC),
                    CONSTRAINT [UQ_Roles_UserId_RoleName] UNIQUE ([UserId], [RoleName])
                );
            ";

            using (var command = new SqlCommand(createRolesSql, connection))
            {
                await command.ExecuteNonQueryAsync();
            }
        }

        // -------------------------------------------------------------------
        // 4) FOREIGN KEY: Roles.UserId -> Users.Id (ON DELETE CASCADE)
        // -------------------------------------------------------------------
        private static async Task EnsureRolesUserIdForeignKeyAsync(SqlConnection connection)
        {
            if (await ForeignKeyExistsAsync(connection, "FK_Roles_Users_UserId"))
            {
                return;
            }

            // Roles tablosu Users tablosuna bağımlı; her iki tablo da
            // daha önce oluşturulmuş olmalı.
            const string createFkSql = @"
                ALTER TABLE [dbo].[Roles]
                ADD CONSTRAINT [FK_Roles_Users_UserId]
                FOREIGN KEY ([UserId])
                REFERENCES [dbo].[Users]([Id])
                ON DELETE CASCADE;
            ";

            using (var command = new SqlCommand(createFkSql, connection))
            {
                await command.ExecuteNonQueryAsync();
            }
        }

        // -------------------------------------------------------------------
        // YARDIMCI METOTLAR
        // -------------------------------------------------------------------

        private static async Task<bool> TableExistsAsync(
            SqlConnection connection, string tableName)
        {
            const string sql = @"
                SELECT COUNT(*)
                FROM sys.tables
                WHERE name = @tableName
                  AND schema_id = SCHEMA_ID('dbo');
            ";

            using (var command = new SqlCommand(sql, connection))
            {
                command.Parameters.AddWithValue("@tableName", tableName);
                var result = await command.ExecuteScalarAsync();
                return result is int count && count > 0;
            }
        }

        private static async Task<bool> ForeignKeyExistsAsync(
            SqlConnection connection, string foreignKeyName)
        {
            const string sql = @"
                SELECT COUNT(*)
                FROM sys.foreign_keys
                WHERE name = @fkName
                  AND parent_object_id = OBJECT_ID(N'dbo.Roles');
            ";

            using (var command = new SqlCommand(sql, connection))
            {
                command.Parameters.AddWithValue("@fkName", foreignKeyName);
                var result = await command.ExecuteScalarAsync();
                return result is int count && count > 0;
            }
        }

        /// <summary>
        /// Verilen connection string'ten Initial Catalog değerini çıkarır.
        /// Bulamazsa varsayılan DatabaseName döner.
        /// </summary>
        private static string? ExtractDatabaseName(string connectionString)
        {
            var builder = new SqlConnectionStringBuilder(connectionString);
            return string.IsNullOrWhiteSpace(builder.InitialCatalog)
                ? null
                : builder.InitialCatalog;
        }

        /// <summary>
        /// Master veritabanına bağlanmak için connection string üretir.
        /// Initial Catalog bilinçli olarak kaldırılır; server adı korunur.
        /// </summary>
        private static string BuildMasterConnectionString(string connectionString)
        {
            var builder = new SqlConnectionStringBuilder(connectionString)
            {
                InitialCatalog = "master"
            };
            return builder.ConnectionString;
        }

        /// <summary>
        /// Veritabanı adının yalnızca güvenli karakterler içerdiğinden emin olur.
        /// SQL injection'a karşı temel bir önlem; SQL Server kurallarına uygunluk.
        /// </summary>
        private static void ValidateDatabaseName(string databaseName)
        {
            foreach (var c in databaseName)
            {
                if (!char.IsLetterOrDigit(c) && c != '_' && c != '-')
                {
                    throw new InvalidOperationException(
                        $"Geçersiz veritabanı adı: '{databaseName}'.");
                }
            }
        }
    }
}
