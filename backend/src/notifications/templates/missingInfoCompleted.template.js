/**
 * Missing Info Completed — sent to bank admin when SME uploads all requested docs
 */
export const missingInfoCompletedTemplate = ({ adminName, appId, smeName, businessName }) => ({
  subject: `📋 NOTIFICATION: Missing Documents Submitted — Loan ${appId}`,
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
          <td style="background:linear-gradient(135deg,#1e40af 0%,#3b82f6 100%);padding:32px 40px;text-align:center;">
            <div style="font-size:36px;margin-bottom:12px;">📤</div>
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Documents Submitted</h1>
            <p style="margin:8px 0 0;color:#bfdbfe;font-size:13px;">Underwriter Action Required</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 20px;color:#cbd5e1;font-size:15px;line-height:1.6;">
              Dear <strong style="color:#e2e8f0;">${adminName || 'Underwriting Team'}</strong>,
            </p>
            <p style="margin:0 0 28px;color:#cbd5e1;font-size:15px;line-height:1.6;">
              The applicant for loan <strong style="color:#60a5fa;">${appId}</strong> has uploaded
              all previously requested missing documents. The AI extraction pipeline has rerun
              automatically and updated parameters are now available in your evaluation queue.
            </p>

            <!-- Details -->
            <div style="background:#0f172a;border-radius:12px;padding:24px;margin:0 0 28px;border:1px solid #1e3254;">
              <table width="100%" cellpadding="6" cellspacing="0">
                <tr><td style="color:#94a3b8;font-size:13px;width:40%;">Application ID</td>
                    <td style="color:#e2e8f0;font-size:13px;font-weight:600;">${appId}</td></tr>
                <tr><td style="color:#94a3b8;font-size:13px;">Applicant</td>
                    <td style="color:#e2e8f0;font-size:13px;font-weight:600;">${smeName || 'SME Applicant'}</td></tr>
                ${businessName ? `<tr><td style="color:#94a3b8;font-size:13px;">Business</td>
                    <td style="color:#e2e8f0;font-size:13px;font-weight:600;">${businessName}</td></tr>` : ''}
                <tr><td style="color:#94a3b8;font-size:13px;">Next Action</td>
                    <td style="color:#34d399;font-size:13px;font-weight:600;">Review Updated Application</td></tr>
              </table>
            </div>

            <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">
              Please review the updated loan application in your Bank Admin Dashboard and proceed
              with the next evaluation step.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="border-top:1px solid #334155;padding:20px 40px;text-align:center;">
            <p style="margin:0;color:#475569;font-size:12px;">
              © ${new Date().getFullYear()} CapitalScale • Underwriter Portal Notification
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
