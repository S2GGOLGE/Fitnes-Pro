using Apı.Data;
using Apı.Helpers;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();

// Entity Framework Core + SQL Server
builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection"));
});

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy
            .WithOrigins(
                "http://localhost:3000",
                "http://localhost:5173",
                "https://localhost:5173"
            )
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// OpenAPI
builder.Services.AddOpenApi();

var app = builder.Build();

// Veritabanı ve temel tablolar (Users, Roles, FK) uygulama başlangıcında hazırlanır.
// Restart-safe: mevcut tablo/veri varsa dokunulmaz.
var defaultConnection =
    builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException(
        "Connection string 'DefaultConnection' bulunamadı.");

await DatabaseInitializer.InitializeAsync(defaultConnection);

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

// CORS
app.UseCors("AllowFrontend");

app.UseAuthorization();

// Controllers
app.MapControllers();

// Health Check
app.MapGet("/health", () =>
{
    return Results.Ok(new
    {
        status = "Healthy",
        service = "Gym-Pro-Api",
        timestamp = DateTime.UtcNow
    });
});

app.Run();