/**
 * Loan Approved Email Template (sent to SME)
 */
export const loanApprovedTemplate = ({ smeName, appId, bankName, loanAmount, tenure }) => ({
  subject: `🎉 Congratulations! Your Loan Application ${appId} has been Approved`,
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
          <td style="background:linear-gradient(135deg,#065f46 0%,#059669 100%);padding:32px 40px;text-align:center;">
            <div style="width:64px;height:64px;background:rgba(255,255,255,0.15);border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;font-size:28px;line-height:64px;">✅</div>
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Application Approved!</h1>
            <p style="margin:8px 0 0;color:#a7f3d0;font-size:13px;">CapitalScale AI Loan Platform</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 20px;color:#cbd5e1;font-size:15px;line-height:1.6;">
              Dear <strong style="color:#e2e8f0;">${smeName}</strong>,
            </p>
            <p style="margin:0 0 28px;color:#cbd5e1;font-size:15px;line-height:1.6;">
              We are delighted to inform you that your loan application has been
              <strong style="color:#34d399;">approved</strong> by the underwriting team.
            </p>

            <!-- Details Card -->
            <div style="background:#0f172a;border-radius:12px;padding:24px;margin:0 0 28px;border:1px solid #1e3a2e;">
              <h3 style="margin:0 0 16px;color:#34d399;font-size:14px;text-transform:uppercase;letter-spacing:1px;">Application Summary</h3>
              <table width="100%" cellpadding="6" cellspacing="0">
                <tr><td style="color:#94a3b8;font-size:13px;width:40%;">Application ID</td>
                    <td style="color:#e2e8f0;font-size:13px;font-weight:600;">${appId}</td></tr>
                <tr><td style="color:#94a3b8;font-size:13px;">Lender</td>
                    <td style="color:#e2e8f0;font-size:13px;font-weight:600;">${bankName}</td></tr>
                ${loanAmount ? `<tr><td style="color:#94a3b8;font-size:13px;">Loan Amount</td>
                    <td style="color:#e2e8f0;font-size:13px;font-weight:600;">₹${Number(loanAmount).toLocaleString('en-IN')}</td></tr>` : ''}
                ${tenure ? `<tr><td style="color:#94a3b8;font-size:13px;">Tenure</td>
                    <td style="color:#e2e8f0;font-size:13px;font-weight:600;">${tenure} months</td></tr>` : ''}
                <tr><td style="color:#94a3b8;font-size:13px;">Status</td>
                    <td><span style="background:#065f46;color:#34d399;padding:2px 10px;border-radius:100px;font-size:12px;font-weight:600;">APPROVED</span></td></tr>
              </table>
            </div>

            <p style="margin:0 0 8px;color:#94a3b8;font-size:13px;line-height:1.6;">
              The bank's representative will contact you shortly regarding disbursement details.
              Please log in to your <strong style="color:#60a5fa;">SME Dashboard</strong> to track the latest status.
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
