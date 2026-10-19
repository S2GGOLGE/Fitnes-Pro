using Microsoft.Data.SqlClient;

namespace Apı.Helpers
{
    /// <summary>
    /// Uygulama başlangıcında veritabanı ve temel tabloları hazırlar.
    /// Microsoft.Data.SqlClient kullanır; Entity Framework kullanmaz.
    /// Her restart'ta güvenli şekilde tekrar çalışabilir; mevcut veriler korunur.
    /// </summary>
    public static class DatabaseInitializer
    {
        private const string DatabaseName = "FitnesPro";

        /// <summary>
        /// Başlatma adımlarını sırayla çalıştırır.
        /// </summary>
        public static async Task InitializeAsync(string connectionString)
        {
            if (string.IsNullOrWhiteSpace(connectionString))
            {
                throw new ArgumentException(
                    "Connection string boş olamaz.",
                    nameof(connectionString));
            }

            // ADIM 1: Veritabanını kontrol et, yoksa oluştur.
            await EnsureDatabaseAsync(connectionString);

            using (var connection = new SqlConnection(connectionString))
            {
                await connection.OpenAsync();

                // ADIM 2: Users tablosu
                await EnsureUsersTableAsync(connection);

                // ADIM 2.1: Users.EmailVerified kolonu (e-posta doğrulama durumu)
                await EnsureUsersEmailVerifiedColumnAsync(connection);

                // ADIM 3: Roles tablosu
                await EnsureRolesTableAsync(connection);

                // ADIM 4: Roles -> Users foreign key
                await EnsureRolesUserIdForeignKeyAsync(connection);

                // ADIM 5: BannedUsers tablosu
                await EnsureBannedUsersTableAsync(connection);

                // ADIM 6: BanAppeals tablosu
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

                // ADIM 12: UserTwoFactorSettings tablosu
                await EnsureUserTwoFactorSettingsTableAsync(connection);

                // ADIM 13: TwoFactorCodes tablosu
                await EnsureTwoFactorCodesTableAsync(connection);
                // ADIM 14 Friends Tablosu
                await EnsureFriendsTableAsync(connection);
                //ADIMN 15: FriendRequests Tablosu
                await EnsureFriendRequestsTableAsync(connection);
                // ADIM 16: UserPrivacySettings tablosu
                await EnsureUserPrivacySettingsTableAsync(connection);

                // ADIM 17: MessageRequests tablosu
                await EnsureMessageRequestsTableAsync(connection);
                // ADIM 18: Messages tablosu
                await EnsureMessagesTableAsync(connection);
                // ADIM 19: UserLocations tablosu
                await EnsureUserLocationsTableAsync(connection);
                // ADIM 20: UserThemeSettings tablosu
                await EnsureUserThemeSettingsTableAsync(connection);
            }
        }

        // -------------------------------------------------------------------
        // 1) VERİTABANI
        // -------------------------------------------------------------------

        private static async Task EnsureDatabaseAsync(
    string connectionString)
        {
            var masterConnectionString =
                BuildMasterConnectionString(connectionString);

            var databaseName =
                ExtractDatabaseName(connectionString) ?? DatabaseName;

            using var masterConnection =
                new SqlConnection(masterConnectionString);

            await masterConnection.OpenAsync();

            bool exists =
                await DatabaseExistsAsync(
                    masterConnection,
                    databaseName);

            if (exists)
                return;

            ValidateDatabaseName(databaseName);

            string createDatabaseSql =
                $"CREATE DATABASE [{databaseName}];";

            using var command =
                new SqlCommand(
                    createDatabaseSql,
                    masterConnection);

            await command.ExecuteNonQueryAsync();
        }
        private static async Task<bool> DatabaseExistsAsync(
            SqlConnection connection,
            string databaseName)
        {
            const string sql = """
                SELECT COUNT(*)
                FROM sys.databases
                WHERE name = @dbName;
                """;

            using var command =
                new SqlCommand(sql, connection);

            command.Parameters.AddWithValue(
                "@dbName",
                databaseName);

            var result =
                await command.ExecuteScalarAsync();

            return result is int count && count > 0;
        }

        // -------------------------------------------------------------------
        // 2) USERS
        // -------------------------------------------------------------------

        private static async Task EnsureUsersTableAsync(
            SqlConnection connection)
        {
            if (!await TableExistsAsync(connection, "Users"))
            {
                const string createUsersSql = """
                    CREATE TABLE [dbo].[Users]
                    (
                        [Id]
                            INT IDENTITY(1, 1) NOT NULL,

                        [Name]
                            NVARCHAR(100) NOT NULL,

                        [Surname]
                            NVARCHAR(100) NOT NULL,

                        [Username]
                            NVARCHAR(100) NOT NULL,

                        [Email]
                            NVARCHAR(255) NOT NULL,

                        [PasswordHash]
                            NVARCHAR(255) NOT NULL,

                        [Salt]
                            NVARCHAR(255) NOT NULL,

                        [Level]
                            NVARCHAR(20) NOT NULL
                            CONSTRAINT [DF_Users_Level]
                            DEFAULT N'Acemi',

                        [CreatedAt]
                            DATETIME2 NOT NULL
                            DEFAULT GETUTCDATE(),

                        CONSTRAINT [PK_Users]
                            PRIMARY KEY CLUSTERED ([Id] ASC),

                        CONSTRAINT [UQ_Users_Username]
                            UNIQUE ([Username]),

                        CONSTRAINT [UQ_Users_Email]
                            UNIQUE ([Email])
                    );
                    """;

                using var command =
                    new SqlCommand(
                        createUsersSql,
                        connection);

                await command.ExecuteNonQueryAsync();

                return;
            }

            // ---------------------------------------------------------------
            // TABLO ZATEN VARSA EKSİK KOLONLARI EKLE
            // ---------------------------------------------------------------

            // Name
            if (!await ColumnExistsAsync(
                connection,
                "Users",
                "Name"))
            {
                const string addSql = """
                    ALTER TABLE [dbo].[Users]
                    ADD [Name]
                        NVARCHAR(100)
                        NOT NULL
                        CONSTRAINT [DF_Users_Name]
                        DEFAULT '';
                    """;

                using var cmd =
                    new SqlCommand(addSql, connection);

                await cmd.ExecuteNonQueryAsync();
            }

            // Surname
            if (!await ColumnExistsAsync(
                connection,
                "Users",
                "Surname"))
            {
                const string addSql = """
                    ALTER TABLE [dbo].[Users]
                    ADD [Surname]
                        NVARCHAR(100)
                        NOT NULL
                        CONSTRAINT [DF_Users_Surname]
                        DEFAULT '';
                    """;

                using var cmd =
                    new SqlCommand(addSql, connection);

                await cmd.ExecuteNonQueryAsync();
            }

            // Email
            if (!await ColumnExistsAsync(
                connection,
                "Users",
                "Email"))
            {
                const string addSql = """
                    ALTER TABLE [dbo].[Users]
                    ADD [Email]
                        NVARCHAR(255)
                        NOT NULL
                        CONSTRAINT [DF_Users_Email]
                        DEFAULT '';
                    """;

                using (var cmd =
                    new SqlCommand(addSql, connection))
                {
                    await cmd.ExecuteNonQueryAsync();
                }

                const string updateEmailSql = """
                    UPDATE [dbo].[Users]
                    SET [Email] =
                        [Username] + '@fitnesspro.local'
                    WHERE [Email] = ''
                       OR [Email] IS NULL;
                    """;

                using var updateCmd =
                    new SqlCommand(
                        updateEmailSql,
                        connection);

                await updateCmd.ExecuteNonQueryAsync();
            }

            // PasswordHash
            if (!await ColumnExistsAsync(
                connection,
                "Users",
                "PasswordHash"))
            {
                const string addSql = """
                    ALTER TABLE [dbo].[Users]
                    ADD [PasswordHash]
                        NVARCHAR(255)
                        NOT NULL
                        CONSTRAINT [DF_Users_PasswordHash]
                        DEFAULT '';
                    """;

                using (var cmd =
                    new SqlCommand(addSql, connection))
                {
                    await cmd.ExecuteNonQueryAsync();
                }

                if (await ColumnExistsAsync(
                    connection,
                    "Users",
                    "Password"))
                {
                    const string migratePasswordSql = """
                        UPDATE [dbo].[Users]
                        SET [PasswordHash] = [Password]
                        WHERE ([PasswordHash] = ''
                           OR [PasswordHash] IS NULL)
                          AND [Password] IS NOT NULL
                          AND [Password] <> '';
                        """;

                    using var cmd =
                        new SqlCommand(
                            migratePasswordSql,
                            connection);

                    await cmd.ExecuteNonQueryAsync();
                }
            }

            // Salt
            if (!await ColumnExistsAsync(
                connection,
                "Users",
                "Salt"))
            {
                const string addSql = """
                    ALTER TABLE [dbo].[Users]
                    ADD [Salt]
                        NVARCHAR(255)
                        NOT NULL
                        CONSTRAINT [DF_Users_Salt]
                        DEFAULT '';
                    """;

                using var cmd =
                    new SqlCommand(addSql, connection);

                await cmd.ExecuteNonQueryAsync();
            }

            // Eski Password kolonunu kaldır
            if (await ColumnExistsAsync(
                connection,
                "Users",
                "Password"))
            {
                const string dropPasswordColumnSql = """
                    DECLARE @sql NVARCHAR(MAX) = N'';

                    SELECT @sql +=
                        N'ALTER TABLE [dbo].[Users] ' +
                        N'DROP CONSTRAINT [' + name + N']; '
                    FROM sys.default_constraints
                    WHERE parent_object_id =
                        OBJECT_ID(N'dbo.Users')
                      AND parent_column_id =
                        COLUMNPROPERTY(
                            OBJECT_ID(N'dbo.Users'),
                            'Password',
                            'ColumnId'
                        );

                    IF @sql <> N''
                        EXEC sp_executesql @sql;

                    ALTER TABLE [dbo].[Users]
                    DROP COLUMN [Password];
                    """;

                using var cmd =
                    new SqlCommand(
                        dropPasswordColumnSql,
                        connection);

                await cmd.ExecuteNonQueryAsync();
            }

            // CreatedAt
            if (!await ColumnExistsAsync(
                connection,
                "Users",
                "CreatedAt"))
            {
                const string addSql = """
                    ALTER TABLE [dbo].[Users]
                    ADD [CreatedAt]
                        DATETIME2
                        NOT NULL
                        CONSTRAINT [DF_Users_CreatedAt]
                        DEFAULT GETUTCDATE();
                    """;

                using var cmd =
                    new SqlCommand(addSql, connection);

                await cmd.ExecuteNonQueryAsync();
            }

            // Level
            if (!await ColumnExistsAsync(
                connection,
                "Users",
                "Level"))
            {
                const string addSql = """
                    ALTER TABLE [dbo].[Users]
                    ADD [Level]
                        NVARCHAR(20)
                        NOT NULL
                        CONSTRAINT [DF_Users_Level]
                        DEFAULT N'Acemi';
                    """;

                using var cmd =
                    new SqlCommand(addSql, connection);

                await cmd.ExecuteNonQueryAsync();
            }

            // ---------------------------------------------------------------
            // UNIQUE CONSTRAINTLER
            // ---------------------------------------------------------------

            if (!await UniqueConstraintOrIndexExistsAsync(
                connection,
                "Users",
                "UQ_Users_Username"))
            {
                bool hasDuplicates =
                    await HasDuplicateValuesAsync(
                        connection,
                        "Users",
                        "Username");

                if (!hasDuplicates)
                {
                    const string addConstraintSql = """
                        ALTER TABLE [dbo].[Users]
                        ADD CONSTRAINT [UQ_Users_Username]
                        UNIQUE ([Username]);
                        """;

                    using var cmd =
                        new SqlCommand(
                            addConstraintSql,
                            connection);

                    await cmd.ExecuteNonQueryAsync();
                }
            }

            if (!await UniqueConstraintOrIndexExistsAsync(
                connection,
                "Users",
                "UQ_Users_Email"))
            {
                bool hasDuplicates =
                    await HasDuplicateValuesAsync(
                        connection,
                        "Users",
                        "Email");

                if (!hasDuplicates)
                {
                    const string addConstraintSql = """
                        ALTER TABLE [dbo].[Users]
                        ADD CONSTRAINT [UQ_Users_Email]
                        UNIQUE ([Email]);
                        """;

                    using var cmd =
                        new SqlCommand(
                            addConstraintSql,
                            connection);

                    await cmd.ExecuteNonQueryAsync();
                }
            }
        }

        // -------------------------------------------------------------------
        // 2.1) USERS.EMAILVERIFIED
        // Mevcut kullanıcılar dahil tümü 0 (doğrulanmamış) olarak başlar;
        // ilk girişte e-posta doğrulama adımına yönlendirilirler.
        // -------------------------------------------------------------------

        private static async Task EnsureUsersEmailVerifiedColumnAsync(
            SqlConnection connection)
        {
            if (await ColumnExistsAsync(
                connection,
                "Users",
                "EmailVerified"))
            {
                return;
            }

            const string addSql = """
                ALTER TABLE [dbo].[Users]
                ADD [EmailVerified]
                    BIT
                    NOT NULL
                    CONSTRAINT [DF_Users_EmailVerified]
                    DEFAULT 0;
                """;

            using var cmd = new SqlCommand(addSql, connection);

            await cmd.ExecuteNonQueryAsync();
        }

        // -------------------------------------------------------------------
        // 3) ROLES
        // -------------------------------------------------------------------

        private static async Task EnsureRolesTableAsync(
            SqlConnection connection)
        {
            if (await TableExistsAsync(connection, "Roles"))
            {
                return;
            }

            const string createRolesSql = """
                CREATE TABLE [dbo].[Roles]
                (
                    [Id]
                        INT IDENTITY(1, 1) NOT NULL,

                    [UserId]
                        INT NOT NULL,

                    [RoleName]
                        NVARCHAR(50) NOT NULL,

                    CONSTRAINT [PK_Roles]
                        PRIMARY KEY CLUSTERED ([Id] ASC),

                    CONSTRAINT [UQ_Roles_UserId_RoleName]
                        UNIQUE ([UserId], [RoleName])
                );
                """;

            using var command =
                new SqlCommand(
                    createRolesSql,
                    connection);

            await command.ExecuteNonQueryAsync();
        }

        // -------------------------------------------------------------------
        // 4) ROLES -> USERS FOREIGN KEY
        // -------------------------------------------------------------------

        private static async Task EnsureRolesUserIdForeignKeyAsync(
            SqlConnection connection)
        {
            if (await ForeignKeyExistsAsync(
                connection,
                "FK_Roles_Users_UserId"))
            {
                return;
            }

            const string createFkSql = """
                ALTER TABLE [dbo].[Roles]
                ADD CONSTRAINT [FK_Roles_Users_UserId]
                FOREIGN KEY ([UserId])
                REFERENCES [dbo].[Users]([Id])
                ON DELETE CASCADE;
                """;

            using var command =
                new SqlCommand(
                    createFkSql,
                    connection);

            await command.ExecuteNonQueryAsync();
        }

        // -------------------------------------------------------------------
        // 5) BANNED USERS
        // -------------------------------------------------------------------

        private static async Task EnsureBannedUsersTableAsync(
            SqlConnection connection)
        {
            if (await TableExistsAsync(
                connection,
                "BannedUsers"))
            {
                return;
            }

            const string createBannedUsersSql = """
                CREATE TABLE [dbo].[BannedUsers]
                (
                    [Username]
                        NVARCHAR(100) NOT NULL,

                    [BannedAt]
                        DATETIME2 NOT NULL,

                    [Reason]
                        NVARCHAR(255) NULL,

                    CONSTRAINT [PK_BannedUsers]
                        PRIMARY KEY CLUSTERED ([Username] ASC)
                );
                """;

            using var command =
                new SqlCommand(
                    createBannedUsersSql,
                    connection);

            await command.ExecuteNonQueryAsync();
        }

        // -------------------------------------------------------------------
        // 6) BAN APPEALS
        // -------------------------------------------------------------------

        private static async Task EnsureBanAppealsTableAsync(
            SqlConnection connection)
        {
            if (await TableExistsAsync(
                connection,
                "BanAppeals"))
            {
                return;
            }

            const string createBanAppealsSql = """
                CREATE TABLE [dbo].[BanAppeals]
                (
                    [Id]
                        INT IDENTITY(1, 1) NOT NULL,

                    [Username]
                        NVARCHAR(100) NOT NULL,

                    [Message]
                        NVARCHAR(1000) NOT NULL,

                    [Status]
                        NVARCHAR(20) NOT NULL
                        CONSTRAINT [DF_BanAppeals_Status]
                        DEFAULT N'Pending',

                    [CreatedAt]
                        DATETIME2 NOT NULL,

                    [DecidedAt]
                        DATETIME2 NULL,

                    [DecidedBy]
                        NVARCHAR(100) NULL,

                    [AdminNote]
                        NVARCHAR(500) NULL,

                    CONSTRAINT [PK_BanAppeals]
                        PRIMARY KEY CLUSTERED ([Id] ASC)
                );

                CREATE INDEX [IX_BanAppeals_Username_Status]
                    ON [dbo].[BanAppeals]
                    ([Username], [Status]);
                """;

            using var command =
                new SqlCommand(
                    createBanAppealsSql,
                    connection);

            await command.ExecuteNonQueryAsync();
        }

        // -------------------------------------------------------------------
        // 7) SYSTEM LOGS
        // -------------------------------------------------------------------

        private static async Task EnsureSystemLogsTableAsync(
            SqlConnection connection)
        {
            if (await TableExistsAsync(
                connection,
                "SystemLogs"))
            {
                return;
            }

            const string createSystemLogsSql = """
                CREATE TABLE [dbo].[SystemLogs]
                (
                    [Id]
                        INT IDENTITY(1, 1) NOT NULL,

                    [Level]
                        NVARCHAR(20) NOT NULL,

                    [Action]
                        NVARCHAR(100) NOT NULL,

                    [Message]
                        NVARCHAR(1000) NOT NULL,

                    [Source]
                        NVARCHAR(100) NULL,

                    [IpAddress]
                        NVARCHAR(45) NULL,

                    [CreatedAt]
                        DATETIME2 NOT NULL
                        DEFAULT GETUTCDATE(),

                    CONSTRAINT [PK_SystemLogs]
                        PRIMARY KEY CLUSTERED ([Id] ASC)
                );

                CREATE INDEX [IX_SystemLogs_CreatedAt]
                    ON [dbo].[SystemLogs] ([CreatedAt]);

                CREATE INDEX [IX_SystemLogs_Level]
                    ON [dbo].[SystemLogs] ([Level]);
                """;

            using var command =
                new SqlCommand(
                    createSystemLogsSql,
                    connection);

            await command.ExecuteNonQueryAsync();
        }

        // -------------------------------------------------------------------
        // 8) USER LOGS
        // -------------------------------------------------------------------

        private static async Task EnsureUserLogsTableAsync(
            SqlConnection connection)
        {
            if (await TableExistsAsync(
                connection,
                "UserLogs"))
            {
                return;
            }

            const string createUserLogsSql = """
                CREATE TABLE [dbo].[UserLogs]
                (
                    [Id]
                        INT IDENTITY(1, 1) NOT NULL,

                    [UserId]
                        INT NULL,

                    [Username]
                        NVARCHAR(100) NULL,

                    [Action]
                        NVARCHAR(100) NOT NULL,

                    [Message]
                        NVARCHAR(1000) NOT NULL,

                    [IpAddress]
                        NVARCHAR(45) NULL,

                    [CreatedAt]
                        DATETIME2 NOT NULL
                        DEFAULT GETUTCDATE(),

                    CONSTRAINT [PK_UserLogs]
                        PRIMARY KEY CLUSTERED ([Id] ASC)
                );

                CREATE INDEX [IX_UserLogs_UserId]
                    ON [dbo].[UserLogs] ([UserId]);

                CREATE INDEX [IX_UserLogs_Username]
                    ON [dbo].[UserLogs] ([Username]);

                CREATE INDEX [IX_UserLogs_CreatedAt]
                    ON [dbo].[UserLogs] ([CreatedAt]);
                """;

            using var command =
                new SqlCommand(
                    createUserLogsSql,
                    connection);

            await command.ExecuteNonQueryAsync();
        }

        // -------------------------------------------------------------------
        // 9) APPEAL LOGS
        // -------------------------------------------------------------------

        private static async Task EnsureAppealLogsTableAsync(
            SqlConnection connection)
        {
            if (await TableExistsAsync(
                connection,
                "AppealLogs"))
            {
                return;
            }

            const string createAppealLogsSql = """
                CREATE TABLE [dbo].[AppealLogs]
                (
                    [Id]
                        INT IDENTITY(1, 1) NOT NULL,

                    [AppealId]
                        INT NULL,

                    [Username]
                        NVARCHAR(100) NULL,

                    [Action]
                        NVARCHAR(100) NOT NULL,

                    [Message]
                        NVARCHAR(1000) NOT NULL,

                    [PerformedBy]
                        NVARCHAR(100) NULL,

                    [IpAddress]
                        NVARCHAR(45) NULL,

                    [CreatedAt]
                        DATETIME2 NOT NULL
                        DEFAULT GETUTCDATE(),

                    CONSTRAINT [PK_AppealLogs]
                        PRIMARY KEY CLUSTERED ([Id] ASC)
                );

                CREATE INDEX [IX_AppealLogs_AppealId]
                    ON [dbo].[AppealLogs] ([AppealId]);

                CREATE INDEX [IX_AppealLogs_Username]
                    ON [dbo].[AppealLogs] ([Username]);

                CREATE INDEX [IX_AppealLogs_CreatedAt]
                    ON [dbo].[AppealLogs] ([CreatedAt]);
                """;

            using var command =
                new SqlCommand(
                    createAppealLogsSql,
                    connection);

            await command.ExecuteNonQueryAsync();
        }

        // -------------------------------------------------------------------
        // 10) ADMIN LOGS
        // -------------------------------------------------------------------

        private static async Task EnsureAdminLogsTableAsync(
            SqlConnection connection)
        {
            if (await TableExistsAsync(
                connection,
                "AdminLogs"))
            {
                return;
            }

            const string createAdminLogsSql = """
                CREATE TABLE [dbo].[AdminLogs]
                (
                    [Id]
                        INT IDENTITY(1, 1) NOT NULL,

                    [AdminUsername]
                        NVARCHAR(100) NOT NULL,

                    [Action]
                        NVARCHAR(100) NOT NULL,

                    [TargetUsername]
                        NVARCHAR(100) NULL,

                    [Message]
                        NVARCHAR(1000) NOT NULL,

                    [IpAddress]
                        NVARCHAR(45) NULL,

                    [CreatedAt]
                        DATETIME2 NOT NULL
                        DEFAULT GETUTCDATE(),

                    CONSTRAINT [PK_AdminLogs]
                        PRIMARY KEY CLUSTERED ([Id] ASC)
                );

                CREATE INDEX [IX_AdminLogs_AdminUsername]
                    ON [dbo].[AdminLogs] ([AdminUsername]);

                CREATE INDEX [IX_AdminLogs_TargetUsername]
                    ON [dbo].[AdminLogs] ([TargetUsername]);

                CREATE INDEX [IX_AdminLogs_CreatedAt]
                    ON [dbo].[AdminLogs] ([CreatedAt]);
                """;

            using var command =
                new SqlCommand(
                    createAdminLogsSql,
                    connection);

            await command.ExecuteNonQueryAsync();
        }

        // -------------------------------------------------------------------
        // 11) GENERAL LOGS
        // -------------------------------------------------------------------

        private static async Task EnsureGeneralLogsTableAsync(
            SqlConnection connection)
        {
            if (await TableExistsAsync(
                connection,
                "GeneralLogs"))
            {
                return;
            }

            const string createGeneralLogsSql = """
                CREATE TABLE [dbo].[GeneralLogs]
                (
                    [Id]
                        INT IDENTITY(1, 1) NOT NULL,

                    [Category]
                        NVARCHAR(50) NOT NULL,

                    [Action]
                        NVARCHAR(100) NOT NULL,

                    [Message]
                        NVARCHAR(1000) NOT NULL,

                    [Username]
                        NVARCHAR(100) NULL,

                    [IpAddress]
                        NVARCHAR(45) NULL,

                    [CreatedAt]
                        DATETIME2 NOT NULL
                        DEFAULT GETUTCDATE(),

                    CONSTRAINT [PK_GeneralLogs]
                        PRIMARY KEY CLUSTERED ([Id] ASC)
                );

                CREATE INDEX [IX_GeneralLogs_Category]
                    ON [dbo].[GeneralLogs] ([Category]);

                CREATE INDEX [IX_GeneralLogs_CreatedAt]
                    ON [dbo].[GeneralLogs] ([CreatedAt]);
                """;

            using var command =
                new SqlCommand(
                    createGeneralLogsSql,
                    connection);

            await command.ExecuteNonQueryAsync();
        }

        // -------------------------------------------------------------------
        // 12) USER TWO FACTOR SETTINGS
        //     Kullanıcının 2FA ayarlarını tutar.
        // -------------------------------------------------------------------

        private static async Task EnsureUserTwoFactorSettingsTableAsync(
            SqlConnection connection)
        {
            if (await TableExistsAsync(
                connection,
                "UserTwoFactorSettings"))
            {
                return;
            }

            const string createSql = """
                CREATE TABLE [dbo].[UserTwoFactorSettings]
                (
                    [UserId]
                        INT NOT NULL,

                    [IsEnabled]
                        BIT NOT NULL
                        DEFAULT 0,

                    [Method]
                        NVARCHAR(20) NOT NULL
                        DEFAULT N'Email',

                    [EnabledAt]
                        DATETIME2 NULL,

                    [UpdatedAt]
                        DATETIME2 NOT NULL
                        DEFAULT GETUTCDATE(),

                    CONSTRAINT [PK_UserTwoFactorSettings]
                        PRIMARY KEY CLUSTERED ([UserId]),

                    CONSTRAINT [FK_UserTwoFactorSettings_Users_UserId]
                        FOREIGN KEY ([UserId])
                        REFERENCES [dbo].[Users]([Id])
                        ON DELETE CASCADE
                );
                """;

            using var command =
                new SqlCommand(
                    createSql,
                    connection);

            await command.ExecuteNonQueryAsync();
        }

        // -------------------------------------------------------------------
        // 13) TWO FACTOR CODES
        //     2FA doğrulama kodlarını tutar.
        //     Gerçek kod tutulmaz, hash tutulur.
        // -------------------------------------------------------------------

        private static async Task EnsureTwoFactorCodesTableAsync(
            SqlConnection connection)
        {
            if (await TableExistsAsync(
                connection,
                "TwoFactorCodes"))
            {
                return;
            }

            const string createSql = """
                CREATE TABLE [dbo].[TwoFactorCodes]
                (
                    [Id]
                        INT IDENTITY(1, 1) NOT NULL,

                    [UserId]
                        INT NOT NULL,

                    [CodeHash]
                        NVARCHAR(255) NOT NULL,

                    [ExpiresAt]
                        DATETIME2 NOT NULL,

                    [FailedAttempts]
                        INT NOT NULL
                        DEFAULT 0,

                    [IsUsed]
                        BIT NOT NULL
                        DEFAULT 0,

                    [CreatedAt]
                        DATETIME2 NOT NULL
                        DEFAULT GETUTCDATE(),

                    CONSTRAINT [PK_TwoFactorCodes]
                        PRIMARY KEY CLUSTERED ([Id] ASC),

                    CONSTRAINT [FK_TwoFactorCodes_Users_UserId]
                        FOREIGN KEY ([UserId])
                        REFERENCES [dbo].[Users]([Id])
                        ON DELETE CASCADE
                );

                CREATE INDEX [IX_TwoFactorCodes_UserId]
                    ON [dbo].[TwoFactorCodes] ([UserId]);

                CREATE INDEX [IX_TwoFactorCodes_UserId_IsUsed]
                    ON [dbo].[TwoFactorCodes] ([UserId], [IsUsed]);

                CREATE INDEX [IX_TwoFactorCodes_ExpiresAt]
                    ON [dbo].[TwoFactorCodes] ([ExpiresAt]);
                """;

            using var command =
                new SqlCommand(
                    createSql,
                    connection);

            await command.ExecuteNonQueryAsync();
        }
        // -------------------------------------------------------------------
        // 14) FRIENDS
        //     Onaylanmış arkadaşlık ilişkilerini tutar.
        //     Arkadaşlık iki yönlü olduğu için iki kayıt oluşturulur.
        // -------------------------------------------------------------------

        private static async Task EnsureFriendsTableAsync(
            SqlConnection connection)
        {
            if (await TableExistsAsync(
                connection,
                "Friends"))
            {
                return;
            }

            const string createSql = """
        CREATE TABLE [dbo].[Friends]
        (
            [Id]
                INT IDENTITY(1, 1) NOT NULL,

            [UserId]
                INT NOT NULL,

            [FriendUserId]
                INT NOT NULL,

            [CreatedAt]
                DATETIME2 NOT NULL
                DEFAULT GETUTCDATE(),

            CONSTRAINT [PK_Friends]
                PRIMARY KEY CLUSTERED ([Id] ASC),

            CONSTRAINT [FK_Friends_Users_UserId]
                FOREIGN KEY ([UserId])
                REFERENCES [dbo].[Users]([Id])
                ON DELETE CASCADE,

            CONSTRAINT [FK_Friends_Users_FriendUserId]
                FOREIGN KEY ([FriendUserId])
                REFERENCES [dbo].[Users]([Id])
                ON DELETE NO ACTION,

            CONSTRAINT [UQ_Friends_UserId_FriendUserId]
                UNIQUE ([UserId], [FriendUserId]),

            CONSTRAINT [CK_Friends_NoSelfFriend]
                CHECK ([UserId] <> [FriendUserId])
        );

        CREATE INDEX [IX_Friends_UserId]
            ON [dbo].[Friends] ([UserId]);

        CREATE INDEX [IX_Friends_FriendUserId]
            ON [dbo].[Friends] ([FriendUserId]);
        """;

            using var command =
                new SqlCommand(
                    createSql,
                    connection);

            await command.ExecuteNonQueryAsync();
        }
        // -------------------------------------------------------------------
        // 15) FRIEND REQUESTS
        //     Arkadaşlık isteklerini ve durumlarını tutar.
        // -------------------------------------------------------------------

        private static async Task EnsureFriendRequestsTableAsync(
            SqlConnection connection)
        {
            if (await TableExistsAsync(
                connection,
                "FriendRequests"))
            {
                return;
            }

            const string createSql = """
        CREATE TABLE [dbo].[FriendRequests]
        (
            [Id]
                INT IDENTITY(1, 1) NOT NULL,

            [SenderId]
                INT NOT NULL,

            [ReceiverId]
                INT NOT NULL,

            [Status]
                NVARCHAR(20) NOT NULL
                CONSTRAINT [DF_FriendRequests_Status]
                DEFAULT N'Pending',

            [CreatedAt]
                DATETIME2 NOT NULL
                DEFAULT GETUTCDATE(),

            [RespondedAt]
                DATETIME2 NULL,

            CONSTRAINT [PK_FriendRequests]
                PRIMARY KEY CLUSTERED ([Id] ASC),

            CONSTRAINT [FK_FriendRequests_Sender_Users]
                FOREIGN KEY ([SenderId])
                REFERENCES [dbo].[Users]([Id])
                ON DELETE CASCADE,

            CONSTRAINT [FK_FriendRequests_Receiver_Users]
                FOREIGN KEY ([ReceiverId])
                REFERENCES [dbo].[Users]([Id])
                ON DELETE NO ACTION,

            CONSTRAINT [CK_FriendRequests_NoSelfRequest]
                CHECK ([SenderId] <> [ReceiverId]),

            CONSTRAINT [CK_FriendRequests_Status]
                CHECK (
                    [Status] IN
                    (
                        N'Pending',
                        N'Accepted',
                        N'Rejected',
                        N'Cancelled'
                    )
                )
        );

        CREATE INDEX [IX_FriendRequests_SenderId]
            ON [dbo].[FriendRequests] ([SenderId]);

        CREATE INDEX [IX_FriendRequests_ReceiverId]
            ON [dbo].[FriendRequests] ([ReceiverId]);

        CREATE INDEX [IX_FriendRequests_ReceiverId_Status]
            ON [dbo].[FriendRequests]
            ([ReceiverId], [Status]);

        CREATE INDEX [IX_FriendRequests_SenderId_Status]
            ON [dbo].[FriendRequests]
            ([SenderId], [Status]);

        CREATE INDEX [IX_FriendRequests_CreatedAt]
            ON [dbo].[FriendRequests] ([CreatedAt]);
        """;

            using var command =
                new SqlCommand(
                    createSql,
                    connection);

            await command.ExecuteNonQueryAsync();
        }
        // -------------------------------------------------------------------
        // 16) USER PRIVACY SETTINGS
        //     Kullanıcının mesaj isteği gizlilik tercihlerini tutar.
        //     Everyone     -> Herkes
        //     FriendsOnly  -> Sadece Arkadaşlarım
        //     Nobody       -> Hiç Kimse
        // -------------------------------------------------------------------

        private static async Task EnsureUserPrivacySettingsTableAsync(
            SqlConnection connection)
        {
            if (await TableExistsAsync(
                connection,
                "UserPrivacySettings"))
            {
                return;
            }

            const string createSql = """
        CREATE TABLE [dbo].[UserPrivacySettings]
        (
            [UserId]
                INT NOT NULL,

            [MessageRequestPermission]
                NVARCHAR(20) NOT NULL
                CONSTRAINT [DF_UserPrivacySettings_MessageRequestPermission]
                DEFAULT N'Everyone',

            [UpdatedAt]
                DATETIME2 NOT NULL
                DEFAULT GETUTCDATE(),

            CONSTRAINT [PK_UserPrivacySettings]
                PRIMARY KEY CLUSTERED ([UserId] ASC),

            CONSTRAINT [FK_UserPrivacySettings_Users_UserId]
                FOREIGN KEY ([UserId])
                REFERENCES [dbo].[Users]([Id])
                ON DELETE CASCADE,

            CONSTRAINT [CK_UserPrivacySettings_MessageRequestPermission]
                CHECK
                (
                    [MessageRequestPermission] IN
                    (
                        N'Everyone',
                        N'FriendsOnly',
                        N'Nobody'
                    )
                )
        );
        """;

            using var command =
                new SqlCommand(
                    createSql,
                    connection);

            await command.ExecuteNonQueryAsync();
        }
        // -------------------------------------------------------------------
        // 17) MESSAGE REQUESTS
        //     Kullanıcılar arasındaki mesaj isteklerini tutar.
        // -------------------------------------------------------------------

        private static async Task EnsureMessageRequestsTableAsync(
            SqlConnection connection)
        {
            if (await TableExistsAsync(
                connection,
                "MessageRequests"))
            {
                return;
            }

            const string createSql = """
        CREATE TABLE [dbo].[MessageRequests]
        (
            [Id]
                INT IDENTITY(1, 1) NOT NULL,

            [SenderId]
                INT NOT NULL,

            [ReceiverId]
                INT NOT NULL,

            [Status]
                NVARCHAR(20) NOT NULL
                CONSTRAINT [DF_MessageRequests_Status]
                DEFAULT N'Pending',

            [CreatedAt]
                DATETIME2 NOT NULL
                DEFAULT GETUTCDATE(),

            [RespondedAt]
                DATETIME2 NULL,

            [ExpiresAt]
                DATETIME2 NULL,

            CONSTRAINT [PK_MessageRequests]
                PRIMARY KEY CLUSTERED ([Id] ASC),

            CONSTRAINT [FK_MessageRequests_Sender_Users]
                FOREIGN KEY ([SenderId])
                REFERENCES [dbo].[Users]([Id])
                ON DELETE CASCADE,

            CONSTRAINT [FK_MessageRequests_Receiver_Users]
                FOREIGN KEY ([ReceiverId])
                REFERENCES [dbo].[Users]([Id])
                ON DELETE NO ACTION,

            CONSTRAINT [CK_MessageRequests_NoSelfRequest]
                CHECK ([SenderId] <> [ReceiverId]),

            CONSTRAINT [CK_MessageRequests_Status]
                CHECK
                (
                    [Status] IN
                    (
                        N'Pending',
                        N'Accepted',
                        N'Rejected',
                        N'Cancelled',
                        N'Expired'
                    )
                )
        );

        CREATE INDEX [IX_MessageRequests_SenderId]
            ON [dbo].[MessageRequests] ([SenderId]);

        CREATE INDEX [IX_MessageRequests_ReceiverId]
            ON [dbo].[MessageRequests] ([ReceiverId]);

        CREATE INDEX [IX_MessageRequests_ReceiverId_Status]
            ON [dbo].[MessageRequests]
            ([ReceiverId], [Status]);

        CREATE INDEX [IX_MessageRequests_SenderId_Status]
            ON [dbo].[MessageRequests]
            ([SenderId], [Status]);

        CREATE INDEX [IX_MessageRequests_CreatedAt]
            ON [dbo].[MessageRequests] ([CreatedAt]);

        CREATE UNIQUE INDEX [UX_MessageRequests_Pending]
            ON [dbo].[MessageRequests]
            ([SenderId], [ReceiverId])
            WHERE [Status] = N'Pending';
        """;

            using var command =
                new SqlCommand(
                    createSql,
                    connection);

            await command.ExecuteNonQueryAsync();
        }
        // -------------------------------------------------------------------
        // 18) Messages 
        // -------------------------------------------------------------------
        private static async Task EnsureMessagesTableAsync(SqlConnection connection)
        {
            // -------------------------------------------------------------
            // 1) TABLO YOKSA TAM ŞEMA İLE OLUŞTUR
            // -------------------------------------------------------------
            if (!await TableExistsAsync(connection, "Messages"))
            {
                const string createSql = """
                CREATE TABLE [dbo].[Messages]
                (
                    [Id]
                        INT IDENTITY(1,1) NOT NULL,

                    [SenderId]
                        INT NOT NULL,

                    [ReceiverId]
                        INT NOT NULL,

                    [Content]
                        NVARCHAR(MAX) NOT NULL,

                    [MessageType]
                        NVARCHAR(20) NOT NULL
                        CONSTRAINT [DF_Messages_MessageType]
                        DEFAULT N'Text',

                    [IsRead]
                        BIT NOT NULL
                        CONSTRAINT [DF_Messages_IsRead]
                        DEFAULT 0,

                    [ReadAt]
                        DATETIME2 NULL,

                    [IsDeleted]
                        BIT NOT NULL
                        CONSTRAINT [DF_Messages_IsDeleted]
                        DEFAULT 0,

                    [DeletedAt]
                        DATETIME2 NULL,

                    [CreatedAt]
                        DATETIME2 NOT NULL
                        CONSTRAINT [DF_Messages_CreatedAt]
                        DEFAULT GETUTCDATE(),

                    CONSTRAINT [PK_Messages]
                        PRIMARY KEY CLUSTERED ([Id] ASC),

                    CONSTRAINT [FK_Messages_Sender_Users]
                        FOREIGN KEY ([SenderId])
                        REFERENCES [dbo].[Users]([Id])
                        ON DELETE NO ACTION,

                    CONSTRAINT [FK_Messages_Receiver_Users]
                        FOREIGN KEY ([ReceiverId])
                        REFERENCES [dbo].[Users]([Id])
                        ON DELETE NO ACTION,

                    CONSTRAINT [CK_Messages_NoSelfMessage]
                        CHECK ([SenderId] <> [ReceiverId]),

                    CONSTRAINT [CK_Messages_MessageType]
                        CHECK
                        (
                            [MessageType] IN
                            (
                                N'Text',
                                N'Image',
                                N'File',
                                N'System'
                            )
                        )
                );

                CREATE INDEX [IX_Messages_SenderId]
                    ON [dbo].[Messages] ([SenderId]);

                CREATE INDEX [IX_Messages_ReceiverId]
                    ON [dbo].[Messages] ([ReceiverId]);

                CREATE INDEX [IX_Messages_ReceiverId_IsRead]
                    ON [dbo].[Messages]
                    ([ReceiverId], [IsRead]);

                CREATE INDEX [IX_Messages_CreatedAt]
                    ON [dbo].[Messages] ([CreatedAt]);
                """;
                using var command = new SqlCommand(createSql, connection);
                await command.ExecuteNonQueryAsync();
                return;
            }

            // -------------------------------------------------------------
            // 2) TABLO VARSA EKSİK KOLONLARI EKLE (idempotent migration)
            // -------------------------------------------------------------

            // MessageType
            if (!await ColumnExistsAsync(
                connection, "Messages", "MessageType"))
            {
                const string addSql = """
                    ALTER TABLE [dbo].[Messages]
                    ADD [MessageType]
                        NVARCHAR(20) NOT NULL
                        CONSTRAINT [DF_Messages_MessageType]
                        DEFAULT N'Text';
                    """;
                using var cmd = new SqlCommand(addSql, connection);
                await cmd.ExecuteNonQueryAsync();

                if (!await CheckConstraintExistsAsync(
                    connection, "Messages", "CK_Messages_MessageType"))
                {
                    const string addCkSql = """
                        ALTER TABLE [dbo].[Messages]
                        ADD CONSTRAINT [CK_Messages_MessageType]
                        CHECK
                        (
                            [MessageType] IN
                            (
                                N'Text',
                                N'Image',
                                N'File',
                                N'System'
                            )
                        );
                        """;
                    using var ckCmd = new SqlCommand(addCkSql, connection);
                    await ckCmd.ExecuteNonQueryAsync();
                }
            }

            // ReadAt
            if (!await ColumnExistsAsync(
                connection, "Messages", "ReadAt"))
            {
                const string addSql = """
                    ALTER TABLE [dbo].[Messages]
                    ADD [ReadAt] DATETIME2 NULL;
                    """;
                using var cmd = new SqlCommand(addSql, connection);
                await cmd.ExecuteNonQueryAsync();
            }

            // IsDeleted
            if (!await ColumnExistsAsync(
                connection, "Messages", "IsDeleted"))
            {
                const string addSql = """
                    ALTER TABLE [dbo].[Messages]
                    ADD [IsDeleted]
                        BIT NOT NULL
                        CONSTRAINT [DF_Messages_IsDeleted]
                        DEFAULT 0;
                    """;
                using var cmd = new SqlCommand(addSql, connection);
                await cmd.ExecuteNonQueryAsync();
            }

            // DeletedAt
            if (!await ColumnExistsAsync(
                connection, "Messages", "DeletedAt"))
            {
                const string addSql = """
                    ALTER TABLE [dbo].[Messages]
                    ADD [DeletedAt] DATETIME2 NULL;
                    """;
                using var cmd = new SqlCommand(addSql, connection);
                await cmd.ExecuteNonQueryAsync();
            }

            // -------------------------------------------------------------
            // 3) CHECK CONSTRAINT: NoSelfMessage
            // -------------------------------------------------------------
            if (!await CheckConstraintExistsAsync(
                connection, "Messages", "CK_Messages_NoSelfMessage"))
            {
                const string addCkSql = """
                    ALTER TABLE [dbo].[Messages]
                    ADD CONSTRAINT [CK_Messages_NoSelfMessage]
                    CHECK ([SenderId] <> [ReceiverId]);
                    """;
                using var cmd = new SqlCommand(addCkSql, connection);
                await cmd.ExecuteNonQueryAsync();
            }

            // -------------------------------------------------------------
            // 4) FK İSİMLERİNİ STANDARDİZE ET
            //    Eski isimler: FK_Messages_Sender / FK_Messages_Receiver
            //    Yeni isimler: FK_Messages_Sender_Users / FK_Messages_Receiver_Users
            // -------------------------------------------------------------
            if (await ForeignKeyExistsAsync(
                connection, "Messages", "FK_Messages_Sender"))
            {
                // Önce eski constraint'in var olup olmadığını doğrula
                const string dropAndRecreateSql = """
                    ALTER TABLE [dbo].[Messages]
                    DROP CONSTRAINT [FK_Messages_Sender];

                    ALTER TABLE [dbo].[Messages]
                    ADD CONSTRAINT [FK_Messages_Sender_Users]
                        FOREIGN KEY ([SenderId])
                        REFERENCES [dbo].[Users]([Id])
                        ON DELETE NO ACTION;
                    """;
                using var cmd = new SqlCommand(dropAndRecreateSql, connection);
                await cmd.ExecuteNonQueryAsync();
            }

            if (await ForeignKeyExistsAsync(
                connection, "Messages", "FK_Messages_Receiver"))
            {
                const string dropAndRecreateSql = """
                    ALTER TABLE [dbo].[Messages]
                    DROP CONSTRAINT [FK_Messages_Receiver];

                    ALTER TABLE [dbo].[Messages]
                    ADD CONSTRAINT [FK_Messages_Receiver_Users]
                        FOREIGN KEY ([ReceiverId])
                        REFERENCES [dbo].[Users]([Id])
                        ON DELETE NO ACTION;
                    """;
                using var cmd = new SqlCommand(dropAndRecreateSql, connection);
                await cmd.ExecuteNonQueryAsync();
            }

            // -------------------------------------------------------------
            // 5) PERFORMANS INDEXLERİ
            // -------------------------------------------------------------
            if (!await UniqueConstraintOrIndexExistsAsync(
                connection, "Messages", "IX_Messages_SenderId"))
            {
                const string createIndexSql = """
                    CREATE INDEX [IX_Messages_SenderId]
                        ON [dbo].[Messages] ([SenderId]);
                    """;
                using var cmd = new SqlCommand(createIndexSql, connection);
                await cmd.ExecuteNonQueryAsync();
            }

            if (!await UniqueConstraintOrIndexExistsAsync(
                connection, "Messages", "IX_Messages_ReceiverId"))
            {
                const string createIndexSql = """
                    CREATE INDEX [IX_Messages_ReceiverId]
                        ON [dbo].[Messages] ([ReceiverId]);
                    """;
                using var cmd = new SqlCommand(createIndexSql, connection);
                await cmd.ExecuteNonQueryAsync();
            }

            if (!await UniqueConstraintOrIndexExistsAsync(
                connection, "Messages", "IX_Messages_ReceiverId_IsRead"))
            {
                const string createIndexSql = """
                    CREATE INDEX [IX_Messages_ReceiverId_IsRead]
                        ON [dbo].[Messages]
                        ([ReceiverId], [IsRead]);
                    """;
                using var cmd = new SqlCommand(createIndexSql, connection);
                await cmd.ExecuteNonQueryAsync();
            }

            if (!await UniqueConstraintOrIndexExistsAsync(
                connection, "Messages", "IX_Messages_CreatedAt"))
            {
                const string createIndexSql = """
                    CREATE INDEX [IX_Messages_CreatedAt]
                        ON [dbo].[Messages] ([CreatedAt]);
                    """;
                using var cmd = new SqlCommand(createIndexSql, connection);
                await cmd.ExecuteNonQueryAsync();
            }
        }
        // -------------------------------------------------------------------
        // 19) USER LOCATIONS
        // Kullanıcının ülke, il, ilçe ve mahalle bilgilerini tutar.
        // Google Maps ve manuel giriş aynı tabloyu kullanır.
        // -------------------------------------------------------------------

        private static async Task EnsureUserLocationsTableAsync(
            SqlConnection connection)
        {
            const string createSql = """
        IF OBJECT_ID(N'dbo.UserLocations', N'U') IS NULL
        BEGIN
            CREATE TABLE [dbo].[UserLocations]
            (
                [UserId] INT NOT NULL,
                [Country] NVARCHAR(100) NOT NULL,
                [Province] NVARCHAR(100) NOT NULL,
                [District] NVARCHAR(100) NOT NULL,
                [Neighbourhood] NVARCHAR(150) NULL,
                [Address] NVARCHAR(300) NULL,

                [Latitude] FLOAT NULL,
                [Longitude] FLOAT NULL,

                [CreatedAt] DATETIME2 NOT NULL
                    CONSTRAINT [DF_UserLocations_CreatedAt]
                    DEFAULT SYSUTCDATETIME(),

                [UpdatedAt] DATETIME2 NULL,

                CONSTRAINT [PK_UserLocations]
                    PRIMARY KEY CLUSTERED ([UserId] ASC),

                CONSTRAINT [FK_UserLocations_Users_UserId]
                    FOREIGN KEY ([UserId])
                    REFERENCES [dbo].[Users] ([Id])
                    ON DELETE CASCADE,

                CONSTRAINT [CK_UserLocations_Latitude]
                    CHECK (
                        [Latitude] IS NULL
                        OR [Latitude] BETWEEN -90 AND 90
                    ),

                CONSTRAINT [CK_UserLocations_Longitude]
                    CHECK (
                        [Longitude] IS NULL
                        OR [Longitude] BETWEEN -180 AND 180
                    ),

                CONSTRAINT [CK_UserLocations_Coordinates]
                    CHECK (
                        ([Latitude] IS NULL AND [Longitude] IS NULL)
                        OR
                        ([Latitude] IS NOT NULL AND [Longitude] IS NOT NULL)
                    )
            );
        END;

        -- Mevcut tabloda eksik sütunları tamamla.
        IF COL_LENGTH(N'dbo.UserLocations', N'Address') IS NULL
        BEGIN
            ALTER TABLE [dbo].[UserLocations]
            ADD [Address] NVARCHAR(300) NULL;
        END;

        IF COL_LENGTH(N'dbo.UserLocations', N'Latitude') IS NULL
        BEGIN
            ALTER TABLE [dbo].[UserLocations]
            ADD [Latitude] FLOAT NULL;
        END;

        IF COL_LENGTH(N'dbo.UserLocations', N'Longitude') IS NULL
        BEGIN
            ALTER TABLE [dbo].[UserLocations]
            ADD [Longitude] FLOAT NULL;
        END;

        -- Koordinat kısıtlarını yalnızca eksikse ekle.
        IF NOT EXISTS (
            SELECT 1
            FROM sys.check_constraints
            WHERE name = N'CK_UserLocations_Latitude'
              AND parent_object_id =
                  OBJECT_ID(N'dbo.UserLocations')
        )
        BEGIN
            ALTER TABLE [dbo].[UserLocations]
            ADD CONSTRAINT [CK_UserLocations_Latitude]
            CHECK (
                [Latitude] IS NULL
                OR [Latitude] BETWEEN -90 AND 90
            );
        END;

        IF NOT EXISTS (
            SELECT 1
            FROM sys.check_constraints
            WHERE name = N'CK_UserLocations_Longitude'
              AND parent_object_id =
                  OBJECT_ID(N'dbo.UserLocations')
        )
        BEGIN
            ALTER TABLE [dbo].[UserLocations]
            ADD CONSTRAINT [CK_UserLocations_Longitude]
            CHECK (
                [Longitude] IS NULL
                OR [Longitude] BETWEEN -180 AND 180
            );
        END;

        IF NOT EXISTS (
            SELECT 1
            FROM sys.check_constraints
            WHERE name = N'CK_UserLocations_Coordinates'
              AND parent_object_id =
                  OBJECT_ID(N'dbo.UserLocations')
        )
        BEGIN
            ALTER TABLE [dbo].[UserLocations]
            ADD CONSTRAINT [CK_UserLocations_Coordinates]
            CHECK (
                ([Latitude] IS NULL AND [Longitude] IS NULL)
                OR
                ([Latitude] IS NOT NULL AND [Longitude] IS NOT NULL)
            );
        END;

        -- İl ve ilçe indeksi.
        IF NOT EXISTS (
            SELECT 1
            FROM sys.indexes
            WHERE name = N'IX_UserLocations_Province_District'
              AND object_id = OBJECT_ID(N'dbo.UserLocations')
        )
        BEGIN
            CREATE INDEX [IX_UserLocations_Province_District]
            ON [dbo].[UserLocations] ([Province], [District]);
        END;
        """;

            using var command = new SqlCommand(createSql, connection);
            await command.ExecuteNonQueryAsync();
        }




        private static async Task EnsureUserThemeSettingsTableAsync(
            SqlConnection connection)
        {
            const string createSql = """
        IF OBJECT_ID(N'dbo.UserThemeSettings', N'U') IS NULL
        BEGIN
            CREATE TABLE [dbo].[UserThemeSettings]
            (
                [UserId] INT NOT NULL,

                [Thema] NVARCHAR(20) NOT NULL
                    CONSTRAINT [DF_UserThemeSettings_Thema]
                    DEFAULT N'Dark',

                CONSTRAINT [PK_UserThemeSettings]
                    PRIMARY KEY CLUSTERED ([UserId] ASC),

                CONSTRAINT [FK_UserThemeSettings_Users_UserId]
                    FOREIGN KEY ([UserId])
                    REFERENCES [dbo].[Users] ([Id])
                    ON DELETE CASCADE,

                CONSTRAINT [CK_UserThemeSettings_Thema]
                    CHECK ([Thema] IN (N'Dark', N'Light'))
            );
        END;

        -- Mevcut tabloda eksik sütunları tamamla.
        IF COL_LENGTH(N'dbo.UserThemeSettings', N'Thema') IS NULL
        BEGIN
            ALTER TABLE [dbo].[UserThemeSettings]
            ADD [Thema] NVARCHAR(20) NOT NULL
                CONSTRAINT [DF_UserThemeSettings_Thema]
                DEFAULT N'Dark';
        END;

        -- Tema kısıtını yalnızca eksikse ekle.
        IF NOT EXISTS (
            SELECT 1
            FROM sys.check_constraints
            WHERE name = N'CK_UserThemeSettings_Thema'
              AND parent_object_id =
                  OBJECT_ID(N'dbo.UserThemeSettings')
        )
        BEGIN
            ALTER TABLE [dbo].[UserThemeSettings]
            ADD CONSTRAINT [CK_UserThemeSettings_Thema]
            CHECK ([Thema] IN (N'Dark', N'Light'));
        END;
        """;

            using var command = new SqlCommand(createSql, connection);
            await command.ExecuteNonQueryAsync();
        }

        // -------------------------------------------------------------------
        // CHECK CONSTRAINT VARLIK KONTROLÜ (yardımcı)
        // -------------------------------------------------------------------
        private static async Task<bool> CheckConstraintExistsAsync(
            SqlConnection connection,
            string tableName,
            string constraintName)
        {
            const string sql = """
                SELECT COUNT(*)
                FROM sys.check_constraints cc
                JOIN sys.tables t
                    ON cc.parent_object_id = t.object_id
                WHERE t.name = @tableName
                  AND t.schema_id = SCHEMA_ID('dbo')
                  AND cc.name = @name;
                """;
            using var command = new SqlCommand(sql, connection);
            command.Parameters.AddWithValue("@tableName", tableName);
            command.Parameters.AddWithValue("@name", constraintName);
            var result = await command.ExecuteScalarAsync();
            return result is int count && count > 0;
        }
        // -------------------------------------------------------------------
        // YARDIMCI METOTLAR
        // -------------------------------------------------------------------

        private static async Task<bool> TableExistsAsync(
            SqlConnection connection,
            string tableName)
        {
            const string sql = """
                SELECT COUNT(*)
                FROM sys.tables
                WHERE name = @tableName
                  AND schema_id = SCHEMA_ID('dbo');
                """;

            using var command =
                new SqlCommand(sql, connection);

            command.Parameters.AddWithValue(
                "@tableName",
                tableName);

            var result =
                await command.ExecuteScalarAsync();

            return result is int count && count > 0;
        }

        private static async Task<bool> ColumnExistsAsync(
            SqlConnection connection,
            string tableName,
            string columnName)
        {
            const string sql = """
                SELECT COUNT(*)
                FROM sys.columns c
                JOIN sys.tables t
                    ON c.object_id = t.object_id
                WHERE t.name = @tableName
                  AND t.schema_id = SCHEMA_ID('dbo')
                  AND c.name = @columnName;
                """;

            using var command =
                new SqlCommand(sql, connection);

            command.Parameters.AddWithValue(
                "@tableName",
                tableName);

            command.Parameters.AddWithValue(
                "@columnName",
                columnName);

            var result =
                await command.ExecuteScalarAsync();

            return result is int count && count > 0;
        }

        private static async Task<bool> UniqueConstraintOrIndexExistsAsync(
            SqlConnection connection,
            string tableName,
            string indexOrConstraintName)
        {
            const string sql = """
                SELECT COUNT(*)
                FROM sys.indexes i
                JOIN sys.tables t
                    ON i.object_id = t.object_id
                WHERE t.name = @tableName
                  AND t.schema_id = SCHEMA_ID('dbo')
                  AND i.name = @name;
                """;

            using var command =
                new SqlCommand(sql, connection);

            command.Parameters.AddWithValue(
                "@tableName",
                tableName);

            command.Parameters.AddWithValue(
                "@name",
                indexOrConstraintName);

            var result =
                await command.ExecuteScalarAsync();

            return result is int count && count > 0;
        }

        private static async Task<bool> HasDuplicateValuesAsync(
            SqlConnection connection,
            string tableName,
            string columnName)
        {
            if (tableName != "Users" &&
                tableName != "Roles")
            {
                throw new ArgumentException(
                    "Invalid table name",
                    nameof(tableName));
            }

            if (columnName != "Username" &&
                columnName != "Email")
            {
                throw new ArgumentException(
                    "Invalid column name",
                    nameof(columnName));
            }

            string sql = $"""
                SELECT COUNT(*)
                FROM
                (
                    SELECT [{columnName}]
                    FROM [dbo].[{tableName}]
                    WHERE [{columnName}] IS NOT NULL
                      AND [{columnName}] <> ''
                    GROUP BY [{columnName}]
                    HAVING COUNT(*) > 1
                ) AS Duplicates;
                """;

            using var command =
                new SqlCommand(sql, connection);

            var result =
                await command.ExecuteScalarAsync();

            return result is int count && count > 0;
        }

        private static async Task<bool> ForeignKeyExistsAsync(
            SqlConnection connection,
            string tableName,
            string foreignKeyName)
        {
            const string sql = """
                SELECT COUNT(*)
                FROM sys.foreign_keys fk
                JOIN sys.tables t
                    ON fk.parent_object_id = t.object_id
                WHERE fk.name = @fkName
                  AND t.schema_id = SCHEMA_ID('dbo')
                  AND t.name = @tableName;
                """;

            using var command =
                new SqlCommand(sql, connection);

            command.Parameters.AddWithValue("@tableName", tableName);
            command.Parameters.AddWithValue("@fkName", foreignKeyName);

            var result =
                await command.ExecuteScalarAsync();

            return result is int count && count > 0;
        }

        // Eski çağrılar için geriye dönük uyumluluk (Roles tablosu)
        private static async Task<bool> ForeignKeyExistsAsync(
            SqlConnection connection,
            string foreignKeyName)
        {
            return await ForeignKeyExistsAsync(
                connection,
                "Roles",
                foreignKeyName);
        }

        // -------------------------------------------------------------------
        // CONNECTION STRING HELPERS
        // -------------------------------------------------------------------

        private static string? ExtractDatabaseName(
            string connectionString)
        {
            var builder =
                new SqlConnectionStringBuilder(
                    connectionString);

            return string.IsNullOrWhiteSpace(
                builder.InitialCatalog)
                    ? null
                    : builder.InitialCatalog;
        }

        private static string BuildMasterConnectionString(
            string connectionString)
        {
            var builder =
                new SqlConnectionStringBuilder(
                    connectionString)
                {
                    InitialCatalog = "master"
                };

            return builder.ConnectionString;
        }

        private static void ValidateDatabaseName(
            string databaseName)
        {
            foreach (var c in databaseName)
            {
                if (!char.IsLetterOrDigit(c) &&
                    c != '_' &&
                    c != '-')
                {
                    throw new InvalidOperationException(
                        $"Geçersiz veritabanı adı: '{databaseName}'.");
                }
            }
        }
    }
}