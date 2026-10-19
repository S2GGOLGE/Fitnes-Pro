
using System;
using System.Net;

namespace Apı.Service;

public static class WelcomeEmailTemplate
{
    public static string Generate(string name, string appUrl)
    {
        var safeName = WebUtility.HtmlEncode(name);
        
        var safeAppUrl = string.Empty;

        if (Uri.TryCreate(appUrl, UriKind.Absolute, out var uri) &&
            (uri.Scheme == Uri.UriSchemeHttps ||
             uri.Scheme == Uri.UriSchemeHttp))
        {
            safeAppUrl = WebUtility.HtmlEncode(uri.AbsoluteUri);
        }

        return $$"""
        <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
        <html xmlns="http://www.w3.org/1999/xhtml" lang="tr">
        <head>
            <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <meta name="x-apple-disable-message-reformatting" />
            <title>Fitness Pro'ya Hoş Geldiniz</title>

            <!--[if mso]>
            <style type="text/css">
                table, td, span, p, h1, h2, a {
                    font-family: Arial, sans-serif !important;
                }
            </style>
            <![endif]-->
        </head>

        <body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f1f5f9;">
                <tr>
                    <td align="center" style="padding:40px 16px;">

                        <!-- Main Container -->
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:500px;background-color:#ffffff;border:1px solid #e2e8f0;border-collapse:separate;border-radius:12px;">

                            <!-- Header -->
                            <tr>
                                <td align="center" style="padding:40px 32px 16px;">

                                    <h1 style="margin:0 0 10px;font-size:26px;font-weight:700;color:#16a34a;letter-spacing:-0.5px;">
                                        FITNESS PRO
                                    </h1>

                                    <h2 style="margin:0 0 14px;font-size:22px;font-weight:700;color:#0f172a;letter-spacing:-0.3px;">
                                        Aramıza Hoş Geldiniz!
                                    </h2>

                                    <p style="margin:0;font-size:14px;line-height:22px;color:#64748b;">
                                        Fitness Pro ailesine katıldığınız için teşekkür ederiz.
                                        Kişisel gelişim ve fitness yolculuğunuz artık başlıyor.
                                    </p>

                                </td>
                            </tr>

                            <!-- Welcome Message -->
                            <tr>
                                <td style="padding:16px 32px;">

                                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f0fdf4;border:1px solid #dcfce7;border-radius:8px;">
                                        <tr>
                                            <td style="padding:20px;">

                                                <p style="margin:0 0 12px;font-size:16px;font-weight:700;color:#166534;">
                                                    Merhaba {{safeName}},
                                                </p>

                                                <p style="margin:0;font-size:13px;line-height:21px;color:#166534;">
                                                    Fitness Pro hesabınız başarıyla oluşturuldu.
                                                    Artık hedeflerinizi belirleyebilir, antrenmanlarınızı
                                                    takip edebilir ve gelişiminizi adım adım izleyebilirsiniz.
                                                </p>

                                            </td>
                                        </tr>
                                    </table>

                                </td>
                            </tr>

                            <!-- Features -->
                            <tr>
                                <td style="padding:8px 32px 16px;">

                                    <p style="margin:0 0 16px;font-size:15px;font-weight:700;color:#0f172a;">
                                        Fitness Pro ile neler yapabilirsiniz?
                                    </p>

                                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">

                                        <tr>
                                            <td width="28" valign="top" style="padding:0 0 12px;font-size:16px;color:#16a34a;">
                                                &#10003;
                                            </td>
                                            <td valign="top" style="padding:0 0 12px;font-size:13px;line-height:20px;color:#475569;">
                                                <strong style="color:#334155;">Antrenman takibi</strong><br />
                                                Egzersizlerinizi ve antrenman sürecinizi takip edin.
                                            </td>
                                        </tr>

                                        <tr>
                                            <td width="28" valign="top" style="padding:0 0 12px;font-size:16px;color:#16a34a;">
                                                &#10003;
                                            </td>
                                            <td valign="top" style="padding:0 0 12px;font-size:13px;line-height:20px;color:#475569;">
                                                <strong style="color:#334155;">Kişisel hedefler</strong><br />
                                                Hedeflerinizi belirleyin ve ilerlemenizi değerlendirin.
                                            </td>
                                        </tr>

                                        <tr>
                                            <td width="28" valign="top" style="padding:0 0 12px;font-size:16px;color:#16a34a;">
                                                &#10003;
                                            </td>
                                            <td valign="top" style="padding:0 0 12px;font-size:13px;line-height:20px;color:#475569;">
                                                <strong style="color:#334155;">Kişisel gelişim</strong><br />
                                                Daha disiplinli ve düzenli bir yaşam için çalışın.
                                            </td>
                                        </tr>

                                    </table>

                                </td>
                            </tr>

                            <!-- CTA -->
                            <tr>
                                <td align="center" style="padding:8px 32px 28px;">

                                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center">
                                        <tr>
                                            <td align="center" bgcolor="#16a34a" style="background-color:#16a34a;border-radius:8px;">
                                                <a href="{{safeAppUrl}}" target="_blank" style="display:inline-block;padding:15px 32px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">
                                                    Fitness Pro'ya Git
                                                </a>
                                            </td>
                                        </tr>
                                    </table>

                                </td>
                            </tr>

                            <!-- Closing -->
                            <tr>
                                <td align="center" style="padding:0 32px 32px;">

                                    <p style="margin:0 0 10px;font-size:13px;line-height:21px;color:#64748b;">
                                        Unutmayın, büyük başarılar küçük ama istikrarlı adımlarla başlar.
                                    </p>

                                    <p style="margin:0;font-size:13px;line-height:20px;color:#334155;">
                                        Sağlıklı ve güçlü günler dileriz.
                                        <br />
                                        <strong style="color:#16a34a;">Fitness Pro Ekibi</strong>
                                    </p>

                                </td>
                            </tr>

                        </table>

                        <!-- Footer -->
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:500px;">
                            <tr>
                                <td align="center" style="padding:24px 16px 0;">

                                    <p style="margin:0 0 8px;font-size:12px;line-height:18px;color:#94a3b8;">
                                        Bu e-posta, Fitness Pro hesabınız oluşturulduğu için gönderilmiştir.
                                    </p>

                                    <p style="margin:0;font-size:11px;line-height:18px;color:#94a3b8;">
                                        Bu e-posta Fitness Pro sistemi tarafından otomatik olarak gönderilmiştir.
                                        <br />
                                        &copy; 2026 Fitness Pro. Tüm hakları saklıdır.
                                    </p>

                                </td>
                            </tr>
                        </table>

                    </td>
                </tr>
            </table>

        </body>
        </html>
        """;
    }
}
