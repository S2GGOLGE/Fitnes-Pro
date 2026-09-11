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

                // ADIM 5: BannedUsers tablosu (kalıcı banlı hesaplar)
                await EnsureBannedUsersTableAsync(connection);

                // ADIM 6: BanAppeals tablosu (ban kaldırma talepleri)
                await EnsureBanAppealsTableAsync(connection);
                // ADIM 7: SystemLogs tablosu
                await EnsureSystemLogsTableAsync(connection);

                // ADIM 8: UserLogs tablosu
                await EnsureUserLogsTableAsync(connection);

                // ADIM 9: AppealLogs tablosu
                await EnsureAppealLogsTableAsync(connection);

                // ADIM 10: AdminLogs tablosu
                await EnsureAdminLogsTableAsync(connection);

                // ADIM 11: GeneralLogs tablosu
                await EnsureGeneralLogsTableAsync(connection);
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
                        [Level]        NVARCHAR(20)    NOT NULL
                            CONSTRAINT [DF_Users_Level] DEFAULT N'Acemi',
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

            // 7) Level (Rol sisteminden bağımsız fitness seviyesi).
            //    Mevcut kayıtlar default 'Acemi' ile dolar; sonradan değiştirilemez
            //    (bu initializer yalnızca şema migration yapar).
            if (!await ColumnExistsAsync(connection, "Users", "Level"))
            {
                const string addSql = @"
                    ALTER TABLE [dbo].[Users]
                    ADD [Level] NVARCHAR(20) NOT NULL
                    CONSTRAINT [DF_Users_Level] DEFAULT N'Acemi';
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

        // -------------------------------------------------------------------
        // 5) BANNED USERS TABLOSU
        //    Kalıcı olarak banlanmış hesapları tutar.
        //    Backend restart'ta bu tablodan hydrate edilir.
        // -------------------------------------------------------------------
        private static async Task EnsureBannedUsersTableAsync(SqlConnection connection)
        {
            if (await TableExistsAsync(connection, "BannedUsers"))
            {
                return;
            }

            const string createBannedUsersSql = @"
                CREATE TABLE [dbo].[BannedUsers]
                (
                    [Username]   NVARCHAR(100) NOT NULL,
                    [BannedAt]   DATETIME2     NOT NULL,
                    [Reason]     NVARCHAR(255) NULL,
                    CONSTRAINT [PK_BannedUsers] PRIMARY KEY CLUSTERED ([Username] ASC)
                );
            ";

            using (var command = new SqlCommand(createBannedUsersSql, connection))
            {
                await command.ExecuteNonQueryAsync();
            }
        }

        // -------------------------------------------------------------------
        // 6) BAN APPEALS TABLOSU
        //    Kullanıcı ban kaldırma talepleri; admin onay/red işlemleri.
        //    (Username, Status) index'i: "bu kullanıcının pending appeal'i var mı?"
        //    ve "toplam kaç appeal gönderdi?" sorgularını hızlandırır.
        // -------------------------------------------------------------------
        private static async Task EnsureBanAppealsTableAsync(SqlConnection connection)
        {
            if (await TableExistsAsync(connection, "BanAppeals"))
            {
                return;
            }

            const string createBanAppealsSql = @"
                CREATE TABLE [dbo].[BanAppeals]
                (
                    [Id]         INT            IDENTITY(1, 1) NOT NULL,
                    [Username]   NVARCHAR(100)  NOT NULL,
                    [Message]    NVARCHAR(1000) NOT NULL,
                    [Status]     NVARCHAR(20)   NOT NULL
                        CONSTRAINT [DF_BanAppeals_Status] DEFAULT N'Pending',
                    [CreatedAt]  DATETIME2      NOT NULL,
                    [DecidedAt]  DATETIME2      NULL,
                    [DecidedBy]  NVARCHAR(100)  NULL,
                    [AdminNote]  NVARCHAR(500)  NULL,
                    CONSTRAINT [PK_BanAppeals] PRIMARY KEY CLUSTERED ([Id] ASC)
                );

                CREATE INDEX [IX_BanAppeals_Username_Status]
                    ON [dbo].[BanAppeals] ([Username], [Status]);
            ";

            using (var command = new SqlCommand(createBanAppealsSql, connection))
            {
                await command.ExecuteNonQueryAsync();
            }
        }
        // -------------------------------------------------------------------
        // 7) SYSTEM LOGS TABLOSU
        //    Sistem / backend kaynaklı olayları tutar.
        // -------------------------------------------------------------------
        private static async Task EnsureSystemLogsTableAsync(SqlConnection connection)
        {
            if (await TableExistsAsync(connection, "SystemLogs"))
            {
                return;
            }

            const string createSystemLogsSql = @"
        CREATE TABLE [dbo].[SystemLogs]
        (
            [Id]          INT IDENTITY(1, 1) NOT NULL,
            [Level]       NVARCHAR(20)  NOT NULL,
            [Action]      NVARCHAR(100) NOT NULL,
            [Message]     NVARCHAR(1000) NOT NULL,
            [Source]      NVARCHAR(100) NULL,
            [IpAddress]   NVARCHAR(45)  NULL,
            [CreatedAt]   DATETIME2     NOT NULL DEFAULT GETUTCDATE(),

            CONSTRAINT [PK_SystemLogs]
                PRIMARY KEY CLUSTERED ([Id] ASC)
        );

        CREATE INDEX [IX_SystemLogs_CreatedAt]
            ON [dbo].[SystemLogs] ([CreatedAt]);

        CREATE INDEX [IX_SystemLogs_Level]
            ON [dbo].[SystemLogs] ([Level]);
    ";

            using (var command = new SqlCommand(createSystemLogsSql, connection))
            {
                await command.ExecuteNonQueryAsync();
            }
        }


        // -------------------------------------------------------------------
        // 8) USER LOGS TABLOSU
        //    Kullanıcıların yaptığı işlemleri tutar.
        // -------------------------------------------------------------------
        private static async Task EnsureUserLogsTableAsync(SqlConnection connection)
        {
            if (await TableExistsAsync(connection, "UserLogs"))
            {
                return;
            }

            const string createUserLogsSql = @"
        CREATE TABLE [dbo].[UserLogs]
        (
            [Id]          INT IDENTITY(1, 1) NOT NULL,
            [UserId]      INT NULL,
            [Username]    NVARCHAR(100) NULL,
            [Action]      NVARCHAR(100) NOT NULL,
            [Message]     NVARCHAR(1000) NOT NULL,
            [IpAddress]   NVARCHAR(45) NULL,
            [CreatedAt]   DATETIME2 NOT NULL DEFAULT GETUTCDATE(),

            CONSTRAINT [PK_UserLogs]
                PRIMARY KEY CLUSTERED ([Id] ASC)
        );

        CREATE INDEX [IX_UserLogs_UserId]
            ON [dbo].[UserLogs] ([UserId]);

        CREATE INDEX [IX_UserLogs_Username]
            ON [dbo].[UserLogs] ([Username]);

        CREATE INDEX [IX_UserLogs_CreatedAt]
            ON [dbo].[UserLogs] ([CreatedAt]);
    ";

            using (var command = new SqlCommand(createUserLogsSql, connection))
            {
                await command.ExecuteNonQueryAsync();
            }
        }


        // -------------------------------------------------------------------
        // 9) APPEAL LOGS TABLOSU
        //    Ban başvuruları ve başvuru süreçlerini tutar.
        // -------------------------------------------------------------------
        private static async Task EnsureAppealLogsTableAsync(SqlConnection connection)
        {
            if (await TableExistsAsync(connection, "AppealLogs"))
            {
                return;
            }

            const string createAppealLogsSql = @"
        CREATE TABLE [dbo].[AppealLogs]
        (
            [Id]          INT IDENTITY(1, 1) NOT NULL,
            [AppealId]    INT NULL,
            [Username]    NVARCHAR(100) NULL,
            [Action]      NVARCHAR(100) NOT NULL,
            [Message]     NVARCHAR(1000) NOT NULL,
            [PerformedBy] NVARCHAR(100) NULL,
            [IpAddress]   NVARCHAR(45) NULL,
            [CreatedAt]   DATETIME2 NOT NULL DEFAULT GETUTCDATE(),

            CONSTRAINT [PK_AppealLogs]
                PRIMARY KEY CLUSTERED ([Id] ASC)
        );

        CREATE INDEX [IX_AppealLogs_AppealId]
            ON [dbo].[AppealLogs] ([AppealId]);

        CREATE INDEX [IX_AppealLogs_Username]
            ON [dbo].[AppealLogs] ([Username]);

        CREATE INDEX [IX_AppealLogs_CreatedAt]
            ON [dbo].[AppealLogs] ([CreatedAt]);
    ";

            using (var command = new SqlCommand(createAppealLogsSql, connection))
            {
                await command.ExecuteNonQueryAsync();
            }
        }


        // -------------------------------------------------------------------
        // 10) ADMIN LOGS TABLOSU
        //     Admin tarafından gerçekleştirilen işlemleri tutar.
        // -------------------------------------------------------------------
        private static async Task EnsureAdminLogsTableAsync(SqlConnection connection)
        {
            if (await TableExistsAsync(connection, "AdminLogs"))
            {
                return;
            }

            const string createAdminLogsSql = @"
        CREATE TABLE [dbo].[AdminLogs]
        (
            [Id]            INT IDENTITY(1, 1) NOT NULL,
            [AdminUsername] NVARCHAR(100) NOT NULL,
            [Action]        NVARCHAR(100) NOT NULL,
            [TargetUsername] NVARCHAR(100) NULL,
            [Message]       NVARCHAR(1000) NOT NULL,
            [IpAddress]     NVARCHAR(45) NULL,
            [CreatedAt]     DATETIME2 NOT NULL DEFAULT GETUTCDATE(),

            CONSTRAINT [PK_AdminLogs]
                PRIMARY KEY CLUSTERED ([Id] ASC)
        );

        CREATE INDEX [IX_AdminLogs_AdminUsername]
            ON [dbo].[AdminLogs] ([AdminUsername]);

        CREATE INDEX [IX_AdminLogs_TargetUsername]
            ON [dbo].[AdminLogs] ([TargetUsername]);

        CREATE INDEX [IX_AdminLogs_CreatedAt]
            ON [dbo].[AdminLogs] ([CreatedAt]);
    ";

            using (var command = new SqlCommand(createAdminLogsSql, connection))
            {
                await command.ExecuteNonQueryAsync();
            }
        }


        // -------------------------------------------------------------------
        // 11) GENERAL LOGS TABLOSU
        //     Diğer kategorilere girmeyen genel uygulama olaylarını tutar.
        // -------------------------------------------------------------------
        private static async Task EnsureGeneralLogsTableAsync(SqlConnection connection)
        {
            if (await TableExistsAsync(connection, "GeneralLogs"))
            {
                return;
            }

            const string createGeneralLogsSql = @"
        CREATE TABLE [dbo].[GeneralLogs]
        (
            [Id]          INT IDENTITY(1, 1) NOT NULL,
            [Category]    NVARCHAR(50) NOT NULL,
            [Action]      NVARCHAR(100) NOT NULL,
            [Message]     NVARCHAR(1000) NOT NULL,
            [Username]    NVARCHAR(100) NULL,
            [IpAddress]   NVARCHAR(45) NULL,
            [CreatedAt]   DATETIME2 NOT NULL DEFAULT GETUTCDATE(),

            CONSTRAINT [PK_GeneralLogs]
                PRIMARY KEY CLUSTERED ([Id] ASC)
        );

        CREATE INDEX [IX_GeneralLogs_Category]
            ON [dbo].[GeneralLogs] ([Category]);

        CREATE INDEX [IX_GeneralLogs_CreatedAt]
            ON [dbo].[GeneralLogs] ([CreatedAt]);
    ";

            using (var command = new SqlCommand(createGeneralLogsSql, connection))
            {
                await command.ExecuteNonQueryAsync();
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
