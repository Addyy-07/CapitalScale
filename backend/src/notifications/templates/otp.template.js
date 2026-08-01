/**
 * OTP Email Template
 * Priority: HIGHEST — sent for MFA on every login/register.
 */
export const otpTemplate = ({ code, expiresInMinutes = 5, recipientName = '' }) => ({
  subject: `${code} is your CapitalScale verification code`,
  html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Verification Code</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1d4ed8 0%,#4f46e5 100%);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">
                🏦 CapitalScale
              </h1>
              <p style="margin:8px 0 0;color:#bfdbfe;font-size:13px;">AI-Powered SME Loan Platform</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 16px;color:#94a3b8;font-size:14px;">
                ${recipientName ? `Hello <strong style="color:#e2e8f0;">${recipientName}</strong>,` : 'Hello,'}
              </p>
              <p style="margin:0 0 28px;color:#cbd5e1;font-size:15px;line-height:1.6;">
                Use the code below to complete your sign-in. This code is valid for
                <strong style="color:#60a5fa;">${expiresInMinutes} minutes</strong> and can only be used once.
              </p>

              <!-- OTP Code Box -->
              <div style="background:#0f172a;border:2px solid #3b82f6;border-radius:12px;padding:24px;text-align:center;margin:0 0 28px;">
                <span style="font-size:42px;font-weight:800;letter-spacing:12px;color:#60a5fa;font-family:monospace;">
                  ${code}
                </span>
              </div>

              <p style="margin:0 0 8px;color:#64748b;font-size:13px;">
                ⚠️ Never share this code with anyone. CapitalScale will never ask for your OTP.
              </p>
              <p style="margin:0;color:#64748b;font-size:13px;">
                If you didn't request this code, please ignore this email or contact support immediately.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid #334155;padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#475569;font-size:12px;">
                © ${new Date().getFullYear()} CapitalScale • AI Loan Underwriting Platform<br/>
                This is an automated message — please do not reply.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim(),
});
