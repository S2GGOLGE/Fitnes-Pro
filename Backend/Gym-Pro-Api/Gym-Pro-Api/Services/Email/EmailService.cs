namespace Apı.Service;

using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using MimeKit;

public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;

    public EmailService(IConfiguration configuration)
    {
        _configuration = configuration
            ?? throw new ArgumentNullException(nameof(configuration));
    }

    public async Task SendEmailAsync(
        string to,
        string subject,
        string body,
        bool isHtml = true)
    {
        // =========================================================
        // SMTP CONFIGURATION (appsettings.json + user-secrets)
        // =========================================================
        // Host / Port / Username / FromEmail / Secret keys
        // Smtp:Password secret olarak ele alınır; appsettings.json'da
        // boş bırakılır ve gerçek değer user-secrets veya environment
        // variable üzerinden sağlanır.
        // =========================================================

        var smtp = _configuration.GetSection("Smtp");

        var host =
            smtp["Host"]
            ?? throw new InvalidOperationException(
                "Smtp:Host configuration is missing.");

        var portValue =
            smtp["Port"]
            ?? throw new InvalidOperationException(
                "Smtp:Port configuration is missing.");

        if (!int.TryParse(portValue, out var port) || port <= 0)
        {
            throw new InvalidOperationException(
                "Smtp:Port must be a positive integer.");
        }

        var username =
            smtp["Username"]
            ?? throw new InvalidOperationException(
                "Smtp:Username configuration is missing. " +
                "Set the Gmail address that will send emails.");

        var password =
            smtp["Password"]
            ?? throw new InvalidOperationException(
                "Smtp:Password is missing. " +
                "Provide a Gmail App Password via user-secrets: " +
                "dotnet user-secrets set \"Smtp:Password\" \"<APP_PASSWORD>\"");

        if (string.IsNullOrWhiteSpace(password))
        {
            throw new InvalidOperationException(
                "Smtp:Password is empty. " +
                "Provide a Gmail App Password via user-secrets.");
        }

        var fromEmail =
            smtp["FromEmail"]
            ?? username;

        // =========================================================
        // MESSAGE
        // =========================================================

        var email = new MimeMessage();
        email.From.Add(
            new MailboxAddress(
                "Fitness Pro",
                fromEmail
            )
        );
        email.To.Add(MailboxAddress.Parse(to));
        email.Subject = subject;
        var bodyBuilder = new BodyBuilder();
        if (isHtml)
        {
            bodyBuilder.HtmlBody = body;
        }
        else
        {
            bodyBuilder.TextBody = body;
        }
        email.Body = bodyBuilder.ToMessageBody();

        // =========================================================
        // SMTP SEND
        // =========================================================

        using var smpt = new SmtpClient();
        await smpt.ConnectAsync(
            host,
            port,
            SecureSocketOptions.StartTls
        );

        try
        {
            await smpt.AuthenticateAsync(
                username,
                password
            );

            await smpt.SendAsync(email);
        }
        finally
        {
            await smpt.DisconnectAsync(true);
        }
    }
}