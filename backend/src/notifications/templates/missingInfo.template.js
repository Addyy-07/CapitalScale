/**
 * Missing Information Request — sent to SME asking for more documents
 */
export const missingInfoTemplate = ({ smeName, appId, bankName, missingDocs = [] }) => ({
  subject: `⚠️ ACTION REQUIRED: Missing Information for Loan Application ${appId}`,
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
          <td style="background:linear-gradient(135deg,#78350f 0%,#d97706 100%);padding:32px 40px;text-align:center;">
            <div style="font-size:36px;margin-bottom:12px;">📂</div>
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Action Required</h1>
            <p style="margin:8px 0 0;color:#fde68a;font-size:13px;">Additional Information Needed</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 20px;color:#cbd5e1;font-size:15px;line-height:1.6;">
              Dear <strong style="color:#e2e8f0;">${smeName}</strong>,
            </p>
            <p style="margin:0 0 20px;color:#cbd5e1;font-size:15px;line-height:1.6;">
              The underwriting team at <strong style="color:#fbbf24;">${bankName}</strong> requires
              additional information for your loan application
              <strong style="color:#e2e8f0;">${appId}</strong>.
            </p>
            <p style="margin:0 0 20px;color:#cbd5e1;font-size:14px;line-height:1.6;">
              Please log in to your SME Dashboard and upload or verify the following outstanding items:
            </p>

            <!-- Missing Items List -->
            <div style="background:#0f172a;border-radius:12px;padding:20px 24px;margin:0 0 28px;border:1px solid #3b2800;">
              ${missingDocs.length > 0
                ? missingDocs.map(doc => `
                  <div style="display:flex;align-items:center;padding:8px 0;border-bottom:1px solid #1e293b;">
                    <span style="color:#fbbf24;margin-right:10px;font-size:16px;">▸</span>
                    <span style="color:#e2e8f0;font-size:14px;font-weight:500;">
                      ${doc.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </div>`).join('')
                : '<p style="color:#94a3b8;font-size:14px;margin:0;">Please log in for detailed requirements.</p>'
              }
            </div>

            <!-- CTA -->
            <div style="text-align:center;margin:0 0 24px;">
              <p style="margin:0;color:#fbbf24;font-weight:600;font-size:14px;">
                ⏰ Please respond promptly to avoid delays in processing your application.
              </p>
            </div>

            <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">
              If you have any questions, please contact your relationship manager or visit your SME Dashboard.
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
