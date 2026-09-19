namespace Apı.Service;

public interface IEmailService
{
    Task SendEmailAsync(
     string to,
     string subject,
     string body,
     bool isHtml = true
 );
}