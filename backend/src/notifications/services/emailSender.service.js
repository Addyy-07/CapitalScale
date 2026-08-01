import nodemailer from 'nodemailer';
import env from '../../config/env.js';
import logger from '../../utils/logger.js';

// ── Transporter singleton ──────────────────────────────────────────────────
let _transporter = null;

const _isSmtpConfigured = () => !!(env.SMTP_USER && env.SMTP_PASS);

const _getTransporter = () => {
  if (_transporter) return _transporter;

  if (!_isSmtpConfigured()) {
    logger.warn('[EmailSender] SMTP_USER or SMTP_PASS not set — running in SIMULATED mode');
    return null;
  }

  _transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
    // Connection pool for high throughput
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
  });

  logger.info(`[EmailSender] Nodemailer transporter created (${env.SMTP_HOST}:${env.SMTP_PORT})`);
  return _transporter;
};

// ── Exponential backoff delay ──────────────────────────────────────────────
const _backoffDelay = (retryCount) =>
  new Promise((r) => setTimeout(r, Math.pow(2, retryCount) * 1000));

// ── Core send function with retry logic ────────────────────────────────────
/**
 * Send an email with exponential backoff retry.
 *
 * @param {object} options
 * @param {string} options.to
 * @param {string} options.subject
 * @param {string} options.html
 * @param {string} options.correlationId
 * @param {number} options.retryCount - Current attempt (0-based)
 * @param {number} options.maxRetries
 * @returns {Promise<{ success: boolean, messageId?: string }>}
 */
export const sendEmail = async ({ to, subject, html, correlationId, retryCount = 0, maxRetries = 10 }) => {
  const transporter = _getTransporter();

  // Simulated mode — no SMTP configured
  if (!transporter) {
    logger.info(`[EmailSender] SIMULATED → to:${to} | subject:${subject} | correlationId:${correlationId}`);
    logger.info(`[EmailSender] HTML snippet: ${html.replace(/<[^>]*>/g, '').slice(0, 150)}...`);
    return { success: true, messageId: `sim_${Date.now()}_${correlationId}` };
  }

  try {
    const info = await transporter.sendMail({
      from: env.EMAIL_FROM,
      to,
      subject,
      html,
      headers: {
        'X-Correlation-Id': correlationId,
        'X-Mailer': 'CapitalScale-NotificationWorker/1.0',
      },
    });

    logger.info(`[EmailSender] Sent → to:${to} | messageId:${info.messageId} | correlationId:${correlationId}`);
    return { success: true, messageId: info.messageId };

  } catch (err) {
    logger.error(`[EmailSender] Attempt ${retryCount + 1}/${maxRetries + 1} failed | to:${to} | error:${err.message} | correlationId:${correlationId}`);

    if (retryCount < maxRetries) {
      await _backoffDelay(retryCount + 1);
      return sendEmail({ to, subject, html, correlationId, retryCount: retryCount + 1, maxRetries });
    }

    // All retries exhausted
    logger.error(`[EmailSender] All ${maxRetries + 1} attempts exhausted for ${to} | correlationId:${correlationId}`);
    throw new Error(`Email delivery failed after ${maxRetries + 1} attempts: ${err.message}`);
  }
};

/**
 * Verify SMTP transporter connectivity (call on startup).
 */
export const verifySmtpConnection = async () => {
  const transporter = _getTransporter();
  if (!transporter) return false; // simulated mode — always ok
  try {
    await transporter.verify();
    logger.info('✅ SMTP connection verified');
    return true;
  } catch (err) {
    logger.warn(`⚠️  SMTP verify failed: ${err.message} — emails will use simulated mode`);
    _transporter = null; // reset so we retry simulated
    return false;
  }
};
