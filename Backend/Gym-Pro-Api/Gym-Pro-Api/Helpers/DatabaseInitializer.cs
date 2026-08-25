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
            if (!await TableExistsAsync(connection, "Users"))
            {
                const string createUsersSql = @"
                    CREATE TABLE [dbo].[Users]
                    (
                        [Id]           INT             IDENTITY(1, 1) NOT NULL,
                        [Name]         NVARCHAR(100)   NOT NULL,
                        [Surname]      NVARCHAR(100)   NOT NULL,
                        [Username]     NVARCHAR(100)   NOT NULL,
                        [Email]        NVARCHAR(255)   NOT NULL,
                        [PasswordHash] NVARCHAR(255)   NOT NULL,
                        [Salt]         NVARCHAR(255)   NOT NULL,
                        [CreatedAt]    DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
                        CONSTRAINT [PK_Users] PRIMARY KEY CLUSTERED ([Id] ASC),
                        CONSTRAINT [UQ_Users_Username] UNIQUE ([Username]),
                        CONSTRAINT [UQ_Users_Email] UNIQUE ([Email])
                    );
                ";

                using (var command = new SqlCommand(createUsersSql, connection))
                {
                    await command.ExecuteNonQueryAsync();
                }
                return;
            }

            // ---------------------------------------------------------------
            // TABLO ZATEN MEVCUTSA: Eksik kolonları ALTER TABLE ile ekle
            // ---------------------------------------------------------------

            // 1) Name
            if (!await ColumnExistsAsync(connection, "Users", "Name"))
            {
                const string addSql = @"
                    ALTER TABLE [dbo].[Users]
                    ADD [Name] NVARCHAR(100) NOT NULL CONSTRAINT [DF_Users_Name] DEFAULT '';
                ";
                using var cmd = new SqlCommand(addSql, connection);
                await cmd.ExecuteNonQueryAsync();
            }

            // 2) Surname
            if (!await ColumnExistsAsync(connection, "Users", "Surname"))
            {
                const string addSql = @"
                    ALTER TABLE [dbo].[Users]
                    ADD [Surname] NVARCHAR(100) NOT NULL CONSTRAINT [DF_Users_Surname] DEFAULT '';
                ";
                using var cmd = new SqlCommand(addSql, connection);
                await cmd.ExecuteNonQueryAsync();
            }

            // 3) Email
            if (!await ColumnExistsAsync(connection, "Users", "Email"))
            {
                const string addSql = @"
                    ALTER TABLE [dbo].[Users]
                    ADD [Email] NVARCHAR(255) NOT NULL CONSTRAINT [DF_Users_Email] DEFAULT '';
                ";
                using (var cmd = new SqlCommand(addSql, connection))
                {
                    await cmd.ExecuteNonQueryAsync();
                }

                // Mevcut kayıtlar varsa boş Email yerine unique fallback ata
                const string updateEmailSql = @"
                    UPDATE [dbo].[Users]
                    SET [Email] = [Username] + '@fitnesspro.local'
                    WHERE [Email] = '' OR [Email] IS NULL;
                ";
                using (var cmd = new SqlCommand(updateEmailSql, connection))
                {
                    await cmd.ExecuteNonQueryAsync();
                }
            }

            // 4) PasswordHash
            if (!await ColumnExistsAsync(connection, "Users", "PasswordHash"))
            {
                const string addSql = @"
                    ALTER TABLE [dbo].[Users]
                    ADD [PasswordHash] NVARCHAR(255) NOT NULL CONSTRAINT [DF_Users_PasswordHash] DEFAULT '';
                ";
                using (var cmd = new SqlCommand(addSql, connection))
                {
                    await cmd.ExecuteNonQueryAsync();
                }

                // Eski Password kolonu varsa mevcut veriyi PasswordHash'e aktar
                if (await ColumnExistsAsync(connection, "Users", "Password"))
                {
                    const string migratePasswordSql = @"
                        UPDATE [dbo].[Users]
                        SET [PasswordHash] = [Password]
                        WHERE ([PasswordHash] = '' OR [PasswordHash] IS NULL)
                          AND [Password] IS NOT NULL AND [Password] <> '';
                    ";
                    using var cmd = new SqlCommand(migratePasswordSql, connection);
                    await cmd.ExecuteNonQueryAsync();
                }
            }

            // 5) Salt
            if (!await ColumnExistsAsync(connection, "Users", "Salt"))
            {
                const string addSql = @"
                    ALTER TABLE [dbo].[Users]
                    ADD [Salt] NVARCHAR(255) NOT NULL CONSTRAINT [DF_Users_Salt] DEFAULT '';
                ";
                using var cmd = new SqlCommand(addSql, connection);
                await cmd.ExecuteNonQueryAsync();
            }

            // 6) Eski Password kolonunu güvenli şekilde kaldır (Plaintext password tutulmaz)
            if (await ColumnExistsAsync(connection, "Users", "Password"))
            {
                // Varsa Password üzerindeki default constraint'leri temizle ve kolonu kaldır
                const string dropPasswordColumnSql = @"
                    DECLARE @sql NVARCHAR(MAX) = N'';
                    SELECT @sql += N'ALTER TABLE [dbo].[Users] DROP CONSTRAINT [' + name + N']; '
                    FROM sys.default_constraints
                    WHERE parent_object_id = OBJECT_ID(N'dbo.Users')
                      AND parent_column_id = COLUMNPROPERTY(OBJECT_ID(N'dbo.Users'), 'Password', 'ColumnId');

                    IF @sql <> N''
                        EXEC sp_executesql @sql;

                    ALTER TABLE [dbo].[Users] DROP COLUMN [Password];
                ";
                using var cmd = new SqlCommand(dropPasswordColumnSql, connection);
                await cmd.ExecuteNonQueryAsync();
            }

            // 6) CreatedAt
            if (!await ColumnExistsAsync(connection, "Users", "CreatedAt"))
            {
                const string addSql = @"
                    ALTER TABLE [dbo].[Users]
                    ADD [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_Users_CreatedAt] DEFAULT GETUTCDATE();
                ";
                using var cmd = new SqlCommand(addSql, connection);
                await cmd.ExecuteNonQueryAsync();
            }

            // ---------------------------------------------------------------
            // UNIQUE CONSTRAINT KONTROLLERİ
            // ---------------------------------------------------------------

            // Username UNIQUE
            if (!await UniqueConstraintOrIndexExistsAsync(connection, "Users", "UQ_Users_Username"))
            {
                bool hasDuplicates = await HasDuplicateValuesAsync(connection, "Users", "Username");
                if (!hasDuplicates)
                {
                    const string addConstraintSql = @"
                        ALTER TABLE [dbo].[Users]
                        ADD CONSTRAINT [UQ_Users_Username] UNIQUE ([Username]);
                    ";
                    using var cmd = new SqlCommand(addConstraintSql, connection);
                    await cmd.ExecuteNonQueryAsync();
                }
            }

            // Email UNIQUE
            if (!await UniqueConstraintOrIndexExistsAsync(connection, "Users", "UQ_Users_Email"))
            {
                bool hasDuplicates = await HasDuplicateValuesAsync(connection, "Users", "Email");
                if (!hasDuplicates)
                {
                    const string addConstraintSql = @"
                        ALTER TABLE [dbo].[Users]
                        ADD CONSTRAINT [UQ_Users_Email] UNIQUE ([Email]);
                    ";
                    using var cmd = new SqlCommand(addConstraintSql, connection);
                    await cmd.ExecuteNonQueryAsync();
                }
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

        private static async Task<bool> ColumnExistsAsync(
            SqlConnection connection, string tableName, string columnName)
        {
            const string sql = @"
                SELECT COUNT(*)
                FROM sys.columns c
                JOIN sys.tables t ON c.object_id = t.object_id
                WHERE t.name = @tableName
                  AND t.schema_id = SCHEMA_ID('dbo')
                  AND c.name = @columnName;
            ";

            using (var command = new SqlCommand(sql, connection))
            {
                command.Parameters.AddWithValue("@tableName", tableName);
                command.Parameters.AddWithValue("@columnName", columnName);
                var result = await command.ExecuteScalarAsync();
                return result is int count && count > 0;
            }
        }

        private static async Task<bool> UniqueConstraintOrIndexExistsAsync(
            SqlConnection connection, string tableName, string indexOrConstraintName)
        {
            const string sql = @"
                SELECT COUNT(*)
                FROM sys.indexes i
                JOIN sys.tables t ON i.object_id = t.object_id
                WHERE t.name = @tableName
                  AND t.schema_id = SCHEMA_ID('dbo')
                  AND i.name = @name;
            ";

            using (var command = new SqlCommand(sql, connection))
            {
                command.Parameters.AddWithValue("@tableName", tableName);
                command.Parameters.AddWithValue("@name", indexOrConstraintName);
                var result = await command.ExecuteScalarAsync();
                return result is int count && count > 0;
            }
        }

        private static async Task<bool> HasDuplicateValuesAsync(
            SqlConnection connection, string tableName, string columnName)
        {
            if (tableName != "Users" && tableName != "Roles")
                throw new ArgumentException("Invalid table name", nameof(tableName));
            if (columnName != "Username" && columnName != "Email")
                throw new ArgumentException("Invalid column name", nameof(columnName));

            string sql = $@"
                SELECT COUNT(*)
                FROM (
                    SELECT [{columnName}]
                    FROM [dbo].[{tableName}]
                    WHERE [{columnName}] IS NOT NULL AND [{columnName}] <> ''
                    GROUP BY [{columnName}]
                    HAVING COUNT(*) > 1
                ) AS Duplicates;
            ";

            using (var command = new SqlCommand(sql, connection))
            {
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
