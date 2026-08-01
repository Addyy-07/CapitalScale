import { v4 as uuidv4 } from 'uuid';
import supabase from '../../db/supabaseClient.js';
import logger from '../../utils/logger.js';
import { publishSSEEvent } from '../sse/sseManager.js';

// ── In-app notification type labels ───────────────────────────────────────
const STATUS_META = {
  submitted:         { title: 'Application Submitted',      icon: '📋' },
  eligibility_check: { title: 'Eligibility Check Started',  icon: '🔍' },
  agent_review:      { title: 'Under Agent Review',         icon: '👁️' },
  missing_info:      { title: 'Action Required',            icon: '⚠️' },
  approved:          { title: 'Loan Approved! 🎉',          icon: '✅' },
  rejected:          { title: 'Application Rejected',       icon: '❌' },
  disbursed:         { title: 'Loan Disbursed',             icon: '💰' },
};

const STATUS_MESSAGES = {
  submitted:         (appId, bank) => `Your loan application ${appId} for ${bank} has been submitted for review.`,
  eligibility_check: (appId, bank) => `Application ${appId} is now undergoing eligibility checks at ${bank}.`,
  agent_review:      (appId, bank) => `Application ${appId} is under active review by ${bank}'s underwriting team.`,
  missing_info:      (appId, bank) => `${bank} has requested additional information for your application ${appId}. Please review and provide the required documents.`,
  approved:          (appId, bank) => `Congratulations! Your loan application ${appId} has been approved by ${bank}.`,
  rejected:          (appId, bank) => `Your loan application ${appId} with ${bank} was not approved at this time.`,
  disbursed:         (appId, bank) => `Loan for application ${appId} has been disbursed by ${bank}. Congratulations!`,
};

/**
 * Persist a notification for an SME and push it via SSE.
 *
 * @param {object} opts
 * @param {string} opts.userId    - SME user ID
 * @param {string} opts.userType  - 'sme' or 'bank_admin'
 * @param {string} opts.type      - event type string
 * @param {string} opts.loanId
 * @param {string} opts.appId
 * @param {string} opts.bankName
 * @param {string} opts.toStatus
 * @param {object} opts.metadata  - Additional data
 */
export const createAndDeliverInAppNotification = async ({
  userId,
  userType = 'sme',
  type,
  loanId,
  appId,
  bankName,
  toStatus,
  metadata = {},
}) => {
  const meta = STATUS_META[toStatus] || { title: 'Loan Update', icon: '📢' };
  const messageFn = STATUS_MESSAGES[toStatus];
  const message = messageFn ? messageFn(appId, bankName) : `Your loan ${appId} status updated.`;

  try {
    // Persist to DB
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        id: uuidv4(),
        user_id: userId,
        user_type: userType,
        type,
        title: meta.title,
        message,
        loan_id: loanId || null,
        is_read: false,
        metadata: { appId, bankName, toStatus, icon: meta.icon, ...metadata },
      })
      .select()
      .single();

    if (error) {
      logger.error(`[InAppNotification] DB insert failed: ${error.message}`);
      return null;
    }

    logger.info(`[InAppNotification] Persisted notification ${notification.id} for user ${userId}`);

    // Push real-time via SSE (non-blocking)
    publishSSEEvent(userId, {
      type: 'notification',
      data: notification,
    }).catch((err) => logger.warn(`[InAppNotification] SSE publish failed: ${err.message}`));

    return notification;
  } catch (err) {
    logger.error(`[InAppNotification] Unexpected error: ${err.message}`);
    return null;
  }
};

/**
 * Create a notification for bank admin (e.g. when SME resubmits missing docs).
 */
export const createAdminInAppNotification = async ({
  userId,
  appId,
  smeName,
  businessName,
  loanId,
}) => {
  try {
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        id: uuidv4(),
        user_id: userId,
        user_type: 'bank_admin',
        type: 'loan.missing_info.completed',
        title: 'Missing Documents Submitted',
        message: `${businessName || smeName || 'The applicant'} has uploaded all requested documents for application ${appId}.`,
        loan_id: loanId || null,
        is_read: false,
        metadata: { appId, smeName, businessName, icon: '📤' },
      })
      .select()
      .single();

    if (error) {
      logger.error(`[InAppNotification] Admin DB insert failed: ${error.message}`);
      return null;
    }

    publishSSEEvent(userId, { type: 'notification', data: notification })
      .catch((err) => logger.warn(`[InAppNotification] Admin SSE push failed: ${err.message}`));

    return notification;
  } catch (err) {
    logger.error(`[InAppNotification] Admin notification error: ${err.message}`);
    return null;
  }
};
