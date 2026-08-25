using Apı.Data;
using Apı.Helpers;
using Apı.Service.Authentication;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();

var defaultConnection =
    builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException(
        "Connection string 'DefaultConnection' bulunamadı.");

// Services DI
builder.Services.AddScoped<RegisterService>(sp => new RegisterService(defaultConnection));

// 
#region Entity Framework Core + SQL Server

builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    options.UseSqlServer(defaultConnection);
});
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

#region OpenApı
builder.Services.AddOpenApi();

var app = builder.Build();

// Veritabanı ve temel tablolar (Users, Roles, FK) uygulama başlangıcında hazırlanır.
// Restart-safe: mevcut tablo/veri varsa dokunulmaz.
await DatabaseInitializer.InitializeAsync(defaultConnection);
#endregion
// 
#region Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

#endregion

#region CORS

app.UseCors("AllowFrontend");

app.UseAuthorization();

// Controllers
app.MapControllers();

#endregion

#region Health Check
app.MapGet("/health", () =>
{
    return Results.Ok(new
    {
        status = "Healthy",
        service = "Gym-Pro-Api",
        timestamp = DateTime.UtcNow
    });
});
#endregion

app.Run();