using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Apı.Data;
using Apı.Helpers;
using Apı.Model;
using Apı.Service;
using Apı.Service.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;

var builder = WebApplication.CreateBuilder(args);

#region Add services to the container.58ömn7b65

builder.Services.AddControllers();

var defaultConnection =
    builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException(
        "Connection string 'DefaultConnection' bulunamadı.");

#region Services DI

// =========================================================
// CORE SERVICES
// =========================================================

builder.Services.AddSingleton<JwtService>();

// =========================================================
// ROLE SERVICE
// =========================================================

builder.Services.AddScoped<RoleService>(sp =>
    new RoleService(defaultConnection));

// =========================================================
// AUTHENTICATION RATE LIMITING
// =========================================================

// 5 başarısız login -> 5 dakika blok
// 10 başarısız login -> 10 dakika blok
// 15 başarısız login -> kalıcı ban (DB'ye yazılır, restart'ta korunur)
builder.Services.AddSingleton<BanStorageService>(sp =>
    new BanStorageService(defaultConnection));

builder.Services.AddSingleton<LoginRateLimitingService>(sp =>
    new LoginRateLimitingService(
        sp.GetRequiredService<BanStorageService>()
    ));

// =========================================================
// REGISTER
// =========================================================

builder.Services.AddScoped<RegisterService>(sp =>
    new RegisterService(
        defaultConnection,
        sp.GetRequiredService<Apı.Services.ILogService>()
    ));

// =========================================================
// LOGIN
// =========================================================

builder.Services.AddScoped<LoginService>(sp =>
    new LoginService(
        defaultConnection,
        sp.GetRequiredService<JwtService>(),
        sp.GetRequiredService<RoleService>(),
        sp.GetRequiredService<LoginRateLimitingService>(),
        sp.GetRequiredService<BanStorageService>(),
        sp.GetRequiredService<Apı.Services.ILogService>()
    ));

// =========================================================
// LOG SERVICE
// =========================================================

builder.Services.AddScoped<Apı.Services.ILogService, LogService>();

// =========================================================
// PASSWORD
// =========================================================

builder.Services.AddScoped<PasswordupdateService>(sp =>
    new PasswordupdateService(
        defaultConnection,
        sp.GetRequiredService<Apı.Services.ILogService>()
    ));

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<IAdminService, AdminService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<ITwoFactorService, TwoFactorService>();
builder.Services.AddScoped<ITwoFactorSettingsService, TwoFactorSettingsService>();

// =========================================================
// FRIEND SERVICE
// =========================================================

builder.Services.AddScoped<FriendService>(sp =>
    new FriendService(defaultConnection));

// =========================================================
// MESSAGE REQUEST SERVICE
// =========================================================

builder.Services.AddScoped<IMessageRequestService>(sp =>
    new MessageRequestService(
        sp.GetRequiredService<IConfiguration>()));
// =========================================================
// MESSAGE SERVICE
// =========================================================
builder.Services.AddScoped<IMessageService, MessageService>();
#endregion

#region JWT Authentication
var jwtConfig = builder.Configuration.GetSection("Jwt");
var jwtKey = jwtConfig["Key"] ?? throw new InvalidOperationException("Jwt:Key configuration is missing.");
var keyBytes = Convert.FromBase64String(jwtKey);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtConfig["Issuer"],
        ValidAudience = jwtConfig["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(keyBytes),
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization();
#endregion

#region Cors

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy
            .SetIsOriginAllowed(_ => true)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});
#endregion

#region Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Fitness Pro API",
        Version = "v1"
    });

    // JWT Bearer Security Definition
    // Swagger UI'da "Authorize" butonu bu tanım sayesinde görünür hale gelir
    // ve girilen token otomatik olarak "Authorization: Bearer {token}" header'ına eklenir.
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Örnek: \"Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });

    // Global Security Requirement
    // Tüm endpoint'lerde Bearer şeması zorunlu olarak işaretlenir;
    // OpenAPI çıktısında components.securitySchemes.Bearer oluşur.
    c.AddSecurityRequirement(document =>
    {
        var requirement = new OpenApiSecurityRequirement();
        requirement[new OpenApiSecuritySchemeReference("Bearer", document, null)] = new List<string>();
        return requirement;
    });
});
#endregion

var app = builder.Build();

// Veritabanı ve temel tablolar (Users, Roles, FK) uygulama başlangıcında hazırlanır.
// Restart-safe: mevcut tablo/veri varsa dokunulmaz.
await DatabaseInitializer.InitializeAsync(defaultConnection);

// =========================================================
// SYSTEM LOG: BAŞARILI BAŞLANGIÇ
// =========================================================
try
{
    using var bootstrapScope = app.Services.CreateScope();
    var bootstrapLog =
        bootstrapScope.ServiceProvider
            .GetRequiredService<Apı.Services.ILogService>();

    await bootstrapLog.LogSystemAsync(
        level: "Information",
        action: "ApplicationStart",
        message: "Veritabanı ve tablolar başarıyla hazırlandı. Servis başlatıldı.",
        source: "Program.cs"
    );
}
catch
{
    // Başlangıç logu başarısız olursa servisi durdurmuyoruz.
}

#region Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Fitness Pro API v1");
    });
}

app.UseHttpsRedirection();

#endregion

#region CORS & Auth Pipeline

app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

// Controllers
app.MapControllers();

#endregion

#region Health & Auth Me Check
app.MapGet("/health", () =>
{
    return Results.Ok(new
    {
        status = "Healthy",
        service = "Gym-Pro-Api",
        timestamp = DateTime.UtcNow
    });
});

app.MapGet("/api/auth/me", [Microsoft.AspNetCore.Authorization.Authorize] (ClaimsPrincipal user) =>
{
    var userIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value
                    ?? user.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
    int.TryParse(userIdStr, out var parsedUserId);

    var username = user.FindFirst(ClaimTypes.Name)?.Value
                   ?? user.FindFirst(JwtRegisteredClaimNames.UniqueName)?.Value
                   ?? string.Empty;
    var role = user.FindFirst(ClaimTypes.Role)?.Value ?? "User";

    return Results.Ok(ApiResponseModel.Ok("Kullanıcı doğrulandı.", new
    {
        authenticated = true,
        userId = parsedUserId > 0 ? parsedUserId : (object?)userIdStr,
        username = username,
        role = role
    }));
});
#endregion

app.Run();
#endregion