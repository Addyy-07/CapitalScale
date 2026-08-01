/**
 * Loan Rejected Email Template (sent to SME)
 */
export const loanRejectedTemplate = ({ smeName, appId, bankName, notes }) => ({
  subject: `Update on Your Loan Application ${appId} — Decision Made`,
  html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background-color:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#7f1d1d 0%,#b91c1c 100%);padding:32px 40px;text-align:center;">
            <div style="font-size:36px;margin-bottom:12px;">📋</div>
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Application Status Update</h1>
            <p style="margin:8px 0 0;color:#fca5a5;font-size:13px;">CapitalScale AI Loan Platform</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 20px;color:#cbd5e1;font-size:15px;line-height:1.6;">
              Dear <strong style="color:#e2e8f0;">${smeName}</strong>,
            </p>
            <p style="margin:0 0 28px;color:#cbd5e1;font-size:15px;line-height:1.6;">
              After careful review, we regret to inform you that your loan application
              <strong style="color:#e2e8f0;">${appId}</strong> with
              <strong style="color:#e2e8f0;">${bankName}</strong> has not been approved at this time.
            </p>

            <!-- Details Card -->
            <div style="background:#0f172a;border-radius:12px;padding:24px;margin:0 0 28px;border:1px solid #3b1f1f;">
              <h3 style="margin:0 0 16px;color:#f87171;font-size:14px;text-transform:uppercase;letter-spacing:1px;">Application Details</h3>
              <table width="100%" cellpadding="6" cellspacing="0">
                <tr><td style="color:#94a3b8;font-size:13px;width:40%;">Application ID</td>
                    <td style="color:#e2e8f0;font-size:13px;font-weight:600;">${appId}</td></tr>
                <tr><td style="color:#94a3b8;font-size:13px;">Lender</td>
                    <td style="color:#e2e8f0;font-size:13px;font-weight:600;">${bankName}</td></tr>
                <tr><td style="color:#94a3b8;font-size:13px;">Status</td>
                    <td><span style="background:#7f1d1d;color:#f87171;padding:2px 10px;border-radius:100px;font-size:12px;font-weight:600;">REJECTED</span></td></tr>
                ${notes ? `<tr><td style="color:#94a3b8;font-size:13px;vertical-align:top;">Reason</td>
                    <td style="color:#e2e8f0;font-size:13px;">${notes}</td></tr>` : ''}
              </table>
            </div>

            <p style="margin:0 0 16px;color:#94a3b8;font-size:13px;line-height:1.6;">
              This decision may have been based on various factors including credit profile, documentation,
              or lending criteria. You may apply again in the future with improved financials or through a different lender.
            </p>
            <p style="margin:0;color:#64748b;font-size:13px;">
              For guidance, please contact your CapitalScale relationship manager.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="border-top:1px solid #334155;padding:20px 40px;text-align:center;">
            <p style="margin:0;color:#475569;font-size:12px;">
              © ${new Date().getFullYear()} CapitalScale • This is an automated message — please do not reply.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
  `.trim(),
});
